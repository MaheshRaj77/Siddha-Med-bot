import { NextRequest, NextResponse } from "next/server";
import { ingestionQueue, processIngestionPayload } from "@/lib/server/queue";
import { prisma } from "@/lib/server/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, enforceSameOrigin, internalServerError, parseJson } from "@/lib/server/security";
import { sha256 } from "@/lib/rag/text";

const MAX_SHEET_SIZE = 10 * 1024 * 1024;
const sheetSchema = z.object({
  url: z.string().url().max(2048),
}).strict();

function appendFileNameSuffix(fileName: string, suffix: number) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return `${fileName}-${suffix}`;
  return `${fileName.slice(0, dotIndex)}-${suffix}${fileName.slice(dotIndex)}`;
}

async function resolveUniqueFileName(fileName: string, documentHash: string) {
  let candidate = fileName;
  for (let suffix = 2; suffix < 1000; suffix++) {
    const [existing, activeJob] = await Promise.all([
      prisma.documentMetadata.findUnique({
        where: { fileName: candidate },
        select: { documentHash: true },
      }),
      prisma.ingestionJob.findFirst({
        where: {
          fileName: candidate,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        select: { id: true },
      }),
    ]);

    if (!activeJob && (!existing || existing.documentHash === documentHash)) {
      return candidate;
    }

    candidate = appendFileNameSuffix(fileName, suffix);
  }

  throw new Error("Unable to create a unique resource name for this sheet");
}

function getGoogleSheetGid(url: string) {
  const parsedUrl = new URL(url);
  const queryGid = parsedUrl.searchParams.get("gid");
  if (queryGid && /^\d+$/.test(queryGid)) return queryGid;

  const hashMatch = parsedUrl.hash.match(/(?:^|[&#])gid=(\d+)/);
  return hashMatch?.[1] || null;
}

function buildGoogleSheetCsvUrls(sheetId: string, gid: string | null) {
  const gidParam = gid ? `&gid=${gid}` : "";
  return [
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`,
  ];
}

async function readLimitedBody(response: Response, maxBytes: number) {
  if (!response.body) throw new Error("Google Sheet response body is missing");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("SHEET_TOO_LARGE");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, total);
}

export async function POST(req: NextRequest) {
  let jobRecordId: string | null = null;
  try {
    // ── AUTHENTICATION & ROLE PROTECTION ──
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Authentication required to sync spreadsheets." }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Only Doctors (Admin) and Super Admins can sync datasets." }, { status: 403 });
    }

    if (!dbUser.isActive) {
      return NextResponse.json({ error: "Your account is deactivated." }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", dbUser.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, sheetSchema, 4 * 1024);
    if (parsed.response) return parsed.response;
    const { url } = parsed.data;

    // Validate Google Sheet URL format before creating job
    const match = url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      await prisma.ingestionJob.create({
        data: {
          fileName: url.slice(0, 80) || "Google Sheet Link",
          fileType: "text/csv",
          status: "FAILED",
          error: "Invalid Google Sheets URL. Must be a docs.google.com link."
        }
      });
      return NextResponse.json({ error: "Invalid Google Sheets URL. Must be a docs.google.com link." }, { status: 400 });
    }
    
    const sheetId = match[1];
    const gid = getGoogleSheetGid(url);
    const baseFileName = `GoogleSheet_${sheetId}${gid ? `_gid_${gid}` : ""}.csv`;

    // Create job record in DB as PENDING first
    const jobRecord = await prisma.ingestionJob.create({
      data: {
        fileName: baseFileName,
        fileType: "text/csv",
        status: "PENDING",
      }
    });
    jobRecordId = jobRecord.id;

    const markJobFailed = async (message: string, status: number) => {
      await prisma.ingestionJob.update({
        where: { id: jobRecord.id },
        data: { status: "FAILED", error: message }
      });
      return NextResponse.json({ error: message }, { status });
    };

    let response: Response | null = null;

    for (const exportUrl of buildGoogleSheetCsvUrls(sheetId, gid)) {
      try {
        const candidate = await fetch(exportUrl, {
          signal: AbortSignal.timeout(45_000),
          cache: "no-store",
          redirect: "follow",
        });
        if (candidate.ok) {
          response = candidate;
          break;
        }
      } catch (error) {
        console.warn(`Google Sheet CSV export failed for ${exportUrl}:`, error);
      }
    }

    if (!response) {
      return await markJobFailed("Failed to download Google Sheet as CSV. Make sure the sheet is public or shared with anyone who has the link.", 400);
    }

    const contentLength = Number(response.headers.get("content-length") || "0");
    if (!Number.isFinite(contentLength) || contentLength > MAX_SHEET_SIZE) {
      return await markJobFailed("Google Sheet is too large.", 413);
    }

    let sheetBuffer: Buffer;
    try {
      sheetBuffer = await readLimitedBody(response, MAX_SHEET_SIZE);
    } catch (error) {
      if (error instanceof Error && error.message === "SHEET_TOO_LARGE") {
        return await markJobFailed("Google Sheet is too large.", 413);
      }
      throw error;
    }
    const preview = sheetBuffer.subarray(0, 512).toString("utf8").trimStart();
    if (!preview || preview.startsWith("<!DOCTYPE html") || preview.startsWith("<html")) {
      return await markJobFailed("Google returned a web page instead of CSV. Share the sheet as public/anyone-with-link, then try again.", 400);
    }
    const documentHash = sha256(sheetBuffer);
    const fileName = await resolveUniqueFileName(baseFileName, documentHash);
    const fileBase64 = sheetBuffer.toString("base64");
    const fileType = "text/csv";
    
    // Update job record with unique fileName
    await prisma.ingestionJob.update({
      where: { id: jobRecord.id },
      data: { fileName }
    });

    const payload = {
      fileBase64,
      fileName,
      fileType,
      jobId: jobRecord.id
    };

    if (process.env.ENABLE_WORKER === "true") {
      await ingestionQueue.add('ingest-document', payload, { removeOnComplete: true, removeOnFail: true });
    } else {
      void processIngestionPayload(payload).catch((error) => {
        console.error(`Background sheet ingestion failed for ${jobRecord.id}:`, error);
      });
    }
    auditSecurityEvent("admin.sheet.ingest", dbUser.id, { sheetId, gid, fileName, size: sheetBuffer.byteLength });

    return NextResponse.json({
      success: true,
      jobId: jobRecord.id,
      message: process.env.ENABLE_WORKER === "true"
        ? "Google Sheet queued for processing."
        : "Google Sheet is being processed.",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "An internal error occurred while processing the Google Sheet.";
    if (jobRecordId) {
      await prisma.ingestionJob.update({
        where: { id: jobRecordId },
        data: { status: "FAILED", error: errMsg }
      });
    }
    return internalServerError("ingest.sheet", error, errMsg);
  }
}
