import { Router } from "express";
import { buildTradeController } from "../controllers/trade-controller.js";

function requireStudentId(deps) {
  return async (req, res, next) => {
    try {
      const user = await deps.db.getById("users", req.auth.uid);
      if (!user) {
        return res.status(404).json({ message: "用户不存在" });
      }
      if (!user.student_id || user.student_id.trim().length === 0) {
        return res.status(403).json({
          message: "请先登记学号后才能使用交易功能",
          code: "STUDENT_ID_REQUIRED",
        });
      }
      next();
    } catch (error) {
      console.error("学号验证失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  };
}

export function createTradeRouter(deps) {
  const router = Router();
  const controller = buildTradeController(deps);
  const studentIdCheck = requireStudentId(deps);

  router.post("/orders", deps.authRequired, studentIdCheck, controller.createOrder);
  router.get("/users/:userId/orders", deps.authRequired, studentIdCheck, controller.listUserOrders);
  router.get("/users/me/orders", deps.authRequired, studentIdCheck, controller.listMyOrders);
  router.get("/orders/:id", deps.authRequired, studentIdCheck, controller.detail);
  router.get("/orders/:id/evaluation", deps.authRequired, studentIdCheck, controller.getMyEvaluation);
  router.patch("/orders/:id/status", deps.authRequired, studentIdCheck, controller.changeStatus);
  router.patch("/orders/:id/delivery-method", deps.authRequired, studentIdCheck, controller.updateDeliveryMethod);
  router.post("/orders/:id/evaluation", deps.authRequired, studentIdCheck, controller.createEvaluation);
  router.post("/complaints", deps.authRequired, studentIdCheck, controller.createComplaint);

  return router;
}

