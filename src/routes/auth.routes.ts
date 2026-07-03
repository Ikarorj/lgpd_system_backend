import { FastifyInstance } from "fastify";
import { login, register, me, verify } from "../controllers/auth.controller";
import { authSchemas, validate } from "../utils/requestValidator";
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/login", { preHandler: [validate(authSchemas.login)] }, login as any);
  app.post("/auth/register", { preHandler: [validate(authSchemas.register)] }, register as any);
  app.get("/auth/me", { preHandler: [app.authenticate] }, me);
  app.post("/auth/verify", verify);
}
