import { Router } from "express";
import { buildAuthController } from "../controllers/auth-controller.js";
import { buildEmailController } from "../controllers/email-controller.js";

export function createAuthRouter(deps) {
  const router = Router();
  const controller = buildAuthController(deps);
  const emailController = buildEmailController(deps);

  router.post("/sms/send", controller.sendSmsCode);
  router.post("/sms/login", controller.loginBySms);
  router.post("/sms/reset-password", controller.resetPasswordBySms);

  router.post("/login", controller.login);
  router.post("/register", controller.register);
  router.get("/me", deps.authRequired, controller.me);

  router.post("/email/send", deps.authRequired, emailController.sendVerificationEmail);
  router.post("/email/verify", deps.authRequired, emailController.verifyEmailCode);
  router.get("/email/status", deps.authRequired, emailController.getVerificationStatus);

  return router;
}
