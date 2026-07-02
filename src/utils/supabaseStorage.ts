import { supabaseAdmin } from "./supabaseAdminClient";
import { logger } from "./loggerUtil";

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "artifacts";

export async function ensureStorageBucket(): Promise<void> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);

  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
      public: false,
    });
    if (error) {
      logger.error({ error: error.message, bucket: STORAGE_BUCKET }, "Falha ao criar bucket no Supabase Storage");
      throw error;
    }
    logger.info({ bucket: STORAGE_BUCKET }, "Bucket criado no Supabase Storage");
  } else {
    logger.info({ bucket: STORAGE_BUCKET }, "Bucket já existe no Supabase Storage");
  }
}


