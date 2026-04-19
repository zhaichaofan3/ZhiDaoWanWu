export function applyPointRoutes(router, { db, adminRequired }) {
  router.get("/admin/points/rules", adminRequired, async (req, res) => {
    try {
      const rules = await db.query(
        "SELECT * FROM point_rules ORDER BY created_at DESC"
      );
      res.json({ list: rules });
    } catch (error) {
      console.error("获取积分规则失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.post("/admin/points/rules", adminRequired, async (req, res) => {
    const { code, name, description, points, enabled, tenantId } = req.body ?? {};
    if (!code || !name || points === undefined) {
      return res.status(400).json({ message: "code、name、points 为必填项" });
    }

    try {
      const existing = await db.query(
        "SELECT id FROM point_rules WHERE code = ? LIMIT 1",
        [code]
      );
      if (existing?.[0]) {
        return res.status(409).json({ message: "规则代码已存在" });
      }

      const result = await db.insert("point_rules", {
        code,
        name,
        description: description || null,
        points: Number(points),
        enabled: enabled !== false,
        tenant_id: tenantId || null,
      });

      const rule = await db.getById("point_rules", result.insertId);
      return res.json({ item: rule });
    } catch (error) {
      console.error("创建积分规则失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.put("/admin/points/rules/:id", adminRequired, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "无效的规则ID" });
    }

    const { code, name, description, points, enabled, tenantId } = req.body ?? {};

    try {
      const rule = await db.getById("point_rules", id);
      if (!rule) {
        return res.status(404).json({ message: "积分规则不存在" });
      }

      if (code && code !== rule.code) {
        const existing = await db.query(
          "SELECT id FROM point_rules WHERE code = ? AND id != ? LIMIT 1",
          [code, id]
        );
        if (existing?.[0]) {
          return res.status(409).json({ message: "规则代码已存在" });
        }
      }

      await db.update("point_rules", id, {
        code: code || rule.code,
        name: name || rule.name,
        description: description !== undefined ? description : rule.description,
        points: points !== undefined ? Number(points) : rule.points,
        enabled: enabled !== undefined ? Boolean(enabled) : rule.enabled,
        tenant_id: tenantId !== undefined ? (tenantId || null) : rule.tenant_id,
      });

      const updated = await db.getById("point_rules", id);
      return res.json({ item: updated });
    } catch (error) {
      console.error("更新积分规则失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.delete("/admin/points/rules/:id", adminRequired, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "无效的规则ID" });
    }

    try {
      const rule = await db.getById("point_rules", id);
      if (!rule) {
        return res.status(404).json({ message: "积分规则不存在" });
      }

      await db.delete("point_rules", id);
      return res.json({ message: "删除成功" });
    } catch (error) {
      console.error("删除积分规则失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/points/rules/:id", adminRequired, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "无效的规则ID" });
    }

    try {
      const rule = await db.getById("point_rules", id);
      if (!rule) {
        return res.status(404).json({ message: "积分规则不存在" });
      }
      return res.json({ item: rule });
    } catch (error) {
      console.error("获取积分规则详情失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });
}