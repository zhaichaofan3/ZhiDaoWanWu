import { buildTenantService } from "../../services/tenant-service.js";
import { buildPermissionService } from "../../services/permission-service.js";

export function applyTenantAdminRoutes(router, { db, tenantAdminRequired }) {
  const tenantService = buildTenantService({ db });
  const permissionService = buildPermissionService({ db });

  router.get("/tenant/info", tenantAdminRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "当前用户未绑定学校" });
      }

      const result = await tenantService.getTenantById(tenantId);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("获取学校信息失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.patch("/tenant/info", tenantAdminRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "当前用户未绑定学校" });
      }

      const result = await tenantService.updateTenant(tenantId, req.body);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("更新学校信息失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/tenant/users", tenantAdminRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "当前用户未绑定学校" });
      }

      const { status, keyword, page = 1, limit = 20 } = req.query;
      let sql = `
        SELECT u.id, u.nickname, u.avatar, u.phone, u.student_id,
               u.status, u.created_at,
               (SELECT COUNT(*) FROM products WHERE owner_id = u.id) as products,
               (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id OR seller_id = u.id) as orders
        FROM users u
        WHERE u.tenant_id = ?
      `;
      const params = [tenantId];

      if (status) {
        sql += " AND u.status = ?";
        params.push(status);
      }

      if (keyword) {
        sql += " AND (u.nickname LIKE ? OR u.phone LIKE ? OR u.student_id LIKE ?)";
        const kw = `%${keyword}%`;
        params.push(kw, kw, kw);
      }

      sql += " ORDER BY u.created_at DESC";

      const offset = (Number(page) - 1) * Number(limit);
      sql += " LIMIT ? OFFSET ?";
      params.push(Number(limit), offset);

      const users = await db.query(sql, params);

      const countSql = "SELECT COUNT(*) as total FROM users WHERE tenant_id = ?" +
        (status ? " AND status = ?" : "") +
        (keyword ? " AND (nickname LIKE ? OR phone LIKE ? OR student_id LIKE ?)" : "");
      const countParams = [
        tenantId,
        ...(status ? [status] : []),
        ...(keyword ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`] : []),
      ];
      const [{ total }] = await db.query(countSql, countParams);

      return res.status(200).json({
        list: users,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (error) {
      console.error("获取本校用户列表失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.patch("/tenant/users/:userId/status", tenantAdminRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenantId;
      const { status } = req.body;

      if (!status || (status !== "active" && status !== "banned")) {
        return res.status(400).json({ message: "status 必须为 active 或 banned" });
      }

      const user = await db.getById("users", Number(req.params.userId));
      if (!user) return res.status(404).json({ message: "用户不存在" });

      if (user.tenant_id !== tenantId) {
        return res.status(403).json({ message: "无权操作该用户" });
      }

      await db.update("users", user.id, { status });
      return res.json({ message: "ok" });
    } catch (error) {
      console.error("更新用户状态失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/tenant/users/:userId", tenantAdminRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenantId;
      const userId = Number(req.params.userId);

      const user = await db.getById("users", userId);
      if (!user) return res.status(404).json({ message: "用户不存在" });

      if (user.tenant_id !== tenantId) {
        return res.status(403).json({ message: "无权查看该用户" });
      }

      const limitProducts = Math.min(Number(req.query.limitProducts) || 100, 1000);
      const limitOrders = Math.min(Number(req.query.limitOrders) || 100, 1000);

      const [userRows, products, orders] = await Promise.all([
        db.query(
          `SELECT u.id, u.nickname, u.avatar, u.phone, u.student_id,
                  u.status, u.created_at, u.bio,
                  (SELECT COUNT(*) FROM products WHERE owner_id = u.id) as products,
                  (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id OR seller_id = u.id) as orders
           FROM users u WHERE u.id = ? LIMIT 1`,
          [userId]
        ),
        db.query(
          "SELECT * FROM products WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?",
          [userId, limitProducts]
        ),
        db.query(
          `SELECT o.*, p.title as product_title
           FROM orders o
           LEFT JOIN products p ON o.product_id = p.id
           WHERE o.buyer_id = ? OR o.seller_id = ?
           ORDER BY o.created_at DESC LIMIT ?`,
          [userId, userId, limitOrders]
        ),
      ]);

      const u = userRows[0];
      return res.json({
        user: u,
        products,
        orders,
      });
    } catch (error) {
      console.error("获取用户详情失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/tenant/roles", tenantAdminRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenantId;
      const roles = await permissionService.getRoles({
        tenantId,
        type: "tenant",
        status: "active",
      });
      return res.status(roles.status).json(roles.body);
    } catch (error) {
      console.error("获取角色列表失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/tenant/stats", tenantAdminRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenantId;

      const [[usersCount], [productsCount], [ordersCount], [pendingProducts]] = await Promise.all([
        db.query("SELECT COUNT(*) as count FROM users WHERE tenant_id = ?", [tenantId]),
        db.query("SELECT COUNT(*) as count FROM products WHERE tenant_id = ?", [tenantId]),
        db.query("SELECT COUNT(*) as count FROM orders WHERE tenant_id = ?", [tenantId]),
        db.query("SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND status = 'pending'", [tenantId]),
      ]);

      return res.json({
        users: usersCount?.count || 0,
        products: productsCount?.count || 0,
        orders: ordersCount?.count || 0,
        pendingProducts: pendingProducts?.count || 0,
      });
    } catch (error) {
      console.error("获取统计数据失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });
}
