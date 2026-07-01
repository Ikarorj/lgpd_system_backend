import { FastifyRequest, preHandlerHookHandler } from "fastify";
import { z } from "zod";
import { BadRequestError } from "./errorHandlerUtil";
const uuidSchema = z.string().uuid("Formato de UUID inválido");
const emailSchema = z
  .string()
  .email("Email inválido")
  .max(255, "Email deve ter no máximo 255 caracteres");
const isDev = process.env.NODE_ENV === "development";
let passwordSchema: z.ZodString;
if (isDev) {
  passwordSchema = z
    .string()
    .min(4, "Senha deve ter no mínimo 4 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres");
} else {
  passwordSchema = z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número");
}
const nameSchema = z
  .string()
  .min(1, "Nome é obrigatório")
  .max(255, "Nome deve ter no máximo 255 caracteres");
const extractionStatusSchema = z.enum([
  "processing",
  "completed",
  "failed",
  "needs_review",
  "reviewed",
  "exported",
  "archived",
]);
const remediationStatusSchema = z.enum([
  "active",
  "acknowledged",
  "in_progress",
  "resolved",
]);
export const authSchemas = {
  register: {
    body: z.object({
      email: emailSchema,
      name: nameSchema,
      password: passwordSchema,
    }),
  },
  login: { body: z.object({ email: emailSchema, password: passwordSchema }) },
};
export const uploadSchemas = {
  getUploadStatus: {
    params: z.object({
      uploadSessionId: z.string().min(1, "uploadSessionId é obrigatório"),
    }),
  },
  getArtifact: { params: z.object({ artifactId: uuidSchema }) },
};
export const extractionSchemas = {
  getByArtifact: { params: z.object({ artifactId: uuidSchema }) },
  getList: {
    query: z.object({
      artifact_id: uuidSchema.optional(),
      status: extractionStatusSchema.optional(),
      page: z.coerce
        .number()
        .int("page deve ser um número inteiro")
        .min(1, "page deve ser no mínimo 1")
        .default(1)
        .optional(),
      page_size: z.coerce
        .number()
        .int("page_size deve ser um número inteiro")
        .min(1, "page_size deve ser no mínimo 1")
        .max(100, "page_size deve ser no máximo 100")
        .default(50)
        .optional(),
    }),
  },
  getResult: { params: z.object({ extractionId: uuidSchema }) },
  getFlagged: { params: z.object({ extractionId: uuidSchema }) },
};
export const complianceSchemas = {
  getReport: { params: z.object({ extractionId: uuidSchema }) },
  runCheck: { params: z.object({ extractionId: uuidSchema }) },
  generateOpinion: { params: z.object({ extractionId: uuidSchema }) },
  updateViolation: {
    params: z.object({ violationId: uuidSchema }),
    body: z.object({
      remediation_status: remediationStatusSchema,
      remediation_notes: z
        .string()
        .max(2000, "remediation_notes deve ter no máximo 2000 caracteres")
        .optional(),
    }),
  },
};
export type AuthRegisterInput = z.infer<typeof authSchemas.register.body>;
export type AuthLoginInput = z.infer<typeof authSchemas.login.body>;
export type UpdateViolationInput = z.infer<
  typeof complianceSchemas.updateViolation.body
>;
function formatZodErrors(errors: z.ZodIssue[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const issue of errors) {
    const path = issue.path.join(".");
    if (!grouped[path]) grouped[path] = [];
    grouped[path].push(issue.message);
  }
  return grouped;
}
export function validate(
  schemas: Record<string, z.ZodTypeAny>,
): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    for (const [target, schema] of Object.entries(schemas)) {
      const data = request[target as keyof FastifyRequest];
      const result = schema.safeParse(data);
      if (!result.success) {
        const fields = formatZodErrors(result.error.issues);
        throw new BadRequestError("Dados inválidos", {
          fields,
          ...(target === "body" ? {} : { [target]: data }),
        });
      }
    }
  };
}
