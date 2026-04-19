import { Router } from "express";
import { buildAuthController } from "../controllers/auth-controller.js";

export function createAuthRouter(deps) {
  const router = Router();
  const controller = buildAuthController(deps);

  router.post("/sms/send", controller.sendSmsCode);
  router.post("/sms/login", controller.loginBySms);
  router.post("/sms/reset-password", controller.resetPasswordBySms);

  router.post("/login", controller.login);
  router.post("/register", controller.register);
  router.get("/me", deps.authRequired, controller.me);

  return router;
}
