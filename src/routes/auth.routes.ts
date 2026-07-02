import { FastifyInstance } from "fastify";
import { login, register, me, verify } from "../controllers/auth.controller";
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/login", login);
  app.post("/auth/register", register);
  app.get("/auth/me", { preHandler: [app.authenticate] }, me);
  app.post("/auth/verify", verify);
}
