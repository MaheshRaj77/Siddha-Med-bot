import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChromaClient } from "chromadb";

export const COLLECTION_NAME = "medical_rag";

export const getEmbeddings = () => {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: "gemini-embedding-2",
  });
};

export const getChromaClient = () => {
  return new ChromaClient({
    host: "api.trychroma.com",
    port: 443,
    ssl: true,
    tenant: process.env.CHROMA_TENANT,
    database: process.env.CHROMA_DATABASE,
    headers: {
      "x-chroma-token": process.env.CHROMA_API_KEY!,
    },
  });
};

export const getVectorStore = async () => {
  const client = getChromaClient();
  return new Chroma(getEmbeddings(), {
    collectionName: COLLECTION_NAME,
    url: "https://api.trychroma.com:443",
    index: client as never,
  });
};

export async function deleteVectorChunksForFile(fileName: string) {
  try {
    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: null as never,
    });
    await collection.delete({ where: { source_file: fileName } });
  } catch (error) {
    console.warn(`Unable to clear previous vector chunks for ${fileName}:`, error);
  }
}
