import { extractionConfig } from "../config/extractionConfig";
import { logger } from "../utils/loggerUtil";
import {
  ExtractionEngine,
  ExtractionOutput,
  ExtractedFieldResult,
} from "./extractionEngine.interface";
export function isOpenAiAvailable(): boolean {
  const key = extractionConfig.openai.apiKey;
  return !!key && !key.startsWith("sk-placeholder");
}
export class MockExtractionAdapter implements ExtractionEngine {
  async extract(
    content: string,
    _filename: string,
    _format: string,
  ): Promise<ExtractionOutput> {
    const startTime = Date.now();
    const lower = content.toLowerCase();
    const fields: ExtractedFieldResult[] = [];
    if (
      lower.includes("nome") ||
      lower.includes("email") ||
      lower.includes("cpf")
    ) {
      const categories: string[] = [];
      if (lower.includes("nome")) categories.push("nome");
      if (lower.includes("email")) categories.push("email");
      if (lower.includes("cpf")) categories.push("CPF");
      if (lower.includes("telefone")) categories.push("telefone");
      if (lower.includes("endereço") || lower.includes("endereco"))
        categories.push("endereço");
      if (lower.includes("ip")) categories.push("endereço IP");
      if (lower.includes("localização") || lower.includes("localizacao"))
        categories.push("localização");
      fields.push({
        field_type: "data_categories",
        extracted_value: categories.join(", "),
        confidence_score: 85,
        source_evidence: categories.map((c) => `menção a "${c}"`).join("; "),
      });
    }
    const bases: string[] = [];
    if (lower.includes("consentimento")) bases.push("consentimento");
    if (
      lower.includes("interesse legítimo") ||
      lower.includes("interesse legitimo")
    )
      bases.push("interesse legítimo");
    if (lower.includes("obrigação legal") || lower.includes("obrigacao legal"))
      bases.push("obrigação legal");
    if (
      lower.includes("contrato") ||
      lower.includes("execução") ||
      lower.includes("execucao")
    )
      bases.push("execução de contrato");
    if (bases.length > 0) {
      fields.push({
        field_type: "legal_basis",
        extracted_value: bases.join(", "),
        confidence_score: bases.length > 1 ? 70 : 90,
        source_evidence: `Base legal declarada: ${bases.join(", ")}`,
      });
    } else {
      fields.push({
        field_type: "legal_basis",
        extracted_value: "não declarado",
        confidence_score: 15,
        source_evidence: "Nenhuma base legal explícita encontrada no documento",
      });
    }
    const retentionMatch = content.match(
      /(\d+)\s*(ano|anos|mês|meses|dia|dias)/i,
    );
    if (retentionMatch) {
      fields.push({
        field_type: "retention_period",
        extracted_value: retentionMatch[0],
        confidence_score: 88,
        source_evidence: `"${retentionMatch[0]}" encontrado no texto`,
      });
    }
    if (
      lower.includes("finalidade") ||
      lower.includes("finalidade do tratamento")
    ) {
      const purposes: string[] = [];
      if (lower.includes("prestação") || lower.includes("prestacao"))
        purposes.push("prestação de serviços");
      if (lower.includes("marketing")) purposes.push("marketing");
      if (lower.includes("análise") || lower.includes("analise"))
        purposes.push("análises");
      if (lower.includes("publicidade")) purposes.push("publicidade");
      fields.push({
        field_type: "processing_purpose",
        extracted_value:
          purposes.length > 0
            ? purposes.join(", ")
            : "finalidade não especificada",
        confidence_score: purposes.length > 0 ? 82 : 30,
        source_evidence: "Seção de finalidade do tratamento identificada",
      });
    }
    if (
      lower.includes("compartilha") ||
      lower.includes("terceiro") ||
      lower.includes("terceiros")
    ) {
      fields.push({
        field_type: "third_party_sharing",
        extracted_value: "Compartilhamento com terceiros mencionado",
        confidence_score: 75,
        source_evidence: "Menção a compartilhamento com terceiros",
      });
    }
    if (lower.includes("direito") || lower.includes("titular")) {
      const rights: string[] = [];
      if (lower.includes("acesso") || lower.includes("acessar"))
        rights.push("acesso");
      if (
        lower.includes("retificação") ||
        lower.includes("retificacao") ||
        lower.includes("correção") ||
        lower.includes("correcao")
      )
        rights.push("retificação");
      if (
        lower.includes("exclusão") ||
        lower.includes("exclusao") ||
        lower.includes("excluir")
      )
        rights.push("exclusão");
      if (lower.includes("portabilidade") || lower.includes("portar"))
        rights.push("portabilidade");
      if (
        lower.includes("oposição") ||
        lower.includes("oposicao") ||
        lower.includes("opor")
      )
        rights.push("oposição");
      fields.push({
        field_type: "data_subject_rights",
        extracted_value:
          rights.length > 0
            ? rights.join(", ")
            : "direitos mencionados mas não especificados",
        confidence_score: rights.length > 0 ? 85 : 40,
        source_evidence: "Seção de direitos dos titulares identificada",
      });
    }
    if (
      lower.includes("armazenamento") ||
      lower.includes("armazena") ||
      lower.includes("storage")
    ) {
      fields.push({
        field_type: "storage_method",
        extracted_value: "Armazenamento em servidores com medidas de segurança",
        confidence_score: 65,
        source_evidence: "Menção a método de armazenamento",
      });
    }
    if (
      lower.includes("criptografia") ||
      lower.includes("criptograf") ||
      lower.includes("aes") ||
      lower.includes("tls") ||
      lower.includes("ssl") ||
      lower.includes("segurança") ||
      lower.includes("seguranca")
    ) {
      fields.push({
        field_type: "encryption_status",
        extracted_value: "Criptografia mencionada",
        confidence_score: 70,
        source_evidence: "Menção a medidas de segurança/criptografia",
      });
    }
    const totalConfidence = fields.reduce(
      (sum, f) => sum + f.confidence_score,
      0,
    );
    const overallConfidence =
      fields.length > 0 ? Math.round(totalConfidence / fields.length) : 0;
    const duration = Date.now() - startTime;
    logger.info(
      { fieldCount: fields.length, duration, overallConfidence },
      "Mock extraction completed",
    );
    return {
      extracted_fields: fields,
      processing_notes: "Extração simulada para desenvolvimento (sem API Groq)",
      overall_confidence: overallConfidence,
    };
  }
  getEngineName(): string {
    return "mock-adapter";
  }
  getEngineVersion(): string {
    return "1.0.0-dev";
  }
}
