import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../utils/supabaseAdminClient";
import {
  Artifact,
  CreateArtifactInput,
  UpdateArtifactInput,
} from "../models/artifact.model";
export class ArtifactRepository {
  async create(input: CreateArtifactInput): Promise<Artifact> {
    const id = uuidv4();
    const { data, error } = await supabaseAdmin
      .from("artifacts")
      .insert({
        id,
        filename: input.filename,
        format: input.format,
        size_bytes: input.size_bytes,
        uploaded_by: input.uploaded_by,
        content_hash: input.content_hash,
        storage_path: input.storage_path,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  async findById(id: string): Promise<Artifact | null> {
    const { data, error } = await supabaseAdmin
      .from("artifacts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async findByStatus(status: string): Promise<Artifact[]> {
    const { data, error } = await supabaseAdmin
      .from("artifacts")
      .select("*")
      .eq("status", status)
      .order("upload_timestamp", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  async findByUser(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Artifact[]> {
    const { data, error } = await supabaseAdmin
      .from("artifacts")
      .select("*")
      .eq("uploaded_by", userId)
      .order("upload_timestamp", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data ?? [];
  }
  async update(
    id: string,
    input: UpdateArtifactInput,
  ): Promise<Artifact | null> {
    const updateData: Record<string, unknown> = {};
    if (input.status !== undefined) updateData.status = input.status;
    if (input.error_message !== undefined)
      updateData.error_message = input.error_message;
    if (input.extraction_model_version !== undefined)
      updateData.extraction_model_version = input.extraction_model_version;
    updateData.updated_at = new Date().toISOString();
    if (Object.keys(updateData).length === 0) return this.findById(id);
    const { data, error } = await supabaseAdmin
      .from("artifacts")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async softDelete(id: string): Promise<Artifact | null> {
    return this.update(id, { status: "deleted" as Artifact["status"] });
  }
  async countByUser(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from("artifacts")
      .select("*", { count: "exact", head: true })
      .eq("uploaded_by", userId);
    if (error) throw error;
    return count ?? 0;
  }
  async createBatch(inputs: CreateArtifactInput[]): Promise<Artifact[]> {
    const rows = inputs.map((input) => ({
      id: uuidv4(),
      filename: input.filename,
      format: input.format,
      size_bytes: input.size_bytes,
      uploaded_by: input.uploaded_by,
      content_hash: input.content_hash,
      storage_path: input.storage_path,
    }));
    const { data, error } = await supabaseAdmin
      .from("artifacts")
      .insert(rows)
      .select();
    if (error) throw error;
    return data ?? [];
  }
}
export const artifactRepository = new ArtifactRepository();
