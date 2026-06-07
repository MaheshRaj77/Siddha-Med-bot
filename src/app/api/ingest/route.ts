import { NextRequest, NextResponse } from "next/server";
import { ingestionQueue, processIngestionPayload } from "@/lib/server/queue";
import { prisma } from "@/lib/server/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, enforceSameOrigin, internalServerError } from "@/lib/server/security";
import { sha256 } from "@/lib/rag/text";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 256 * 1024;
const CSV_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/octet-stream",
]);
const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function sanitizeFileName(fileName: string) {
  return fileName
    .split(/[\\/]/)
    .pop()!
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .slice(0, 120);
}

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

  throw new Error("Unable to create a unique resource name for this upload");
}

function isAllowedUpload(fileName: string, fileType: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".xls")) return false;
  return fileType === "application/pdf"
    || lowerName.endsWith(".pdf")
    || CSV_TYPES.has(fileType)
    || lowerName.endsWith(".csv")
    || XLSX_TYPES.has(fileType)
    || lowerName.endsWith(".xlsx");
}

function normalizeFileType(fileName: string, fileType: string) {
  const lowerName = fileName.toLowerCase();
  if (fileType === "application/pdf" || lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (XLSX_TYPES.has(fileType)) return fileType;
  if (CSV_TYPES.has(fileType) || lowerName.endsWith(".csv")) return "text/csv";
  return fileType;
}

function hasExpectedSignature(bytes: Uint8Array, fileName: string, fileType: string) {
  const normalizedType = normalizeFileType(fileName, fileType);
  if (normalizedType === "application/pdf") {
    return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  }
  if (normalizedType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return new TextDecoder().decode(bytes.slice(0, 2)) === "PK";
  }
  return !bytes.includes(0);
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
      return NextResponse.json({ error: "Authentication required to ingest documents." }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Only Doctors (Admin) and Super Admins can upload datasets." }, { status: 403 });
    }

    if (!dbUser.isActive) {
      return NextResponse.json({ error: "Your account is deactivated." }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", dbUser.id);
    if (rateLimitError) return rateLimitError;

    const contentType = req.headers.get("content-type") || "";
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart form data." }, { status: 415 });
    }
    if (!Number.isFinite(contentLength) || contentLength > MAX_FILE_SIZE + MAX_MULTIPART_OVERHEAD) {
      return NextResponse.json({ error: "Upload is too large." }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const sanitizedName = sanitizeFileName(file.name) || "Unknown File";
    
    // Create job in DB as PENDING first
    const jobRecord = await prisma.ingestionJob.create({
      data: {
        fileName: sanitizedName,
        fileType: file.type || "unknown",
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

    if (file.size > MAX_FILE_SIZE) {
      return await markJobFailed("File too large. Max 10MB.", 413);
    }
    if (!isAllowedUpload(file.name, file.type)) {
      return await markJobFailed("Only PDF, CSV, and XLSX files allowed. Please convert legacy XLS files to XLSX or CSV.", 415);
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (!hasExpectedSignature(bytes, file.name, file.type)) {
      return await markJobFailed("File contents do not match the declared type.", 415);
    }
    if (!sanitizedName) {
      return await markJobFailed("Invalid file name.", 400);
    }
    const documentHash = sha256(Buffer.from(bytes));
    const fileName = await resolveUniqueFileName(sanitizedName, documentHash);
    const fileType = normalizeFileType(fileName, file.type);
    const fileBase64 = Buffer.from(bytes).toString("base64");

    // Update job record with resolved values
    await prisma.ingestionJob.update({
      where: { id: jobRecord.id },
      data: {
        fileName,
        fileType,
      }
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
        console.error(`Background ingestion failed for ${jobRecord.id}:`, error);
      });
    }
    auditSecurityEvent("admin.document.ingest", dbUser.id, { fileName, size: file.size });

    return NextResponse.json({
      success: true,
      jobId: jobRecord.id,
      message: process.env.ENABLE_WORKER === "true"
        ? `File ${fileName} queued for processing.`
        : `File ${fileName} is being processed.`,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "An internal error occurred while processing the document.";
    if (jobRecordId) {
      await prisma.ingestionJob.update({
        where: { id: jobRecordId },
        data: { status: "FAILED", error: errMsg }
      });
    }
    return internalServerError("ingest.document", error, errMsg);
  }
}
