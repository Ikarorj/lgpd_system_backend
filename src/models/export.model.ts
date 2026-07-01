export interface Export {
  id: string;
  user_id: string;
  extraction_ids: string[];
  format: "json" | "html";
  include_flagged: boolean;
  include_overrides: boolean;
  file_size_bytes: number | null;
  storage_path: string | null;
  created_at: Date;
}
export interface CreateExportInput {
  user_id: string;
  extraction_ids: string[];
  format: "json" | "html";
  include_flagged?: boolean;
  include_overrides?: boolean;
}
