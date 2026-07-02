import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase, syncUser } from "../utils/supabaseClient";
import { UnauthorizedError } from "../utils/errorHandlerUtil";
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    user?: JwtPayload;
  }
}
export interface JwtPayload {
  user_id: string;
  email: string;
  name?: string;
}
export async function registerAuth(app: FastifyInstance): Promise<void> {
  app.decorate(
    "authenticate",
    async function (request: FastifyRequest, _reply: FastifyReply) {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new UnauthorizedError("Token de autenticação não fornecido");
      }
      const token = authHeader.slice(7);
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          request.log.error({ error: error?.message, hasUser: !!data?.user, tokenPrefix: token.substring(0, 20) }, "Auth verification failed");
          throw new UnauthorizedError("Token inválido ou expirado");
        }
        const email = data.user.email ?? "";
        const name = data.user.user_metadata?.name ?? email.split("@")[0] ?? "";
        request.user = { user_id: data.user.id, email, name } as JwtPayload;
        await syncUser(data.user.id, email, name);
      } catch (err) {
        if (err instanceof UnauthorizedError) throw err;
        throw new UnauthorizedError("Falha ao verificar token de autenticação");
      }
    },
  );
}
