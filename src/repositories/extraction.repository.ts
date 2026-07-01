import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../utils/supabaseAdminClient";
import {
  ExtractionResult,
  CreateExtractionResultInput,
  UpdateExtractionResultInput,
} from "../models/extraction-result.model";
import {
  ExtractedField,
  CreateExtractedFieldInput,
  OverrideFieldInput,
} from "../models/extracted-field.model";
export class ExtractionRepository {
  async createResult(
    input: CreateExtractionResultInput,
  ): Promise<ExtractionResult> {
    const id = uuidv4();
    const { data, error } = await supabaseAdmin
      .from("extraction_results")
      .insert({
        id,
        artifact_id: input.artifact_id,
        extraction_version: input.extraction_version,
        extracted_by: input.extracted_by ?? "openai-gpt4",
        overall_confidence: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  async findResultById(id: string): Promise<ExtractionResult | null> {
    const { data, error } = await supabaseAdmin
      .from("extraction_results")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async findResultByArtifactId(
    artifactId: string,
  ): Promise<ExtractionResult | null> {
    const { data, error } = await supabaseAdmin
      .from("extraction_results")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("extraction_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async updateResult(
    id: string,
    input: UpdateExtractionResultInput,
  ): Promise<ExtractionResult | null> {
    const updateData: Record<string, unknown> = {};
    if (input.overall_confidence !== undefined)
      updateData.overall_confidence = input.overall_confidence;
    if (input.flagged_count !== undefined)
      updateData.flagged_count = input.flagged_count;
    if (input.human_override_count !== undefined)
      updateData.human_override_count = input.human_override_count;
    if (input.completion_status !== undefined)
      updateData.completion_status = input.completion_status;
    if (input.extraction_completed_at !== undefined)
      updateData.extraction_completed_at = input.extraction_completed_at;
    if (input.extraction_duration_ms !== undefined)
      updateData.extraction_duration_ms = input.extraction_duration_ms;
    if (input.processing_notes !== undefined)
      updateData.processing_notes = input.processing_notes;
    updateData.updated_at = new Date().toISOString();
    if (Object.keys(updateData).length === 0) return this.findResultById(id);
    const { data, error } = await supabaseAdmin
      .from("extraction_results")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async createField(input: CreateExtractedFieldInput): Promise<ExtractedField> {
    const id = uuidv4();
    const isFlagged = input.confidence_score < 50;
    const { data, error } = await supabaseAdmin
      .from("extracted_fields")
      .insert({
        id,
        result_id: input.result_id,
        field_type: input.field_type,
        extracted_value: input.extracted_value,
        confidence_score: input.confidence_score,
        source_evidence: input.source_evidence,
        source_line_number: input.source_line_number ?? null,
        is_flagged: isFlagged,
        requires_human_review: isFlagged,
        metadata: input.metadata ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  async createFields(
    inputs: CreateExtractedFieldInput[],
  ): Promise<ExtractedField[]> {
    const rows = inputs.map((input) => {
      const isFlagged = input.confidence_score < 50;
      return {
        id: uuidv4(),
        result_id: input.result_id,
        field_type: input.field_type,
        extracted_value: input.extracted_value,
        confidence_score: input.confidence_score,
        source_evidence: input.source_evidence,
        source_line_number: input.source_line_number ?? null,
        is_flagged: isFlagged,
        requires_human_review: isFlagged,
        metadata: input.metadata ?? null,
      };
    });
    const { data, error } = await supabaseAdmin
      .from("extracted_fields")
      .insert(rows)
      .select();
    if (error) throw error;
    return data ?? [];
  }
  async findFieldsByResultId(resultId: string): Promise<ExtractedField[]> {
    const { data, error } = await supabaseAdmin
      .from("extracted_fields")
      .select("*")
      .eq("result_id", resultId)
      .order("field_type", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async findFlaggedFieldsByResultId(
    resultId: string,
  ): Promise<ExtractedField[]> {
    const { data, error } = await supabaseAdmin
      .from("extracted_fields")
      .select("*")
      .eq("result_id", resultId)
      .eq("is_flagged", true)
      .order("confidence_score", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async findFieldById(fieldId: string): Promise<ExtractedField | null> {
    const { data, error } = await supabaseAdmin
      .from("extracted_fields")
      .select("*")
      .eq("id", fieldId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async overrideField(
    fieldId: string,
    input: OverrideFieldInput,
  ): Promise<ExtractedField | null> {
    const { data, error } = await supabaseAdmin
      .from("extracted_fields")
      .update({
        human_override_by: input.human_override_by,
        human_override_value: input.human_override_value,
        human_override_rationale: input.human_override_rationale,
        human_override_timestamp: new Date().toISOString(),
        is_flagged: false,
        requires_human_review: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fieldId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async findAll(options: {
    status?: string;
    artifact_id?: string;
    page: number;
    page_size: number;
  }): Promise<{ rows: ExtractionResult[]; total: number }> {
    let query = supabaseAdmin
      .from("extraction_results")
      .select("*", { count: "exact" });
    if (options.status) query = query.eq("completion_status", options.status);
    if (options.artifact_id)
      query = query.eq("artifact_id", options.artifact_id);
    query = query.order("extraction_timestamp", { ascending: false });
    const offset = (options.page - 1) * options.page_size;
    query = query.range(offset, offset + options.page_size - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  }
  async countByStatus(status: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from("extraction_results")
      .select("*", { count: "exact", head: true })
      .eq("completion_status", status);
    if (error) throw error;
    return count ?? 0;
  }
}
export const extractionRepository = new ExtractionRepository();
