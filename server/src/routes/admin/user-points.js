export function applyUserPointRoutes(router, { db, adminRequired }) {
  router.get("/admin/users/:userId/points", adminRequired, async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: "无效的 userId" });
    }

    try {
      let userPoints = await db.query(
        "SELECT * FROM user_points WHERE user_id = ? LIMIT 1",
        [userId]
      );

      if (!userPoints || userPoints.length === 0) {
        const result = await db.insert("user_points", {
          user_id: userId,
          points: 0,
          total_points: 0,
        });
        userPoints = await db.query(
          "SELECT * FROM user_points WHERE id = ? LIMIT 1",
          [result.insertId]
        );
      }

      const logs = await db.query(
        "SELECT pl.*, pr.name as rule_name, u.nickname as operator_name FROM point_logs pl LEFT JOIN point_rules pr ON pl.rule_id = pr.id LEFT JOIN users u ON pl.operator_id = u.id WHERE pl.user_id = ? ORDER BY pl.created_at DESC LIMIT 100",
        [userId]
      );

      return res.json({
        points: userPoints[0] || { user_id: userId, points: 0, total_points: 0 },
        logs: logs || []
      });
    } catch (error) {
      console.error("获取用户积分失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.post("/admin/users/:userId/points/adjust", adminRequired, async (req, res) => {
    const userId = Number(req.params.userId);
    const { points, reason } = req.body ?? {};

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: "无效的 userId" });
    }
    if (!Number.isFinite(points) || points === 0) {
      return res.status(400).json({ message: "points 为必填且不能为0" });
    }
    if (!reason || String(reason).trim().length === 0) {
      return res.status(400).json({ message: "reason 为必填" });
    }

    try {
      const user = await db.getById("users", userId);
      if (!user) {
        return res.status(404).json({ message: "用户不存在" });
      }

      let userPoints = await db.query(
        "SELECT * FROM user_points WHERE user_id = ? LIMIT 1",
        [userId]
      );

      if (!userPoints || userPoints.length === 0) {
        const result = await db.insert("user_points", {
          user_id: userId,
          points: 0,
          total_points: 0,
        });
        userPoints = await db.query(
          "SELECT * FROM user_points WHERE id = ? LIMIT 1",
          [result.insertId]
        );
      }

      const currentPoints = userPoints[0].points || 0;
      const newPoints = currentPoints + Number(points);

      if (newPoints < 0) {
        return res.status(400).json({ message: "积分不足，无法扣减" });
      }

      const newTotalPoints = Number(points) > 0
        ? (userPoints[0].total_points || 0) + Number(points)
        : userPoints[0].total_points || 0;

      await db.update("user_points", userPoints[0].id, {
        points: newPoints,
        total_points: newTotalPoints,
      });

      await db.insert("point_logs", {
        user_id: userId,
        rule_id: null,
        points: Number(points),
        balance: newPoints,
        type: "adjust",
        description: String(reason).trim(),
        operator_id: req.auth.uid,
      });

      await db.insert("logs", {
        id: `log_${Date.now()}`,
        user_id: req.auth.uid,
        action: "调整用户积分",
        module: "积分管理",
        content: `用户ID: ${userId}, 昵称: ${user.nickname || "-"}, 变动: ${Number(points) > 0 ? "+" : ""}${points}, 原因: ${reason}`,
        ip: req.ip || "unknown",
        created_at: new Date().toISOString(),
      });

      return res.json({
        message: "ok",
        newPoints: newPoints,
        newTotalPoints: newTotalPoints
      });
    } catch (error) {
      console.error("调整用户积分失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/users/:userId/points/logs", adminRequired, async (req, res) => {
    const userId = Number(req.params.userId);
    const limit = Math.min(Number(req.query.limit) || 100, 1000);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: "无效的 userId" });
    }

    try {
      const logs = await db.query(
        `SELECT pl.*, pr.name as rule_name, u.nickname as operator_name
         FROM point_logs pl
         LEFT JOIN point_rules pr ON pl.rule_id = pr.id
         LEFT JOIN users u ON pl.operator_id = u.id
         WHERE pl.user_id = ?
         ORDER BY pl.created_at DESC
         LIMIT ?`,
        [userId, limit]
      );

      return res.json({ list: logs || [] });
    } catch (error) {
      console.error("获取用户积分记录失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });
}