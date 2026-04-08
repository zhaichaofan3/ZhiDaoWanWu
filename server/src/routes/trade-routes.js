import { Router } from "express";
import { buildTradeController } from "../controllers/trade-controller.js";

export function createTradeRouter(deps) {
  const router = Router();
  const controller = buildTradeController(deps);

  router.post("/orders", deps.authRequired, controller.createOrder);
  router.get("/users/:userId/orders", deps.authRequired, controller.listUserOrders);
  router.get("/users/me/orders", deps.authRequired, controller.listMyOrders);
  router.get("/orders/:id", deps.authRequired, controller.detail);
  router.get("/orders/:id/evaluation", deps.authRequired, controller.getMyEvaluation);
  router.patch("/orders/:id/status", deps.authRequired, controller.changeStatus);
  router.post("/orders/:id/evaluation", deps.authRequired, controller.createEvaluation);
  router.post("/complaints", deps.authRequired, controller.createComplaint);

  return router;
}

