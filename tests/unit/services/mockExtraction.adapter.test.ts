import {
  MockExtractionAdapter,
  isOpenAiAvailable,
} from "../../../src/services/mockExtraction.adapter";
jest.mock("../../../src/config/extractionConfig", () => ({
  extractionConfig: {
    openai: { apiKey: "" },
    groq: { apiKey: "", model: "llama-3.1-8b-instant" },
    extraction: { timeoutMs: 30000, maxParallelJobs: 5 },
  },
}));
describe("MockExtractionAdapter", () => {
  let adapter: MockExtractionAdapter;
  beforeEach(() => {
    adapter = new MockExtractionAdapter();
  });
  describe("getEngineName", () => {
    it("should return mock engine name", () => {
      expect(adapter.getEngineName()).toBe("mock-adapter");
    });
  });
  describe("getEngineVersion", () => {
    it("should return version string", () => {
      expect(adapter.getEngineVersion()).toBe("1.0.0-dev");
    });
  });
  describe("extract", () => {
    it("should extract fields from PDF privacy policy", async () => {
      const content = `Política de PrivacidadeColetamos: nome, email, telefone, endereço IP e dados de localização.Base legal: consentimento.Mantemos dados por 2 anos após o último login.Processamos para prestação de serviços, análises e marketing.`;
      const result = await adapter.extract(content, "privacy.pdf", "PDF");
      expect(result.extracted_fields).toBeInstanceOf(Array);
      expect(result.extracted_fields.length).toBeGreaterThan(0);
      expect(result.overall_confidence).toBeGreaterThan(0);
    });
    it("should extract fields from TXT data processing agreement", async () => {
      const content = `Acordo de Processamento de DadosCompartilhamento com processadores de pagamento e parceiros.Direitos: acesso, retificação, exclusão.Armazenamento: AWS S3 com criptografia AES-256.`;
      const result = await adapter.extract(content, "agreement.txt", "TXT");
      const types = result.extracted_fields.map((f) => f.field_type);
      expect(types).toContain("third_party_sharing");
      expect(types).toContain("data_subject_rights");
    });
    it("should return processing notes", async () => {
      const result = await adapter.extract("test", "file.txt", "TXT");
      expect(result.processing_notes).toBeTruthy();
    });
    it("should handle empty content", async () => {
      const result = await adapter.extract("", "empty.txt", "TXT");
      expect(result.extracted_fields).toBeInstanceOf(Array);
    });
  });
  describe("isOpenAiAvailable", () => {
    it("should return false when no API key", () => {
      expect(isOpenAiAvailable()).toBe(false);
    });
  });
});
