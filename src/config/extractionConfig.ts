export const extractionConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4",
    organizationId: process.env.OPENAI_ORG_ID ?? undefined,
    maxTokens: 2000,
    temperature: 0.1,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? "",
    model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
    temperature: 0.1,
    maxTokens: 2000,
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    model: process.env.OLLAMA_MODEL ?? "phi",
    temperature: 0.1,
    maxTokens: 2000,
  },
  extraction: {
    timeoutMs: parseInt(process.env.EXTRACTION_TIMEOUT_MS ?? "30000", 10),
    maxParallelJobs: parseInt(
      process.env.EXTRACTION_MAX_PARALLEL_JOBS ?? "5",
      10,
    ),
    defaultModelVersion: "1.0.0",
  },
  confidence: {
    flagThreshold: 50,
    highConfidence: 80,
    mediumConfidence: 50,
    lowConfidence: 20,
  },
};
