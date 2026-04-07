import { Router } from "express";
import { buildAuthController } from "../controllers/auth-controller.js";

export function createAuthRouter(deps) {
  const router = Router();
  const controller = buildAuthController(deps);

  router.post("/login", controller.login);
  router.post("/register", controller.register);
  router.get("/me", deps.authRequired, controller.me);

  return router;
}
