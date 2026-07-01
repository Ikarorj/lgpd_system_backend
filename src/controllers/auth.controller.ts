import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../utils/supabaseClient";
import { JwtPayload } from "../middleware/auth.middleware";
import { UnauthorizedError } from "../utils/errorHandlerUtil";
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
