import { ConfidenceScorerService } from "../../../src/services/confidenceScorer.service";
import { ExtractedFieldResult } from "../../../src/services/extractionEngine.interface";
describe("ConfidenceScorerService", () => {
  let service: ConfidenceScorerService;
  beforeEach(() => {
    service = new ConfidenceScorerService();
  });
  const makeField = (
    overrides: Partial<ExtractedFieldResult> = {},
  ): ExtractedFieldResult => ({
    field_type: "legal_basis",
    extracted_value: "consentimento",
    confidence_score: 80,
    source_evidence:
      "Seção 4.2 da política de privacidade declara explicitamente a base legal",
    ...overrides,
  });
  describe("calibrateScore", () => {
    it("não deve ajustar campo de alta confiança com boa evidência", () => {
      const score = (service as any).calibrateScore(85, makeField());
      expect(score).toBe(85);
    });
    it("deve limitar campos ambíguos ao mediumConfidence", () => {
      const score = (service as any).calibrateScore(
        90,
        makeField({ is_ambiguous: true }),
      );
      expect(score).toBe(50);
    });
    it("deve penalizar campos com evidência insuficiente", () => {
      const score = (service as any).calibrateScore(
        80,
        makeField({ source_evidence: "curta" }),
      );
      expect(score).toBe(65);
    });
    it("deve penalizar campos com evidência vazia", () => {
      const score = (service as any).calibrateScore(
        80,
        makeField({ source_evidence: "" }),
      );
      expect(score).toBe(65);
    });
    it("deve limitar valores undefined a 10", () => {
      const score = (service as any).calibrateScore(
        80,
        makeField({ extracted_value: "undefined" }),
      );
      expect(score).toBe(10);
    });
    it("deve limitar valores not_declared a 10", () => {
      const score = (service as any).calibrateScore(
        80,
        makeField({ extracted_value: "not_declared" }),
      );
      expect(score).toBe(10);
    });
    it("deve limitar valores conflicting a 5", () => {
      const score = (service as any).calibrateScore(
        80,
        makeField({ extracted_value: "conflicting" }),
      );
      expect(score).toBe(5);
    });
    it("deve garantir score mínimo 0", () => {
      const score = (service as any).calibrateScore(
        10,
        makeField({ source_evidence: "curta", extracted_value: "conflicting" }),
      );
      expect(score).toBe(0);
    });
    it("deve garantir score máximo 100", () => {
      const score = (service as any).calibrateScore(150, makeField());
      expect(score).toBeLessThanOrEqual(100);
    });
    it("deve arredondar o score final", () => {
      const score = (service as any).calibrateScore(
        84.7,
        makeField({ source_evidence: "curta" }),
      );
      expect(Number.isInteger(score)).toBe(true);
    });
    it("deve aplicar limite ambíguo antes da penalidade de evidência", () => {
      const score = (service as any).calibrateScore(
        80,
        makeField({ is_ambiguous: true, source_evidence: "curta" }),
      );
      expect(score).toBe(35);
    });
  });
  describe("calibrateFields", () => {
    it("deve calibrar todos os campos no array", () => {
      const fields = [
        makeField({ field_type: "legal_basis", confidence_score: 90 }),
        makeField({
          field_type: "retention_period",
          confidence_score: 60,
          source_evidence: "curta",
        }),
      ];
      const result = service.calibrateFields(fields);
      expect(result).toHaveLength(2);
      expect(result[0].confidence_score).toBe(90);
      expect(result[1].confidence_score).toBe(45);
    });
    it("deve adicionar metadados de calibração a cada campo", () => {
      const fields = [makeField({ confidence_score: 75 })];
      const result = service.calibrateFields(fields);
      expect(result[0].metadata).toEqual(
        expect.objectContaining({
          original_confidence: 75,
          calibrated: true,
          calibration_reason: "standard_calibration",
        }),
      );
    });
    it("deve preservar metadados existentes", () => {
      const fields = [
        makeField({
          confidence_score: 75,
          metadata: { chave_existente: "valor" },
        }),
      ];
      const result = service.calibrateFields(fields);
      expect(result[0].metadata).toEqual(
        expect.objectContaining({
          chave_existente: "valor",
          original_confidence: 75,
          calibrated: true,
        }),
      );
    });
  });
  describe("getCalibrationReason", () => {
    it("deve retornar low_evidence_ambiguous para campos ambíguos", () => {
      const reason = service.getCalibrationReason(
        makeField({ is_ambiguous: true }),
      );
      expect(reason).toBe("low_evidence_ambiguous");
    });
    it("deve retornar insufficient_evidence para evidência curta", () => {
      const reason = service.getCalibrationReason(
        makeField({ source_evidence: "curta" }),
      );
      expect(reason).toBe("insufficient_evidence");
    });
    it("deve retornar value_not_declared para undefined", () => {
      const reason = service.getCalibrationReason(
        makeField({ extracted_value: "undefined" }),
      );
      expect(reason).toBe("value_not_declared");
    });
    it("deve retornar value_not_declared para not_declared", () => {
      const reason = service.getCalibrationReason(
        makeField({ extracted_value: "not_declared" }),
      );
      expect(reason).toBe("value_not_declared");
    });
    it("deve retornar conflicting_values para conflicting", () => {
      const reason = service.getCalibrationReason(
        makeField({ extracted_value: "conflicting" }),
      );
      expect(reason).toBe("conflicting_values");
    });
    it("deve retornar standard_calibration para campos normais", () => {
      const reason = service.getCalibrationReason(makeField());
      expect(reason).toBe("standard_calibration");
    });
    it("deve priorizar ambíguo sobre evidência insuficiente", () => {
      const reason = service.getCalibrationReason(
        makeField({ is_ambiguous: true, source_evidence: "curta" }),
      );
      expect(reason).toBe("low_evidence_ambiguous");
    });
    it("deve priorizar evidência insuficiente sobre valor undefined", () => {
      const reason = service.getCalibrationReason(
        makeField({ source_evidence: "curta", extracted_value: "undefined" }),
      );
      expect(reason).toBe("insufficient_evidence");
    });
  });
  describe("shouldFlag", () => {
    it("deve sinalizar scores abaixo do threshold", () => {
      expect(service.shouldFlag(49)).toBe(true);
      expect(service.shouldFlag(0)).toBe(true);
    });
    it("não deve sinalizar scores no threshold ou acima", () => {
      expect(service.shouldFlag(50)).toBe(false);
      expect(service.shouldFlag(100)).toBe(false);
    });
  });
  describe("getConfidenceLevel", () => {
    it("deve retornar high para scores >= 80", () => {
      expect(service.getConfidenceLevel(80)).toBe("high");
      expect(service.getConfidenceLevel(100)).toBe("high");
    });
    it("deve retornar medium para scores >= 50 e < 80", () => {
      expect(service.getConfidenceLevel(50)).toBe("medium");
      expect(service.getConfidenceLevel(79)).toBe("medium");
    });
    it("deve retornar low para scores < 50", () => {
      expect(service.getConfidenceLevel(0)).toBe("low");
      expect(service.getConfidenceLevel(49)).toBe("low");
    });
  });
  describe("configuração customizada", () => {
    it("deve usar threshold customizado para sinalização", () => {
      const customService = new ConfidenceScorerService({ threshold: 70 });
      expect(customService.shouldFlag(69)).toBe(true);
      expect(customService.shouldFlag(70)).toBe(false);
    });
    it("deve usar limites de confiança customizados", () => {
      const customService = new ConfidenceScorerService({
        highConfidence: 90,
        mediumConfidence: 60,
      });
      expect(customService.getConfidenceLevel(85)).toBe("medium");
      expect(customService.getConfidenceLevel(90)).toBe("high");
      expect(customService.getConfidenceLevel(59)).toBe("low");
    });
  });
});
