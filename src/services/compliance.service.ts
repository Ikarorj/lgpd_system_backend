import { complianceRepository } from "../repositories/compliance.repository";
import { extractionRepository } from "../repositories/extraction.repository";
import { artifactRepository } from "../repositories/artifact.repository";
import {
  ComplianceViolation,
  CreateComplianceViolationInput,
} from "../models/compliance-violation.model";
import {
  ComplianceReport,
  CreateComplianceReportInput,
} from "../models/compliance-report.model";
import { ExtractedField } from "../models/extracted-field.model";
import { logger } from "../utils/loggerUtil";
import { NotFoundError } from "../utils/errorHandlerUtil";
import {
  ViolationType,
  ViolationSeverity,
  ViolationCategory,
  ComplianceStatus,
  RemediationStatus,
} from "../../shared/types/apiContracts.types";
const CONFIDENCE_MINIMUM = 20;
interface ViolationRule {
  violation_type: ViolationType;
  severity: ViolationSeverity;
  article: string;
  category: ViolationCategory;
  condition: (fields: Record<string, ExtractedField[]>) => {
    detected: boolean;
    value?: string;
  };
  remediation: string;
}
export class ComplianceService {
  private rules: ViolationRule[] = [
    {
      violation_type: "missing_legal_basis",
      severity: "CRITICAL",
      article: "Art. 7",
      category: "omission",
      condition: (fields) => {
        const legalBasis = fields["legal_basis"]?.[0];
        if (!legalBasis) return { detected: true, value: "não declarado" };
        const val = legalBasis.extracted_value?.toLowerCase() || "";
        const missing = [
          "nao_declarado",
          "não declarado",
          "not declared",
          "",
          "indefinido",
        ];
        if (missing.some((m) => val.includes(m))) {
          return { detected: true, value: val };
        }
        return { detected: false };
      },
      remediation:
        "Adicionar base legal explícita (consentimento, interesse legítimo, obrigação legal, execução de contrato ou proteção de crédito) conforme Art. 7, § 1-5",
    },
    {
      violation_type: "missing_retention_period",
      severity: "HIGH",
      article: "Art. 15",
      category: "omission",
      condition: (fields) => {
        const retention = fields["retention_period"]?.[0];
        if (!retention) return { detected: true, value: "não declarado" };
        const val = retention.extracted_value?.toLowerCase() || "";
        const missing = [
          "indefinido",
          "indefinite",
          "nao_especificado",
          "não especificado",
          "undefined",
          "",
          "permanente",
          "eterno",
        ];
        if (missing.some((m) => val.includes(m))) {
          return { detected: true, value: val };
        }
        return { detected: false };
      },
      remediation:
        "Definir prazo de retenção específico compatível com a finalidade do tratamento, conforme Art. 15 da LGPD",
    },
    {
      violation_type: "missing_data_subject_rights",
      severity: "HIGH",
      article: "Art. 18/19/20/21",
      category: "omission",
      condition: (fields) => {
        const rights = fields["data_subject_rights"]?.[0];
        if (!rights) return { detected: true, value: "não declarado" };
        const val = rights.extracted_value?.toLowerCase() || "";
        if (
          !val ||
          val === "[]" ||
          val === "" ||
          val === "nao_especificado" ||
          val === "não especificado" ||
          val === "nenhum"
        ) {
          return { detected: true, value: val };
        }
        return { detected: false };
      },
      remediation:
        "Incluir direitos do titular: confirmação, acesso, correção, portabilidade, exclusão, informação e revogação do consentimento (Art. 17-22)",
    },
    {
      violation_type: "insufficient_security",
      severity: "HIGH",
      article: "Art. 46",
      category: "omission",
      condition: (fields) => {
        const encryption = fields["encryption_status"]?.[0];
        const storage = fields["storage_method"]?.[0];
        const encVal = encryption?.extracted_value?.toLowerCase() || "";
        const stgVal = storage?.extracted_value?.toLowerCase() || "";
        const insecureEnc = [
          "nenhuma",
          "none",
          "nao_especificado",
          "não especificado",
        ];
        const insecureStg = [
          "nao_especificado",
          "não especificado",
          "plaintext",
          "texto aberto",
        ];
        if (
          insecureEnc.some((v) => encVal.includes(v)) ||
          insecureStg.some((v) => stgVal.includes(v))
        ) {
          return {
            detected: true,
            value: `criptografia: ${encVal || "não declarado"}, armazenamento: ${stgVal || "não declarado"}`,
          };
        }
        return { detected: false };
      },
      remediation:
        "Implementar medidas de segurança técnicas e administrativas: criptografia AES-256 em repouso, TLS 1.3 em trânsito (Art. 46, § 1)",
    },
    {
      violation_type: "unsafe_third_party_sharing",
      severity: "HIGH",
      article: "Art. 48",
      category: "explicit",
      condition: (fields) => {
        const sharing = fields["third_party_sharing"]?.[0];
        if (!sharing) return { detected: false };
        const val = sharing.extracted_value?.toLowerCase() || "";
        const unsafe = [
          "sem contrato",
          "sem proteção",
          "sem acordo",
          "sem segurança",
          "without contract",
          "unprotected",
        ];
        if (unsafe.some((u) => val.includes(u))) {
          return { detected: true, value: val };
        }
        return { detected: false };
      },
      remediation:
        "Estabelecer contrato escrito com terceiros sobre tratamento de dados e garantir medidas de segurança adequadas (Art. 48)",
    },
    {
      violation_type: "sensitive_data_without_consent",
      severity: "CRITICAL",
      article: "Art. 11",
      category: "explicit",
      condition: (fields) => {
        const categories = fields["data_categories"]?.[0];
        const legalBasis = fields["legal_basis"]?.[0];
        if (!categories) return { detected: false };
        const catVal = categories.extracted_value?.toLowerCase() || "";
        const sensitive = [
          "dados_saude",
          "dados_biometricos",
          "dados_geneticos",
          "orientacao_sexual",
          "religiao",
        ];
        const hasSensitive = sensitive.some((s) => catVal.includes(s));
        if (!hasSensitive) return { detected: false };
        const basisVal = legalBasis?.extracted_value?.toLowerCase() || "";
        const validBases = ["consentimento_expresso", "consentimento expresso"];
        if (!validBases.some((b) => basisVal.includes(b))) {
          return {
            detected: true,
            value: `categorias sensíveis detectadas: ${catVal}, base legal: ${basisVal || "não declarado"}`,
          };
        }
        return { detected: false };
      },
      remediation:
        "Obter consentimento específico e destacado para tratamento de dados sensíveis (Art. 11, § 1)",
    },
    {
      violation_type: "missing_processing_purpose",
      severity: "HIGH",
      article: "Art. 6",
      category: "omission",
      condition: (fields) => {
        const purpose = fields["processing_purpose"]?.[0];
        if (!purpose) return { detected: true, value: "não declarado" };
        const val = purpose.extracted_value?.toLowerCase() || "";
        const vague = [
          "indefinido",
          "indefinite",
          "não especificado",
          "nao_especificado",
          "diversos",
          "varios",
          "geral",
          "gerais",
          "",
        ];
        if (vague.some((v) => val.includes(v))) {
          return { detected: true, value: val };
        }
        return { detected: false };
      },
      remediation:
        "Definir finalidade específica do tratamento conforme princípios do Art. 6 (finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação, accountability)",
    },
    {
      violation_type: "invalid_consent",
      severity: "CRITICAL",
      article: "Art. 8",
      category: "explicit",
      condition: (fields) => {
        const legalBasis = fields["legal_basis"]?.[0];
        if (!legalBasis) return { detected: false };
        const val = legalBasis.extracted_value?.toLowerCase() || "";
        if (val.includes("consentimento")) {
          const rights = fields["data_subject_rights"]?.[0];
          const rightsVal = rights?.extracted_value?.toLowerCase() || "";
          if (!rightsVal.includes("revoga") && !rightsVal.includes("cancel")) {
            return {
              detected: true,
              value: "consentimento declarado sem direito de revogação",
            };
          }
        }
        return { detected: false };
      },
      remediation:
        "Incluir direito de revogação do consentimento (Art. 8, § 5) e garantir consentimento específico por finalidade (Art. 8, § 4)",
    },
    {
      violation_type: "invalid_legitimate_interest",
      severity: "HIGH",
      article: "Art. 10",
      category: "explicit",
      condition: (fields) => {
        const legalBasis = fields["legal_basis"]?.[0];
        if (!legalBasis) return { detected: false };
        const val = legalBasis.extracted_value?.toLowerCase() || "";
        if (
          val.includes("interesse legitimo") ||
          val.includes("legítimo interesse")
        ) {
          const purpose = fields["processing_purpose"]?.[0];
          const purposeVal = purpose?.extracted_value?.toLowerCase() || "";
          if (
            !purpose ||
            purposeVal.includes("indefinido") ||
            purposeVal === "" ||
            purposeVal === "nao_especificado"
          ) {
            return {
              detected: true,
              value: "legítimo interesse declarado sem finalidade específica",
            };
          }
        }
        return { detected: false };
      },
      remediation:
        "Realizar e documentar teste de balanceamento (legitimate interest assessment) para uso do legítimo interesse como base legal (Art. 10, § 2)",
    },
    {
      violation_type: "missing_deletion_mechanism",
      severity: "HIGH",
      article: "Art. 16",
      category: "omission",
      condition: (fields) => {
        const retention = fields["retention_period"]?.[0];
        if (!retention) return { detected: true, value: "não declarado" };
        const val = retention.extracted_value?.toLowerCase() || "";
        const permanent = [
          "indefinido",
          "indefinite",
          "permanente",
          "eterno",
          "eternamente",
          "para sempre",
        ];
        if (permanent.some((d) => val.includes(d))) {
          return { detected: true, value: val };
        }
        return { detected: false };
      },
      remediation:
        "Implementar procedimento de eliminação dos dados pessoais após o término do tratamento (Art. 16)",
    },
    {
      violation_type: "missing_dpo_contact",
      severity: "HIGH",
      article: "Art. 37/38",
      category: "omission",
      condition: (_fields) => {
        const allValues = Object.values(_fields)
          .flat()
          .map((f) => f.extracted_value?.toLowerCase() || "")
          .join(" ");
        const hasDPO =
          allValues.includes("dpo") ||
          allValues.includes("encarregado") ||
          allValues.includes("controlador") ||
          allValues.includes("data protection officer");
        if (!hasDPO) {
          return { detected: true, value: "nenhuma menção ao DPO/encarregado" };
        }
        return { detected: false };
      },
      remediation:
        "Designar e identificar o encarregado (DPO) com informações de contato públicas (Art. 37 e Art. 38)",
    },
    {
      violation_type: "missing_governance_program",
      severity: "MEDIUM",
      article: "Art. 41",
      category: "omission",
      condition: (_fields) => {
        const allValues = Object.values(_fields)
          .flat()
          .map((f) => f.extracted_value?.toLowerCase() || "")
          .join(" ");
        const hasGovernance =
          allValues.includes("governanca") ||
          allValues.includes("governança") ||
          allValues.includes("boas práticas") ||
          allValues.includes("boas praticas") ||
          allValues.includes("compliance");
        if (!hasGovernance) {
          return {
            detected: true,
            value: "nenhuma menção a programa de governança",
          };
        }
        return { detected: false };
      },
      remediation:
        "Implementar programa de boas práticas e governança com regras de segurança, padrões técnicos e educação continuada (Art. 41)",
    },
    {
      violation_type: "missing_impact_report",
      severity: "MEDIUM",
      article: "Art. 42",
      category: "omission",
      condition: (_fields) => {
        const allValues = Object.values(_fields)
          .flat()
          .map((f) => f.extracted_value?.toLowerCase() || "")
          .join(" ");
        const hasRIPD =
          allValues.includes("ripd") ||
          allValues.includes("relatório de impacto") ||
          allValues.includes("relatorio de impacto") ||
          allValues.includes("privacy impact") ||
          allValues.includes("pia");
        if (!hasRIPD) {
          return {
            detected: true,
            value: "nenhuma menção a RIPD/relatório de impacto",
          };
        }
        return { detected: false };
      },
      remediation:
        "Elaborar Relatório de Impacto à Proteção de Dados (RIPD) contendo descrição dos dados, finalidade, riscos e medidas mitigatórias (Art. 42)",
    },
    {
      violation_type: "missing_incident_communication",
      severity: "HIGH",
      article: "Art. 45",
      category: "omission",
      condition: (fields) => {
        const security = fields["encryption_status"]?.[0];
        const storage = fields["storage_method"]?.[0];
        const securityVal = security?.extracted_value?.toLowerCase() || "";
        const storageVal = storage?.extracted_value?.toLowerCase() || "";
        const combined = `${securityVal} ${storageVal}`;
        const hasIncidentResponse =
          combined.includes("incidente") ||
          combined.includes("incident") ||
          combined.includes("notifica") ||
          combined.includes("comunica") ||
          combined.includes("breach") ||
          combined.includes("viola");
        if (
          !hasIncidentResponse &&
          securityVal !== "" &&
          storageVal !== "" &&
          !["nenhuma", "none", "nao_especificado", "não especificado"].some(
            (v) => securityVal.includes(v),
          )
        ) {
          return {
            detected: true,
            value:
              "medidas de segurança declaradas sem plano de comunicação de incidentes",
          };
        }
        return { detected: false };
      },
      remediation:
        "Estabelecer plano de comunicação de incidentes de segurança com notificação à ANPD e aos titulares afetados (Art. 45)",
    },
    {
      violation_type: "missing_privacy_by_design",
      severity: "MEDIUM",
      article: "Art. 47",
      category: "omission",
      condition: (_fields) => {
        const allValues = Object.values(_fields)
          .flat()
          .map((f) => f.extracted_value?.toLowerCase() || "")
          .join(" ");
        const hasPbD =
          allValues.includes("privacy by design") ||
          allValues.includes("privacidade desde") ||
          allValues.includes("proteção desde") ||
          allValues.includes("protecao desde") ||
          allValues.includes("by default") ||
          allValues.includes("privacy by default");
        if (!hasPbD) {
          return {
            detected: true,
            value: "nenhuma menção a privacy by design/default",
          };
        }
        return { detected: false };
      },
      remediation:
        "Adotar medidas de proteção de dados desde a concepção (privacy by design) e por padrão (privacy by default) em conformidade com o Art. 47",
    },
    {
      violation_type: "unsafe_international_transfer",
      severity: "HIGH",
      article: "Art. 49",
      category: "explicit",
      condition: (fields) => {
        const sharing = fields["third_party_sharing"]?.[0];
        if (!sharing) return { detected: false };
        const val = sharing.extracted_value?.toLowerCase() || "";
        const transferKeywords = [
          "internacional",
          "international",
          "transferência",
          "transferencia",
          "exterior",
          "estrangeiro",
          "cross-border",
          "fora do pais",
          "fora do país",
        ];
        const hasTransfer = transferKeywords.some((t) => val.includes(t));
        if (!hasTransfer) return { detected: false };
        const safeTransfer = [
          "clausulas contratuais padrao",
          "standard contractual clauses",
          "scc",
          "adequacao",
          "adequacy",
          "binding corporate rules",
          "bcr",
          "regras corporativas",
        ];
        const hasSafeguard = safeTransfer.some((s) => val.includes(s));
        if (!hasSafeguard) {
          return { detected: true, value: val };
        }
        return { detected: false };
      },
      remediation:
        "Implementar salvaguardas adequadas para transferência internacional: cláusulas contratuais padrão (SCC), regras corporativas globais (BCR) ou decisão de adequação (Art. 49)",
    },
  ];
  async runComplianceCheck(
    extractionId: string,
  ): Promise<{ report: ComplianceReport; violations: ComplianceViolation[] }> {
    const result = await extractionRepository.findResultById(extractionId);
    if (!result) {
      throw new NotFoundError("Extraction result", extractionId);
    }
    const fields =
      await extractionRepository.findFieldsByResultId(extractionId);
    const lowConfidenceFields = fields.filter(
      (f) => f.confidence_score < CONFIDENCE_MINIMUM,
    );
    if (fields.length === 0 || lowConfidenceFields.length === fields.length) {
      const reportInput: CreateComplianceReportInput = {
        extraction_result_id: extractionId,
        compliance_score: 0,
        compliance_status: "INSUFFICIENT_DATA",
        total_violations: 0,
        violations_by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
        articles_checked: [],
      };
      const report = await complianceRepository.createReport(reportInput);
      return { report, violations: [] };
    }
    const fieldsByType: Record<string, ExtractedField[]> = {};
    for (const field of fields) {
      if (!fieldsByType[field.field_type]) {
        fieldsByType[field.field_type] = [];
      }
      fieldsByType[field.field_type].push(field);
    }
    const violationInputs: CreateComplianceViolationInput[] = [];
    const articlesChecked = new Set<string>();
    for (const rule of this.rules) {
      const { detected, value } = rule.condition(fieldsByType);
      if (detected) {
        violationInputs.push({
          extraction_result_id: extractionId,
          violation_type: rule.violation_type,
          lgpd_article: rule.article,
          severity: rule.severity,
          violation_category: rule.category,
          extracted_value: value,
          remediation_guidance: rule.remediation,
        });
      }
      articlesChecked.add(rule.article);
    }
    await complianceRepository.deleteViolationsByResultId(extractionId);
    const violations =
      violationInputs.length > 0
        ? await complianceRepository.createViolations(violationInputs)
        : [];
    const bySeverity: Record<string, number> = {
      CRITICAL: violations.filter((v) => v.severity === "CRITICAL").length,
      HIGH: violations.filter((v) => v.severity === "HIGH").length,
      MEDIUM: violations.filter((v) => v.severity === "MEDIUM").length,
      LOW: violations.filter((v) => v.severity === "LOW").length,
    };
    const score = this.calculateScore(bySeverity);
    const status = this.determineStatus(score, bySeverity);
    const previousReport =
      await complianceRepository.findPreviousReportByResultId(extractionId);
    const reportInput: CreateComplianceReportInput = {
      extraction_result_id: extractionId,
      compliance_score: score,
      compliance_status: status,
      total_violations: violations.length,
      violations_by_severity: bySeverity,
      articles_checked: Array.from(articlesChecked).sort(),
      previous_report_id: previousReport?.id ?? undefined,
    };
    const report = await complianceRepository.createReport(reportInput);
    await artifactRepository.update(result.artifact_id, {
      status: "completed",
    });
    logger.info(
      { extractionId, score, status, violationCount: violations.length },
      "Compliance check completed",
    );
    return { report, violations };
  }
  async getComplianceReport(
    extractionId: string,
  ): Promise<{ report: ComplianceReport; violations: ComplianceViolation[] }> {
    const report =
      await complianceRepository.findReportByResultId(extractionId);
    if (!report) {
      throw new NotFoundError("Compliance report for extraction", extractionId);
    }
    const violations =
      await complianceRepository.findViolationsByResultId(extractionId);
    return { report, violations };
  }
  async updateViolationStatus(
    violationId: string,
    status: RemediationStatus,
    notes: string | undefined,
    userId: string,
  ): Promise<ComplianceViolation> {
    const violation = await complianceRepository.findViolationById(violationId);
    if (!violation) {
      throw new NotFoundError("Compliance violation", violationId);
    }
    const updated = await complianceRepository.updateViolation(violationId, {
      remediation_status: status,
      remediation_notes:
        notes !== undefined
          ? notes
          : (violation.remediation_notes ?? undefined),
      reviewed_by: userId,
      reviewed_at: new Date(),
    });
    if (!updated) {
      throw new NotFoundError("Compliance violation", violationId);
    }
    logger.info({ violationId, status, userId }, "Violation status updated");
    return updated;
  }
  private calculateScore(bySeverity: Record<string, number>): number {
    const score =
      100 -
      (bySeverity["CRITICAL"] || 0) * 30 -
      (bySeverity["HIGH"] || 0) * 15 -
      (bySeverity["MEDIUM"] || 0) * 5 -
      (bySeverity["LOW"] || 0) * 2;
    return Math.max(0, Math.min(100, score));
  }
  private determineStatus(
    score: number,
    bySeverity: Record<string, number>,
  ): ComplianceStatus {
    if (bySeverity["CRITICAL"] > 0) return "NON_COMPLIANT";
    if (score === 100) return "COMPLIANT";
    if (score >= 70) return "PARTIALLY_COMPLIANT";
    return "NON_COMPLIANT";
  }
}
export const complianceService = new ComplianceService();
