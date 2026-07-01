import {
  ArtifactFormat,
  ArtifactStatus,
} from "../../shared/types/apiContracts.types";
export interface Artifact {
  id: string;
  filename: string;
  format: ArtifactFormat;
  size_bytes: number;
  upload_timestamp: Date;
  uploaded_by: string;
  content_hash: string;
  storage_path: string;
  status: ArtifactStatus;
  error_message: string | null;
  extraction_model_version: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
export interface CreateArtifactInput {
  filename: string;
  format: ArtifactFormat;
  size_bytes: number;
  uploaded_by: string;
  content_hash: string;
  storage_path: string;
}
export interface UpdateArtifactInput {
  status?: ArtifactStatus;
  error_message?: string | null;
  extraction_model_version?: string;
}
