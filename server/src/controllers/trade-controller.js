import { buildTradeService } from "../services/trade-service.js";

export function buildTradeController(deps) {
  const service = buildTradeService(deps);
  const send = (res, result) => res.status(result.status).json(result.body ?? {});

  return {
    async createOrder(req, res) {
      try {
        return send(res, await service.createOrder(req.auth.uid, req.body ?? {}));
      } catch (error) {
        console.error("创建订单失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
    async listUserOrders(req, res) {
      try {
        return send(res, await service.listUserOrders(req.params.userId, req.auth));
      } catch (error) {
        console.error("获取用户订单失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
    async listMyOrders(req, res) {
      try {
        return res.json(await service.listMyOrders(req.auth.uid));
      } catch (error) {
        console.error("获取订单列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
    async detail(req, res) {
      try {
        return send(res, await service.getOrderDetail(Number(req.params.id), req.auth.uid));
      } catch (error) {
        console.error("获取订单详情失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
    async getMyEvaluation(req, res) {
      try {
        return send(res, await service.getMyEvaluation(Number(req.params.id), req.auth.uid));
      } catch (error) {
        console.error("获取订单评价失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
    async changeStatus(req, res) {
      try {
        return send(res, await service.updateOrderStatus(Number(req.params.id), req.auth.uid, req.body?.status));
      } catch (error) {
        console.error("更新订单状态失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
    async createEvaluation(req, res) {
      try {
        return send(res, await service.createEvaluation(Number(req.params.id), req.auth.uid, req.body ?? {}));
      } catch (error) {
        console.error("创建评价失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
    async createComplaint(req, res) {
      try {
        return send(res, await service.createComplaint(req.auth.uid, req.body ?? {}));
      } catch (error) {
        console.error("创建投诉失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
  };
}

