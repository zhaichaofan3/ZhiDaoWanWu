export function buildAuthMiddleware({ db, verifyToken, permissionService }) {
  function authRequired(req, res, next) {
    const header = req.headers.authorization || "";
    const m = String(header).match(/^Bearer (.+)$/i);
    const token = m?.[1] || "";
    const payload = verifyToken(token);

    if (!payload?.uid) {
      return res.status(401).json({ message: "未登录或 token 无效" });
    }

    db.getById("users", payload.uid)
      .then((user) => {
        if (!user) return res.status(401).json({ message: "用户不存在" });
        if (user.status === "banned") return res.status(403).json({ message: "账号已封禁" });

        req.auth = {
          uid: user.id,
          role: user.role,
          tenantId: user.tenant_id,
          emailVerified: user.email_verified === 1,
          user,
        };
        next();
      })
      .catch((error) => {
        console.error("获取用户信息失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  }

  function adminRequired(req, res, next) {
    authRequired(req, res, async () => {
      if (req.auth.role !== "admin" && req.auth.role !== "user") {
        return res.status(403).json({ message: "需要管理员权限" });
      }

      const isSuperAdmin = await permissionService.isSuperAdmin(req.auth.uid);
      if (isSuperAdmin) {
        req.auth.isSuperAdmin = true;
        return next();
      }

      const hasAdminRole = await permissionService.hasRole(req.auth.uid, "tenant_admin", req.auth.tenantId);
      if (hasAdminRole) {
        req.auth.isTenantAdmin = true;
        return next();
      }

      return res.status(403).json({ message: "需要管理员权限" });
    });
  }

  function superAdminRequired(req, res, next) {
    authRequired(req, res, async () => {
      const isSuperAdmin = await permissionService.isSuperAdmin(req.auth.uid);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "需要超级管理员权限" });
      }
      req.auth.isSuperAdmin = true;
      next();
    });
  }

  function tenantAdminRequired(req, res, next) {
    authRequired(req, res, async () => {
      const isSuperAdmin = await permissionService.isSuperAdmin(req.auth.uid);
      if (isSuperAdmin) {
        req.auth.isSuperAdmin = true;
        return next();
      }

      const tenantId = req.auth.tenantId;
      if (!tenantId) {
        return res.status(403).json({ message: "需要学校管理员权限" });
      }

      const isTenantAdmin = await permissionService.isTenantAdmin(req.auth.uid, tenantId);
      if (!isTenantAdmin) {
        return res.status(403).json({ message: "需要学校管理员权限" });
      }

      req.auth.isTenantAdmin = true;
      next();
    });
  }

  function requirePermission(permissionCode) {
    return (req, res, next) => {
      authRequired(req, res, async () => {
        const isSuperAdmin = await permissionService.isSuperAdmin(req.auth.uid);
        if (isSuperAdmin) {
          req.auth.isSuperAdmin = true;
          return next();
        }

        const tenantId = req.params.tenantId || req.query.tenantId || req.auth.tenantId;
        const hasPermission = await permissionService.hasPermission(req.auth.uid, permissionCode, tenantId);
        if (!hasPermission) {
          return res.status(403).json({ message: `缺少必要权限: ${permissionCode}` });
        }

        req.auth.currentTenantId = tenantId;
        next();
      });
    };
  }

  function requireEmailVerified(req, res, next) {
    authRequired(req, res, () => {
      if (!req.auth.emailVerified) {
        return res.status(403).json({
          message: "需要完成学校邮箱认证",
          code: "EMAIL_NOT_VERIFIED",
        });
      }
      next();
    });
  }

  function requireTenant(req, res, next) {
    authRequired(req, res, () => {
      if (!req.auth.tenantId) {
        return res.status(403).json({
          message: "需要选择学校",
          code: "TENANT_NOT_SELECTED",
        });
      }
      next();
    });
  }

  return {
    authRequired,
    adminRequired,
    superAdminRequired,
    tenantAdminRequired,
    requirePermission,
    requireEmailVerified,
    requireTenant,
  };
}
