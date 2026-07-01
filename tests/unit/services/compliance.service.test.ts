import { ComplianceService } from "../../../src/services/compliance.service";
import { complianceRepository } from "../../../src/repositories/compliance.repository";
import { extractionRepository } from "../../../src/repositories/extraction.repository";
import { artifactRepository } from "../../../src/repositories/artifact.repository";
import { FieldType } from "../../../shared/types/apiContracts.types";
jest.mock("../../../src/repositories/compliance.repository");
jest.mock("../../../src/repositories/extraction.repository");
jest.mock("../../../src/repositories/artifact.repository");
const mockedExtractionRepo = jest.mocked(extractionRepository);
const mockedComplianceRepo = jest.mocked(complianceRepository);
const mockedArtifactRepo = jest.mocked(artifactRepository);
const makeField = (
  overrides: Partial<{
    field_type: FieldType;
    extracted_value: string;
    confidence_score: number;
    source_evidence: string;
  }> = {},
) => ({
  id: "campo-1",
  result_id: "resultado-1",
  field_type: overrides.field_type ?? ("legal_basis" as FieldType),
  extracted_value: overrides.extracted_value ?? "consentimento",
  confidence_score: overrides.confidence_score ?? 80,
  confidence_calibrated: false,
  source_evidence: overrides.source_evidence ?? "Seção 4.2",
  source_line_number: null,
  is_flagged: false,
  flag_reason: null,
  requires_human_review: false,
  human_override_by: null,
  human_override_timestamp: null,
  human_override_value: null,
  human_override_rationale: null,
  metadata: null,
  created_at: new Date(),
  updated_at: new Date(),
});
const makeExtractionResult = (
  overrides: Partial<{ id: string; artifact_id: string }> = {},
) => ({
  id: overrides.id ?? "resultado-1",
  artifact_id: overrides.artifact_id ?? "artefato-1",
  extraction_timestamp: new Date(),
  extraction_version: "1.0.0",
  extracted_by: "mock",
  overall_confidence: 0,
  flagged_count: 0,
  human_override_count: 0,
  completion_status: "processing" as const,
  extraction_started_at: new Date(),
  extraction_completed_at: null,
  extraction_duration_ms: null,
  processing_notes: null,
  created_at: new Date(),
  updated_at: new Date(),
});
describe("ComplianceService", () => {
  let service: ComplianceService;
  beforeEach(() => {
    service = new ComplianceService();
    jest.resetAllMocks();
  });
  describe("calculateScore", () => {
    it("deve retornar 100 quando não há violações", () => {
      const score = (service as any).calculateScore({
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(score).toBe(100);
    });
    it("deve deduzir 30 por violação CRITICAL", () => {
      const score = (service as any).calculateScore({
        CRITICAL: 1,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(score).toBe(70);
    });
    it("deve deduzir 15 por violação HIGH", () => {
      const score = (service as any).calculateScore({
        CRITICAL: 0,
        HIGH: 2,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(score).toBe(70);
    });
    it("deve deduzir 5 por violação MEDIUM", () => {
      const score = (service as any).calculateScore({
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 3,
        LOW: 0,
      });
      expect(score).toBe(85);
    });
    it("deve deduzir 2 por violação LOW", () => {
      const score = (service as any).calculateScore({
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 5,
      });
      expect(score).toBe(90);
    });
    it("deve limitar o score mínimo em 0", () => {
      const score = (service as any).calculateScore({
        CRITICAL: 4,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(score).toBe(0);
    });
    it("deve limitar o score máximo em 100", () => {
      const score = (service as any).calculateScore({
        CRITICAL: -1,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(score).toBe(100);
    });
  });
  describe("determineStatus", () => {
    it("deve retornar COMPLIANT para score 100 sem critical", () => {
      const status = (service as any).determineStatus(100, {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(status).toBe("COMPLIANT");
    });
    it("deve retornar NON_COMPLIANT para qualquer violação CRITICAL", () => {
      const status = (service as any).determineStatus(70, {
        CRITICAL: 1,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(status).toBe("NON_COMPLIANT");
    });
    it("deve retornar PARTIALLY_COMPLIANT para score >= 70 sem critical", () => {
      const status = (service as any).determineStatus(85, {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(status).toBe("PARTIALLY_COMPLIANT");
    });
    it("deve retornar NON_COMPLIANT para score < 70 sem critical", () => {
      const status = (service as any).determineStatus(55, {
        CRITICAL: 0,
        HIGH: 3,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(status).toBe("NON_COMPLIANT");
    });
    it("deve retornar NON_COMPLIANT para score 0 sem critical", () => {
      const status = (service as any).determineStatus(0, {
        CRITICAL: 0,
        HIGH: 7,
        MEDIUM: 0,
        LOW: 0,
      });
      expect(status).toBe("NON_COMPLIANT");
    });
  });
  describe("runComplianceCheck", () => {
    beforeEach(() => {
      mockedComplianceRepo.createReport.mockImplementation(async (input) => ({
        id: "relatorio-1",
        extraction_result_id: input.extraction_result_id,
        compliance_score: input.compliance_score,
        compliance_status: input.compliance_status,
        total_violations: input.total_violations,
        violations_by_severity: input.violations_by_severity,
        articles_checked: input.articles_checked,
        previous_report_id: input.previous_report_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      mockedComplianceRepo.createViolations.mockResolvedValue([]);
      mockedComplianceRepo.deleteViolationsByResultId.mockResolvedValue();
      mockedComplianceRepo.findPreviousReportByResultId.mockResolvedValue(null);
      mockedArtifactRepo.update.mockResolvedValue(null as any);
    });
    it("deve lançar NotFoundError quando resultado de extração não existe", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(null);
      await expect(service.runComplianceCheck("inexistente")).rejects.toThrow(
        "Extraction result",
      );
    });
    it("deve retornar INSUFFICIENT_DATA quando não há campos", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(result.report.compliance_status).toBe("INSUFFICIENT_DATA");
      expect(result.report.compliance_score).toBe(0);
      expect(result.violations).toHaveLength(0);
    });
    it("deve retornar INSUFFICIENT_DATA quando todos os campos têm confiança baixa (<20)", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({ confidence_score: 10 }),
        makeField({ field_type: "retention_period", confidence_score: 15 }),
      ]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(result.report.compliance_status).toBe("INSUFFICIENT_DATA");
    });
    it("deve detectar missing_legal_basis quando campo legal_basis está ausente", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "processing_purpose",
          extracted_value: "marketing",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_legal_basis",
        ),
      ).toBe(true);
    });
    it("deve detectar missing_legal_basis quando valor indica não declarado", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "nao_declarado",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_legal_basis",
        ),
      ).toBe(true);
    });
    it("NÃO deve detectar missing_legal_basis quando base legal válida está declarada", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
      ]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_legal_basis",
        ),
      ).toBe(false);
    });
    it("deve detectar missing_retention_period quando campo retention_period está ausente", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_retention_period",
        ),
      ).toBe(true);
    });
    it("deve detectar missing_retention_period quando valor é permanente", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "retention_period",
          extracted_value: "permanente",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_retention_period",
        ),
      ).toBe(true);
    });
    it("NÃO deve detectar missing_retention_period quando período válido está definido", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "retention_period",
          extracted_value: "5 anos",
        }),
      ]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_retention_period",
        ),
      ).toBe(false);
    });
    it("deve detectar missing_data_subject_rights quando campo está ausente", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "retention_period",
          extracted_value: "5 anos",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_data_subject_rights",
        ),
      ).toBe(true);
    });
    it("deve detectar insufficient_security quando criptografia é nenhuma", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "retention_period",
          extracted_value: "5 anos",
        }),
        makeField({
          field_type: "encryption_status",
          extracted_value: "nenhuma",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "insufficient_security",
        ),
      ).toBe(true);
    });
    it("deve detectar unsafe_third_party_sharing quando compartilhamento não tem salvaguardas", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "retention_period",
          extracted_value: "5 anos",
        }),
        makeField({
          field_type: "third_party_sharing",
          extracted_value: "compartilhamento sem contrato",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "unsafe_third_party_sharing",
        ),
      ).toBe(true);
    });
    it("deve detectar sensitive_data_without_consent quando dados sensíveis não têm consentimento expresso", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "data_categories",
          extracted_value: "dados_saude, nome, email",
        }),
        makeField({
          field_type: "legal_basis",
          extracted_value: "interesse_legitimo",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "sensitive_data_without_consent",
        ),
      ).toBe(true);
    });
    it("NÃO deve detectar sensitive_data_without_consent quando não há categorias sensíveis", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "data_categories",
          extracted_value: "nome, email, endereco",
        }),
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
      ]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "sensitive_data_without_consent",
        ),
      ).toBe(false);
    });
    it("deve detectar missing_processing_purpose quando finalidade é vaga", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "processing_purpose",
          extracted_value: "diversos",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_processing_purpose",
        ),
      ).toBe(true);
    });
    it("deve detectar invalid_consent quando consentimento não tem direito de revogação", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "data_subject_rights",
          extracted_value: "direito_acesso, direito_exclusao",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some((v) => v.violation_type === "invalid_consent"),
      ).toBe(true);
    });
    it("NÃO deve detectar invalid_consent quando direito de revogação está incluído", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "data_subject_rights",
          extracted_value: "direito_acesso, direito_revogacao",
        }),
      ]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some((v) => v.violation_type === "invalid_consent"),
      ).toBe(false);
    });
    it("deve detectar invalid_legitimate_interest quando interesse legítimo não tem finalidade específica", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "interesse legitimo",
        }),
        makeField({
          field_type: "processing_purpose",
          extracted_value: "indefinido",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "invalid_legitimate_interest",
        ),
      ).toBe(true);
    });
    it("deve detectar missing_deletion_mechanism quando retenção é permanente", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "retention_period",
          extracted_value: "permanente",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_deletion_mechanism",
        ),
      ).toBe(true);
    });
    it("deve detectar missing_dpo_contact quando não há menção a DPO em nenhum campo", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "processing_purpose",
          extracted_value: "marketing",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_dpo_contact",
        ),
      ).toBe(true);
    });
    it("NÃO deve detectar missing_dpo_contact quando DPO é mencionado", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "processing_purpose",
          extracted_value: "tratamento sob supervisao do DPO",
        }),
      ]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_dpo_contact",
        ),
      ).toBe(false);
    });
    it("deve detectar missing_governance_program quando não há menção a governança", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "processing_purpose",
          extracted_value: "marketing",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_governance_program",
        ),
      ).toBe(true);
    });
    it("deve detectar missing_impact_report quando não há menção a RIPD", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_impact_report",
        ),
      ).toBe(true);
    });
    it("deve detectar missing_incident_communication quando medidas de segurança não têm plano de incidentes", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "encryption_status",
          extracted_value: "aes_256",
        }),
        makeField({
          field_type: "storage_method",
          extracted_value: "banco_dados_relacional",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_incident_communication",
        ),
      ).toBe(true);
    });
    it("NÃO deve detectar missing_incident_communication quando nenhuma medida de segurança está declarada", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
      ]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_incident_communication",
        ),
      ).toBe(false);
    });
    it("deve detectar missing_privacy_by_design quando não há menção a PbD", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "missing_privacy_by_design",
        ),
      ).toBe(true);
    });
    it("deve detectar unsafe_international_transfer quando transferência internacional não tem salvaguardas", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "third_party_sharing",
          extracted_value: "compartilhamento internacional com parceiro",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "unsafe_international_transfer",
        ),
      ).toBe(true);
    });
    it("NÃO deve detectar unsafe_international_transfer quando SCC é mencionado", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "third_party_sharing",
          extracted_value:
            "transferencia internacional com clausulas contratuais padrao",
        }),
      ]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(
        result.violations.some(
          (v) => v.violation_type === "unsafe_international_transfer",
        ),
      ).toBe(false);
    });
    it("deve retornar COMPLIANT quando todas as regras passam sem violações", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
        makeField({
          field_type: "retention_period",
          extracted_value: "5 anos",
        }),
        makeField({
          field_type: "data_subject_rights",
          extracted_value: "direito_acesso, direito_revogacao",
        }),
        makeField({
          field_type: "processing_purpose",
          extracted_value:
            "marketing direto supervisionado pelo DPO com programa de governanca RIPD e privacy by design",
        }),
        makeField({
          field_type: "encryption_status",
          extracted_value: "aes_256",
        }),
        makeField({
          field_type: "storage_method",
          extracted_value: "banco_dados_relacional com criptografia",
        }),
        makeField({
          field_type: "third_party_sharing",
          extracted_value: "nenhum compartilhamento",
        }),
        makeField({
          field_type: "data_categories",
          extracted_value: "nome, email",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockResolvedValue([]);
      const result = await service.runComplianceCheck("resultado-1");
      expect(result.report.compliance_status).toBe("COMPLIANT");
      expect(result.report.compliance_score).toBe(100);
      expect(result.violations).toHaveLength(0);
    });
    it("deve atualizar status do artefato para completed", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult({ artifact_id: "artefato-1" }),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "consentimento",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockResolvedValue([]);
      await service.runComplianceCheck("resultado-1");
      expect(mockedArtifactRepo.update).toHaveBeenCalledWith("artefato-1", {
        status: "completed",
      });
    });
    it("deve gerar score correto a partir de violações mistas", async () => {
      mockedExtractionRepo.findResultById.mockResolvedValue(
        makeExtractionResult(),
      );
      mockedExtractionRepo.findFieldsByResultId.mockResolvedValue([
        makeField({
          field_type: "legal_basis",
          extracted_value: "nao_declarado",
        }),
      ]);
      mockedComplianceRepo.createViolations.mockImplementation(async (inputs) =>
        inputs.map((i) => ({
          id: "v-" + i.violation_type,
          extraction_result_id: i.extraction_result_id,
          violation_type: i.violation_type,
          lgpd_article: i.lgpd_article,
          severity: i.severity as any,
          violation_category: i.violation_category as any,
          affected_field_type: i.affected_field_type ?? null,
          extracted_value: i.extracted_value ?? null,
          remediation_guidance: i.remediation_guidance,
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
      const result = await service.runComplianceCheck("resultado-1");
      const criticalCount = result.violations.filter(
        (v) => v.severity === "CRITICAL",
      ).length;
      const highCount = result.violations.filter(
        (v) => v.severity === "HIGH",
      ).length;
      const mediumCount = result.violations.filter(
        (v) => v.severity === "MEDIUM",
      ).length;
      const expectedScore = Math.max(
        0,
        100 - criticalCount * 30 - highCount * 15 - mediumCount * 5,
      );
      expect(result.report.compliance_score).toBe(expectedScore);
    });
  });
  describe("getComplianceReport", () => {
    it("deve retornar relatório e violações quando o relatório existe", async () => {
      const mockReport = {
        id: "relatorio-1",
        extraction_result_id: "resultado-1",
        compliance_score: 85,
        compliance_status: "PARTIALLY_COMPLIANT" as const,
        total_violations: 2,
        violations_by_severity: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0 },
        articles_checked: ["Art. 7", "Art. 6"],
        previous_report_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const mockViolations = [
        {
          id: "v-1",
          extraction_result_id: "resultado-1",
          violation_type: "missing_legal_basis" as const,
          lgpd_article: "Art. 7",
          severity: "CRITICAL" as const,
          violation_category: "omission" as const,
          affected_field_type: null,
          extracted_value: "não declarado",
          remediation_guidance: "Adicionar base legal",
          remediation_status: "active" as const,
          remediation_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockedComplianceRepo.findReportByResultId.mockResolvedValue(mockReport);
      mockedComplianceRepo.findViolationsByResultId.mockResolvedValue(
        mockViolations,
      );
      const result = await service.getComplianceReport("resultado-1");
      expect(result.report).toEqual(mockReport);
      expect(result.violations).toEqual(mockViolations);
    });
    it("deve lançar NotFoundError quando o relatório não existe", async () => {
      mockedComplianceRepo.findReportByResultId.mockResolvedValue(null);
      await expect(service.getComplianceReport("inexistente")).rejects.toThrow(
        "Compliance report for extraction",
      );
    });
  });
  describe("updateViolationStatus", () => {
    it("deve atualizar e retornar a violação", async () => {
      const existingViolation = {
        id: "v-1",
        extraction_result_id: "resultado-1",
        violation_type: "missing_legal_basis" as const,
        lgpd_article: "Art. 7",
        severity: "CRITICAL" as const,
        violation_category: "omission" as const,
        affected_field_type: null,
        extracted_value: "não declarado",
        remediation_guidance: "Adicionar base legal",
        remediation_status: "active" as const,
        remediation_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const updatedViolation = {
        ...existingViolation,
        remediation_status: "resolved" as const,
        remediation_notes: "Corrigido",
        reviewed_by: "user-1",
        reviewed_at: new Date(),
      };
      mockedComplianceRepo.findViolationById.mockResolvedValue(
        existingViolation,
      );
      mockedComplianceRepo.updateViolation.mockResolvedValue(updatedViolation);
      const result = await service.updateViolationStatus(
        "v-1",
        "resolved",
        "Corrigido",
        "user-1",
      );
      expect(result.remediation_status).toBe("resolved");
      expect(mockedComplianceRepo.updateViolation).toHaveBeenCalledWith(
        "v-1",
        expect.objectContaining({
          remediation_status: "resolved",
          remediation_notes: "Corrigido",
          reviewed_by: "user-1",
        }),
      );
    });
    it("deve lançar NotFoundError quando violação não encontrada", async () => {
      mockedComplianceRepo.findViolationById.mockResolvedValue(null);
      await expect(
        service.updateViolationStatus(
          "inexistente",
          "resolved",
          undefined,
          "user-1",
        ),
      ).rejects.toThrow("Compliance violation");
    });
    it("deve manter notas existentes quando nenhuma nova nota é fornecida", async () => {
      const existingViolation = {
        id: "v-1",
        extraction_result_id: "resultado-1",
        violation_type: "missing_legal_basis" as const,
        lgpd_article: "Art. 7",
        severity: "CRITICAL" as const,
        violation_category: "omission" as const,
        affected_field_type: null,
        extracted_value: "não declarado",
        remediation_guidance: "Adicionar base legal",
        remediation_status: "active" as const,
        remediation_notes: "Nota anterior",
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockedComplianceRepo.findViolationById.mockResolvedValue(
        existingViolation,
      );
      mockedComplianceRepo.updateViolation.mockResolvedValue(existingViolation);
      await service.updateViolationStatus(
        "v-1",
        "acknowledged",
        undefined,
        "user-1",
      );
      expect(mockedComplianceRepo.updateViolation).toHaveBeenCalledWith(
        "v-1",
        expect.objectContaining({ remediation_notes: "Nota anterior" }),
      );
    });
  });
});
