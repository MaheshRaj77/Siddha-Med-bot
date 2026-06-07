import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandMedicalQuery, performRRF } from "./retrieval";
import type { RagDocument } from "./rag/types";

function doc(id: string, score: number): RagDocument {
  return {
    pageContent: `content ${id}`,
    metadata: {
      chunk_hash: id,
      score,
      source_file: `${id}.pdf`,
      chunk_index: 0,
    },
  };
}

describe("expandMedicalQuery", () => {
  it("expands Siddha synonym terms", () => {
    const result = expandMedicalQuery("Uses of tulasi for cold");

    assert.ok(result.synonymsUsed.includes("tulasi"));
    assert.ok(result.expandedQuery.includes("ocimum sanctum"));
    assert.ok(result.expandedQuery.includes("respiratory"));
  });
});

describe("performRRF", () => {
  it("fuses vector and lexical rankings without duplicating chunks", () => {
    const shared = doc("shared", 0.8);
    const vectorOnly = doc("vector", 0.7);
    const lexicalOnly = doc("lexical", 0.6);

    const { fusedDocs, diagnostics } = performRRF(
      [shared, vectorOnly],
      [lexicalOnly, shared]
    );

    assert.equal(fusedDocs.length, 3);
    assert.equal(fusedDocs[0].metadata.chunk_hash, "shared");
    assert.deepEqual(
      pickRanks(diagnostics.get("shared")),
      { vectorRank: 1, lexicalRank: 2 }
    );
    assert.deepEqual(
      pickRanks(diagnostics.get("vector")),
      { vectorRank: 2, lexicalRank: -1 }
    );
    assert.deepEqual(
      pickRanks(diagnostics.get("lexical")),
      { vectorRank: -1, lexicalRank: 1 }
    );
  });
});

function pickRanks(value: { vectorRank: number; lexicalRank: number } | undefined) {
  assert.ok(value);
  return {
    vectorRank: value.vectorRank,
    lexicalRank: value.lexicalRank,
  };
}
