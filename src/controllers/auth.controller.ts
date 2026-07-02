import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../utils/supabaseClient";
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name ?? email.split("@")[0] } },
  });
  if (error) {
    throw new UnauthorizedError("Erro ao criar conta");
  }
  if (!data.session) {
    reply.send({ message: "Confirme seu email antes de fazer login" });
    return;
  }
  reply.send({
    token: data.session.access_token,
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
