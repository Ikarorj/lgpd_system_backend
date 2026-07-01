import { FastifyInstance } from "fastify";
import { me, verify } from "../controllers/auth.controller";
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/auth/me", { preHandler: [app.authenticate] }, me);
  app.post("/auth/verify", verify);
}
