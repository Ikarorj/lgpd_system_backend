import OpenAI from "openai";
import { extractionConfig } from "../config/extractionConfig";
import { logger } from "../utils/loggerUtil";
import {
  SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "../utils/extractionPromptsUtil";
import {
  ExtractionEngine,
  ExtractionOutput,
  ExtractedFieldResult,
} from "./extractionEngine.interface";
const FIELD_TYPES: Record<string, string> = {
  data_categories: "data_categories",
  legal_basis: "legal_basis",
  retention_period: "retention_period",
  processing_purpose: "processing_purpose",
  third_party_sharing: "third_party_sharing",
  data_subject_rights: "data_subject_rights",
  storage_method: "storage_method",
  encryption_status: "encryption_status",
};
export function isGroqAvailable(): boolean {
  const key = process.env.GROQ_API_KEY || "";
  return /^gsk_[a-zA-Z0-9]{32,}$/.test(key);
}
export class GroqExtractionAdapter implements ExtractionEngine {
  private client: OpenAI;
  private model: string;
  constructor() {
    this.client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: extractionConfig.groq.apiKey,
    });
    this.model = extractionConfig.groq.model;
  }
  async extract(
    content: string,
    filename: string,
    format: string,
  ): Promise<ExtractionOutput> {
    const startTime = Date.now();
    const prompt = buildExtractionPrompt(content, filename, format);
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: extractionConfig.groq.temperature,
        max_tokens: extractionConfig.groq.maxTokens,
        response_format: { type: "json_object" },
      });
      const duration = Date.now() - startTime;
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("Empty response from Groq");
      }
      const parsed = JSON.parse(responseText) as {
        extracted_fields: Array<{
          field_type: string;
          extracted_value: string;
          confidence_score: number;
          source_evidence: string;
          is_ambiguous?: boolean;
          notes?: string;
        }>;
        processing_notes?: string;
      };
      const fields: ExtractedFieldResult[] = parsed.extracted_fields
        .filter((f) => FIELD_TYPES[f.field_type])
        .map((f) => ({
          field_type: f.field_type as ExtractedFieldResult["field_type"],
          extracted_value: f.extracted_value,
          confidence_score: f.confidence_score,
          source_evidence: f.source_evidence,
          is_ambiguous: f.is_ambiguous,
          notes: f.notes,
        }));
      const totalConfidence = fields.reduce(
        (sum, f) => sum + f.confidence_score,
        0,
      );
      const overallConfidence =
        fields.length > 0 ? Math.round(totalConfidence / fields.length) : 0;
      logger.info(
        {
          filename,
          fieldCount: fields.length,
          duration,
          overallConfidence,
          model: this.model,
        },
        "Groq extraction completed",
      );
      return {
        extracted_fields: fields,
        processing_notes: parsed.processing_notes,
        overall_confidence: overallConfidence,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { err: error, filename, duration, model: this.model },
        "Groq extraction failed",
      );
      throw error;
    }
  }
  getEngineName(): string {
    return `groq-${this.model}`;
  }
  getEngineVersion(): string {
    return extractionConfig.extraction.defaultModelVersion;
  }
}
