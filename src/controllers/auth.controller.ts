import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../utils/supabaseClient";
import { supabaseAdmin } from "../utils/supabaseAdminClient";
import { logger } from "../utils/loggerUtil";
import { JwtPayload } from "../middleware/auth.middleware";
import { UnauthorizedError } from "../utils/errorHandlerUtil";
export async function login(
  request: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { email, password } = request.body;
  if (!email || !password) {
    return reply.status(400).send({ error: "Email e senha são obrigatórios" });
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logger.error({ error: error.message, email }, "Login failed");
    throw new UnauthorizedError("Credenciais inválidas");
  }
  reply.send({
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name ?? data.user.email?.split("@")[0] ?? "",
    },
  });
}
export async function register(
  request: FastifyRequest<{ Body: { email: string; password: string; name: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { email, password, name } = request.body;
  if (!email || !password) {
    return reply.status(400).send({ error: "Email e senha são obrigatórios" });
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name ?? email.split("@")[0] },
  });
  if (error) {
    logger.error({ error: error.message, email }, "Registration failed");
    throw new UnauthorizedError(`Erro ao criar conta: ${error.message}`);
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (sessionError) {
    logger.error({ error: sessionError.message, email }, "Auto-login after registration failed");
    reply.send({ message: "Conta criada! Faça login para continuar." });
    return;
  }
  reply.send({
    token: sessionData.session.access_token,
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name: name ?? data.user!.email?.split("@")[0] ?? "",
    },
  });
}
export async function me(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const payload = request.user as JwtPayload;
  reply.send({
    user_id: payload.user_id,
    email: payload.email,
    name: payload.name,
  });
}
export async function verify(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token de autenticação não fornecido");
  }
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new UnauthorizedError("Token inválido ou expirado");
  }
  reply.send({
    user: {
      id: data.user.id,
      email: data.user.email,
      name:
        data.user.user_metadata?.name ?? data.user.email?.split("@")[0] ?? "",
    },
  });
}
