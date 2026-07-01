import { FieldType } from "../../shared/types/apiContracts.types";
import { ExtractedFieldResult } from "../services/extractionEngine.interface";
import { CreateExtractedFieldInput } from "../models/extracted-field.model";
export function mapExtractionResultToFields(
  resultId: string,
  extractedFields: ExtractedFieldResult[],
): CreateExtractedFieldInput[] {
  return extractedFields.map((field) => ({
    result_id: resultId,
    field_type: field.field_type,
    extracted_value: field.extracted_value,
    confidence_score: field.confidence_score,
    source_evidence: field.source_evidence,
    source_line_number: field.source_line_number,
    metadata: field.metadata,
  }));
}
export function fieldTypeToDisplayName(fieldType: FieldType): string {
  const names: Record<FieldType, string> = {
    data_categories: "Categorias de Dados",
    legal_basis: "Base Legal",
    retention_period: "Período de Retenção",
    processing_purpose: "Finalidade do Tratamento",
    third_party_sharing: "Compartilhamento com Terceiros",
    data_subject_rights: "Direitos dos Titulares",
    storage_method: "Método de Armazenamento",
    encryption_status: "Status de Criptografia",
  };
  return names[fieldType] ?? fieldType;
}
export function fieldTypeToLgpdArticles(fieldType: FieldType): string[] {
  const articles: Record<FieldType, string[]> = {
    data_categories: ["Art. 5", "Art. 11"],
    legal_basis: ["Art. 7", "Art. 8", "Art. 9", "Art. 10"],
    retention_period: ["Art. 15", "Art. 16"],
    processing_purpose: ["Art. 6", "Art. 7"],
    third_party_sharing: ["Art. 5, IV", "Art. 37", "Art. 38"],
    data_subject_rights: [
      "Art. 17",
      "Art. 18",
      "Art. 19",
      "Art. 20",
      "Art. 21",
    ],
    storage_method: ["Art. 46", "Art. 47"],
    encryption_status: ["Art. 46", "Art. 48"],
  };
  return articles[fieldType] ?? [];
}
export function getSuggestedAction(
  fieldType: FieldType,
  confidence: number,
): string {
  if (confidence >= 80) return "Nenhuma ação necessária";
  if (confidence >= 50) return "Revisar para confirmar precisão";
  return `A declaração de "${fieldTypeToDisplayName(fieldType)}" não foi encontrada ou está incompleta. Considere adicionar linguagem explícita sobre este tópico.`;
}
