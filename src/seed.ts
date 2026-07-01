import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";
import { supabaseAdmin } from "./utils/supabaseAdminClient";
import { logger } from "./utils/loggerUtil";
async function seed(): Promise<void> {
  logger.info("Starting database seed...");
  const userId = "00000000-0000-0000-0000-000000000001";
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", "test@example.com")
    .maybeSingle();
  if (!existingUser) {
    await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: userId,
          email: "test@example.com",
          name: "Usuário Teste",
          role: "compliance_officer",
          auth_provider: "seed",
        },
        { onConflict: "id" },
      );
  }
  const usedUserId = existingUser?.id ?? userId;
  await supabaseAdmin.from("audit_log").delete().eq("user_id", usedUserId);
  const { data: existingExtractions } = await supabaseAdmin
    .from("extraction_results")
    .select("id")
    .in(
      "artifact_id",
      (
        await supabaseAdmin
          .from("artifacts")
          .select("id")
          .eq("uploaded_by", usedUserId)
      ).data?.map((a: { id: string }) => a.id) ?? [],
    );
  if (existingExtractions && existingExtractions.length > 0) {
    const resultIds = existingExtractions.map((r: { id: string }) => r.id);
    await supabaseAdmin
      .from("extracted_fields")
      .delete()
      .in("result_id", resultIds);
  }
  await supabaseAdmin
    .from("compliance_violations")
    .delete()
    .in(
      "extraction_result_id",
      (
        await supabaseAdmin
          .from("extraction_results")
          .select("id")
          .in(
            "artifact_id",
            (
              await supabaseAdmin
                .from("artifacts")
                .select("id")
                .eq("uploaded_by", usedUserId)
            ).data?.map((a: { id: string }) => a.id) ?? [],
          )
      ).data?.map((r: { id: string }) => r.id) ?? [],
    );
  await supabaseAdmin
    .from("compliance_reports")
    .delete()
    .in(
      "extraction_result_id",
      (
        await supabaseAdmin
          .from("extraction_results")
          .select("id")
          .in(
            "artifact_id",
            (
              await supabaseAdmin
                .from("artifacts")
                .select("id")
                .eq("uploaded_by", usedUserId)
            ).data?.map((a: { id: string }) => a.id) ?? [],
          )
      ).data?.map((r: { id: string }) => r.id) ?? [],
    );
  await supabaseAdmin
    .from("extraction_results")
    .delete()
    .in(
      "artifact_id",
      (
        await supabaseAdmin
          .from("artifacts")
          .select("id")
          .eq("uploaded_by", usedUserId)
      ).data?.map((a: { id: string }) => a.id) ?? [],
    );
  await supabaseAdmin.from("artifacts").delete().eq("uploaded_by", usedUserId);
  const artifactId = uuidv4();
  const contentHash = crypto
    .createHash("sha256")
    .update("test content")
    .digest("hex");
  await supabaseAdmin
    .from("artifacts")
    .upsert(
      {
        id: artifactId,
        filename: "privacy_policy.pdf",
        format: "PDF",
        size_bytes: 1024000,
        uploaded_by: usedUserId,
        content_hash: contentHash,
        storage_path: `seeds/${artifactId}/privacy_policy.pdf`,
        status: "completed",
      },
      { onConflict: "id" },
    );
  const extractionId = uuidv4();
  await supabaseAdmin
    .from("extraction_results")
    .upsert(
      {
        id: extractionId,
        artifact_id: artifactId,
        extraction_version: "1.0.0",
        extracted_by: "openai-gpt4",
        overall_confidence: 87,
        flagged_count: 1,
        completion_status: "needs_review",
        extraction_started_at: new Date().toISOString(),
        extraction_completed_at: new Date().toISOString(),
        extraction_duration_ms: 3500,
      },
      { onConflict: "id" },
    );
  const fields = [
    {
      field_type: "data_categories",
      value: "nome, email, telefone, IP address, localização",
      confidence: 95,
      evidence:
        "Coletamos: nome, email, telefone, endereço IP e dados de localização dos usuários.",
    },
    {
      field_type: "legal_basis",
      value: "consentimento, interesse legítimo",
      confidence: 42,
      evidence: "Base legal: conforme necessário para fins comerciais.",
    },
    {
      field_type: "retention_period",
      value: "2 anos após último login",
      confidence: 92,
      evidence:
        "Política de retenção: Mantemos dados por 2 anos após o último login do usuário.",
    },
    {
      field_type: "processing_purpose",
      value: "prestação de serviços, análises, marketing",
      confidence: 88,
      evidence:
        "Processamos seus dados para prestação de serviços, análises e marketing.",
    },
  ];
  const extraFields = [
    {
      field_type: "third_party_sharing",
      value:
        "Compartilhamento com processadores de pagamento, parceiros de marketing, autoridades legais quando exigido por lei",
      confidence: 78,
      evidence:
        "Seção 5: Poderemos compartilhar dados com processadores de pagamento, parceiros de marketing e autoridades competentes.",
    },
    {
      field_type: "data_subject_rights",
      value:
        "Direitos de acesso, retificação, exclusão, portabilidade, oposição fornecidos",
      confidence: 91,
      evidence:
        "Seção 7: Titulares têm direito de acessar, retificar, excluir, portar dados e se opor ao processamento.",
    },
    {
      field_type: "storage_method",
      value:
        "Dados armazenados em servidores AWS S3 com criptografia em repouso e em trânsito",
      confidence: 63,
      evidence:
        "Medidas de segurança: Servidores AWS S3 com criptografia AES-256 e TLS 1.3.",
    },
    {
      field_type: "encryption_status",
      value: "Criptografia em repouso (AES-256) e em trânsito (TLS 1.3)",
      confidence: 70,
      evidence:
        "Seção 8: Utilizamos criptografia AES-256 para dados em repouso e TLS 1.3 para dados em trânsito.",
    },
  ];
  fields.push(...extraFields);
  const fieldRows = fields.map((field) => {
    const isFlagged = field.confidence < 50;
    return {
      id: uuidv4(),
      result_id: extractionId,
      field_type: field.field_type,
      extracted_value: field.value,
      confidence_score: field.confidence,
      source_evidence: field.evidence,
      is_flagged: isFlagged,
      requires_human_review: isFlagged,
    };
  });
  for (const row of fieldRows) {
    await supabaseAdmin
      .from("extracted_fields")
      .upsert(row, { onConflict: "id" });
  }
  await supabaseAdmin
    .from("audit_log")
    .insert({
      user_id: usedUserId,
      action: "uploaded",
      resource_type: "artifact",
      resource_id: artifactId,
      details: { filename: "privacy_policy.pdf", format: "PDF" },
      timestamp: new Date().toISOString(),
    });
  logger.info("Database seeded successfully");
  logger.info("Test user: test@example.com");
  logger.info("Sample artifact and extraction result created");
}
seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
