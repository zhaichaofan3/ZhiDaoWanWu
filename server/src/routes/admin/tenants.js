import { buildTenantService } from "../../services/tenant-service.js";
import { buildPermissionService } from "../../services/permission-service.js";

export function applyAdminTenantRoutes(router, { db, superAdminRequired }) {
  const tenantService = buildTenantService({ db });
  const permissionService = buildPermissionService({ db });

  router.get("/admin/tenants", superAdminRequired, async (req, res) => {
    try {
      const result = await tenantService.getTenants(req.query);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("获取租户列表失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.post("/admin/tenants", superAdminRequired, async (req, res) => {
    try {
      const result = await tenantService.createTenant(req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("创建租户失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/tenants/:id", superAdminRequired, async (req, res) => {
    try {
      const result = await tenantService.getTenantById(Number(req.params.id));
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("获取租户详情失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.patch("/admin/tenants/:id", superAdminRequired, async (req, res) => {
    try {
      const result = await tenantService.updateTenant(Number(req.params.id), req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("更新租户失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.delete("/admin/tenants/:id", superAdminRequired, async (req, res) => {
    try {
      const result = await tenantService.deleteTenant(Number(req.params.id));
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("删除租户失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/tenants/code/:code", superAdminRequired, async (req, res) => {
    try {
      const result = await tenantService.getTenantByCode(req.params.code);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("获取租户失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/roles", superAdminRequired, async (req, res) => {
    try {
      const result = await permissionService.getRoles(req.query);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("获取角色列表失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/roles/:id", superAdminRequired, async (req, res) => {
    try {
      const role = await db.getById("roles", Number(req.params.id));
      if (!role) return res.status(404).json({ message: "角色不存在" });

      const result = await permissionService.getRolePermissions(Number(req.params.id));
      return res.status(200).json({
        ...role,
        permissions: result.body.list,
      });
    } catch (error) {
      console.error("获取角色详情失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.patch("/admin/roles/:id/permissions", superAdminRequired, async (req, res) => {
    try {
      const { permissionIds } = req.body;
      if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ message: "permissionIds 必须为数组" });
      }
      const result = await permissionService.assignPermissionsToRole(
        Number(req.params.id),
        permissionIds
      );
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("分配权限失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/permissions", superAdminRequired, async (req, res) => {
    try {
      const result = await permissionService.getPermissions(req.query);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("获取权限列表失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.post("/admin/users/:userId/roles", superAdminRequired, async (req, res) => {
    try {
      const { roleId, tenantId } = req.body;
      if (!roleId) return res.status(400).json({ message: "roleId 为必填" });

      const result = await permissionService.grantRole(
        Number(req.params.userId),
        roleId,
        tenantId || null,
        req.auth.uid
      );
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("分配角色失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.delete("/admin/users/:userId/roles/:roleId", superAdminRequired, async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : null;
      const result = await permissionService.revokeRole(
        Number(req.params.userId),
        Number(req.params.roleId),
        tenantId
      );
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("回收角色失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/users/:userId/roles", superAdminRequired, async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : null;
      const roles = await permissionService.getUserRoles(
        Number(req.params.userId),
        tenantId
      );
      return res.status(200).json({ list: roles });
    } catch (error) {
      console.error("获取用户角色失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/users/:userId/permissions", superAdminRequired, async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : null;
      const permissions = await permissionService.getUserPermissions(
        Number(req.params.userId),
        tenantId
      );
      return res.status(200).json({ list: permissions });
    } catch (error) {
      console.error("获取用户权限失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });
}
