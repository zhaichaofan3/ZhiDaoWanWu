import { buildAuthService } from "../services/auth-service.js";

export function buildAuthController(deps) {
  const authService = buildAuthService(deps);

  return {
    async login(req, res) {
      try {
        const result = await authService.login(req.body ?? {});
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("登录失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async register(req, res) {
      try {
        const result = await authService.register(req.body ?? {});
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("注册失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    me(req, res) {
      return res.json(authService.me(req.auth.user));
    },
  };
}
