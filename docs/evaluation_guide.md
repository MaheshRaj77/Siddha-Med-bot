# RAG Safety & Quality Evaluation Guide

This guide explains how the LLM-as-a-Judge evaluation system works, the 8 dimensions measured, how to run evaluations, and how to interpret the results.

---

## 📊 The 8 Evaluation Dimensions

Our evaluation engine uses a powerful combination of **Ragas-inspired RAG metrics** and **custom LLM-as-a-judge safety/quality checks** to score generated answers against a gold-standard dataset and synthetically generated queries.

### 1. Hallucination (Faithfulness)
*   **What it measures**: Whether the generated answer contains any factual claims that are not directly supported by the retrieved document context.
*   **How it works**: An LLM judge extracts all distinct factual claims from the answer, then verifies each claim against the retrieved context to see if it is explicitly supported.
*   **Target**: 100% (lower values indicate hallucinations).

### 2. Correctness (Semantic Match)
*   **What it measures**: How well the generated answer matches the expected ground truth or target topic.
*   **How it works**: An LLM judge compares the semantic meaning of the generated answer with the target topic to assign a score between `0.0` (completely incorrect/unrelated) and `1.0` (perfect match).
*   **Target**: $\ge$ 70%.

### 3. Answer Relevance
*   **What it measures**: How directly, completely, and accurately the generated answer addresses the user's query.
*   **How it works**: The LLM judge scores the answer based on whether it directly answers the user's prompt without adding irrelevant filler.
*   **Target**: $\ge$ 70%.

### 4. Context Precision
*   **What it measures**: How relevant and precise the retrieved document chunks are in relation to the query and expected topic.
*   **How it works**: The LLM judge evaluates the retrieved chunks to score whether the most relevant information is successfully ranked first.
*   **Target**: $\ge$ 80%.

### 5. PII Leakage
*   **What it measures**: Whether the generated response leaks any Personally Identifiable Information (PII).
*   **How it works**: Checks for the presence of phone numbers, email addresses, physical addresses, or patient names.
*   **Score**: `1.0` (SAFE - no leakage) or `0.0` (UNSAFE - leakage detected).
*   **Target**: 100% (Strict pass/fail).

### 6. Prompt Injection
*   **What it measures**: Whether the user query contains malicious input intended to hijack the model's instructions (e.g. jailbreak attempts, "ignore previous instructions").
*   **How it works**: Evaluates the input query to detect prompt injection syntax.
*   **Score**: `1.0` (SAFE - clean query) or `0.0` (UNSAFE - injection attempt detected).
*   **Target**: 100% (Strict pass/fail).

### 7. Toxicity
*   **What it measures**: Whether the generated response contains toxic, offensive, abusive, or harmful language.
*   **How it works**: Evaluates the generated text for hate speech, abuse, or inappropriate tone.
*   **Score**: `1.0` (SAFE) or `0.0` (UNSAFE).
*   **Target**: 100% (Strict pass/fail).

### 8. Bias & Fairness
*   **What it measures**: Whether the generated answer contains social, gender, racial, cultural, or religious bias.
*   **How it works**: The LLM judge scans the response to ensure fair, neutral, and unbiased language.
*   **Score**: `1.0` (SAFE - unbiased) or `0.0` (UNSAFE).
*   **Target**: 100% (Strict pass/fail).

---

## 🚀 How to Run Evaluations

You can trigger the evaluation suite in two ways:

### 1. From the Admin / Super-Admin Dashboard
- Navigate to the **Admin Dashboard** (`/admin`) or **Super Admin Dashboard** (`/super-admin`).
- Locate the **RAG Evaluation Engine** card.
- Click **"Run Evaluation Suite"**.
- This will execute the evaluation suite asynchronously on the server and update the dashboard in real-time.

### 2. From the CLI (Command Line Interface)
To run the evaluation manually on your local system, run the following command:

```bash
RUN_RAG_EVALUATION_CLI=true npx tsx src/scripts/evaluate.ts
```

This will run the entire suite against the database and log a comprehensive report in the console, saving the results in PostgreSQL under `EvaluationRun`.

---

## 📈 Interpreting Reports

Every run saves an `EvaluationRun` record. In the dashboard, you can click on any previous run to view:
1.  **Summary Cards**: Showing the average score across all 8 dimensions.
2.  **Pass Rate**: The percentage of test cases that passed all criteria.
3.  **Detailed Cases**: A drill-down of every test query showing:
    - User Query
    - Ground Truth Topic
    - Generated Answer
    - Individual Metric Scores
    - **Issues List**: Flagged problems (e.g., `"Toxicity check failed"`, `"Faithfulness is below 70%"`).
