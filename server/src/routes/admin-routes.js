import express from "express";

export function createAdminRouter({
  db,
  adminRequired,
  hashPassword,
  upload,
  crypto,
  fs,
  path,
  UPLOADS_DIR,
  ossReady,
  s3Client,
  PutObjectCommand,
  OSS_BUCKET,
  OSS_PUBLIC_BASE_URL,
}) {
  const router = express.Router();

  // --- Admin: AI 中心（提示词管理）---
  router.get("/admin/ai/prompts", adminRequired, (req, res) => {
    const { keyword, scene, enabled } = req.query ?? {};
    let sql = `
      SELECT *
      FROM ai_prompts
    `;
    const whereClause = [];
    const params = [];

    const kw = String(keyword || "").trim();
    if (kw) {
      whereClause.push("(name LIKE ? OR scene LIKE ? OR content LIKE ?)");
      params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`);
    }
    const sc = String(scene || "").trim();
    if (sc) {
      whereClause.push("scene = ?");
      params.push(sc);
    }
    if (enabled != null && String(enabled) !== "") {
      const v = String(enabled).toLowerCase();
      if (v === "true" || v === "1") whereClause.push("enabled = 1");
      if (v === "false" || v === "0") whereClause.push("enabled = 0");
    }

    if (whereClause.length > 0) sql += " WHERE " + whereClause.join(" AND ");
    sql += " ORDER BY updated_at DESC, created_at DESC";

    db.query(sql, params)
      .then((list) => res.json({ list }))
      .catch((error) => {
        console.error("获取提示词列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.post("/admin/ai/prompts", adminRequired, (req, res) => {
    const { name, scene, content, enabled } = req.body ?? {};
    if (!String(name || "").trim()) return res.status(400).json({ message: "name 为必填" });
    if (!String(scene || "").trim()) return res.status(400).json({ message: "scene 为必填" });
    if (!String(content || "").trim()) return res.status(400).json({ message: "content 为必填" });

    const item = {
      id: `aip_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
      name: String(name).trim(),
      scene: String(scene).trim(),
      content: String(content),
      enabled: enabled == null ? true : Boolean(enabled),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.insert("ai_prompts", item)
      .then(() =>
        db.insert("logs", {
          id: `log_${Date.now()}`,
          user_id: req.auth.uid,
          action: "新增提示词",
          module: "AI中心",
          content: `scene: ${item.scene}, name: ${item.name}`,
          ip: req.ip || "unknown",
          created_at: new Date().toISOString(),
        })
      )
      .then(() => res.status(201).json({ item }))
      .catch((error) => {
        console.error("创建提示词失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.put("/admin/ai/prompts/:id", adminRequired, (req, res) => {
    const id = String(req.params.id || "").trim();
    const { name, scene, content, enabled } = req.body ?? {};
    if (!id) return res.status(400).json({ message: "无效的 id" });

    db.getById("ai_prompts", id)
      .then((row) => {
        if (!row) return res.status(404).json({ message: "提示词不存在" });
        const updateData = {};
        if (name != null) updateData.name = String(name).trim();
        if (scene != null) updateData.scene = String(scene).trim();
        if (content != null) updateData.content = String(content);
        if (enabled != null) updateData.enabled = Boolean(enabled);
        updateData.updated_at = new Date().toISOString();
        return db.update("ai_prompts", id, updateData).then(() => ({ old: row, next: updateData }));
      })
      .then((x) => {
        if (!x) return;
        return db.insert("logs", {
          id: `log_${Date.now()}`,
          user_id: req.auth.uid,
          action: "编辑提示词",
          module: "AI中心",
          content: `id: ${id}, scene: ${x.old?.scene || "-"} -> ${x.next?.scene || "-"}, name: ${x.old?.name || "-"} -> ${x.next?.name || "-"}`,
          ip: req.ip || "unknown",
          created_at: new Date().toISOString(),
        });
      })
      .then(() => res.json({ message: "ok" }))
      .catch((error) => {
        console.error("更新提示词失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/ai/prompts/:id/enabled", adminRequired, (req, res) => {
    const id = String(req.params.id || "").trim();
    const { enabled } = req.body ?? {};
    if (!id) return res.status(400).json({ message: "无效的 id" });
    if (enabled == null) return res.status(400).json({ message: "enabled 为必填" });

    db.getById("ai_prompts", id)
      .then((row) => {
        if (!row) return res.status(404).json({ message: "提示词不存在" });
        return db
          .update("ai_prompts", id, { enabled: Boolean(enabled), updated_at: new Date().toISOString() })
          .then(() => row);
      })
      .then((row) => {
        if (!row) return;
        return db.insert("logs", {
          id: `log_${Date.now()}`,
          user_id: req.auth.uid,
          action: Boolean(enabled) ? "启用提示词" : "禁用提示词",
          module: "AI中心",
          content: `id: ${id}, scene: ${row.scene}, name: ${row.name}`,
          ip: req.ip || "unknown",
          created_at: new Date().toISOString(),
        });
      })
      .then(() => res.json({ message: "ok" }))
      .catch((error) => {
        console.error("更新提示词启用状态失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.delete("/admin/ai/prompts/:id", adminRequired, (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ message: "无效的 id" });

    db.getById("ai_prompts", id)
      .then((row) => {
        if (!row) return res.status(404).json({ message: "提示词不存在" });
        return db.query("DELETE FROM ai_prompts WHERE id = ?", [id]).then(() => row);
      })
      .then((row) => {
        if (!row) return;
        return db.insert("logs", {
          id: `log_${Date.now()}`,
          user_id: req.auth.uid,
          action: "删除提示词",
          module: "AI中心",
          content: `id: ${id}, scene: ${row.scene}, name: ${row.name}`,
          ip: req.ip || "unknown",
          created_at: new Date().toISOString(),
        });
      })
      .then(() => res.status(204).send())
      .catch((error) => {
        console.error("删除提示词失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 用户管理 ---
  router.get("/admin/users", adminRequired, (req, res) => {
    const sql = `
    SELECT u.*, 
           (SELECT COUNT(*) FROM products WHERE owner_id = u.id) as products,
           (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id OR seller_id = u.id) as orders
    FROM users u
  `;

    db.query(sql)
      .then((users) => {
        const list = users.map((u) => ({
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
          phone: u.phone,
          role: u.role,
          status: u.status,
          createdAt: u.created_at,
          products: u.products,
          orders: u.orders,
        }));
        res.json({ list });
      })
      .catch((error) => {
        console.error("获取用户列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.get("/admin/users/:userId/logs", adminRequired, (req, res) => {
    const userId = Number(req.params.userId);
    const limit = Math.min(Math.max(Number(req.query.limit || 50) || 50, 1), 200);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ message: "无效的 userId" });
    db.query("SELECT * FROM logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", [userId, limit])
      .then((list) => res.json({ list }))
      .catch((error) => {
        console.error("获取用户日志失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.get("/admin/users/:userId/complaints", adminRequired, (req, res) => {
    const userId = Number(req.params.userId);
    const limit = Math.min(Math.max(Number(req.query.limit || 50) || 50, 1), 200);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ message: "无效的 userId" });
    db.query("SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", [userId, limit])
      .then((list) => res.json({ list }))
      .catch((error) => {
        console.error("获取用户投诉失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.get("/admin/users/:userId/evaluations", adminRequired, (req, res) => {
    const userId = Number(req.params.userId);
    const limit = Math.min(Math.max(Number(req.query.limit || 50) || 50, 1), 200);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ message: "无效的 userId" });
    db.query(
      "SELECT * FROM evaluations WHERE user_id = ? OR target_id = ? ORDER BY created_at DESC LIMIT ?",
      [userId, userId, limit]
    )
      .then((list) => res.json({ list }))
      .catch((error) => {
        console.error("获取用户评价失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.post("/admin/users/:userId/password", adminRequired, async (req, res) => {
    const userId = Number(req.params.userId);
    const { newPassword } = req.body ?? {};
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ message: "无效的 userId" });
    if (!String(newPassword || "").trim() || String(newPassword).length < 6) {
      return res.status(400).json({ message: "newPassword 至少 6 位" });
    }
    try {
      const user = await db.getById("users", userId);
      if (!user) return res.status(404).json({ message: "用户不存在" });
      const password_hash = await hashPassword(newPassword);
      await db.update("users", userId, { password_hash });
      await db.insert("logs", {
        id: `log_${Date.now()}`,
        user_id: req.auth.uid,
        action: "重置用户密码",
        module: "用户管理",
        content: `用户ID: ${userId}, 昵称: ${user.nickname || "-"}`,
        ip: req.ip || "unknown",
        created_at: new Date().toISOString(),
      });
      return res.json({ message: "ok" });
    } catch (error) {
      console.error("重置用户密码失败:", error);
      return res.status(500).json({ message: "服务器内部错误" });
    }
  });

  router.get("/admin/users/:userId", adminRequired, (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: "无效的 userId" });
    }

    const userSql = `
      SELECT u.*,
             (SELECT COUNT(*) FROM products WHERE owner_id = u.id) as products,
             (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id OR seller_id = u.id) as orders,
             (SELECT COUNT(*) FROM favorites WHERE user_id = u.id) as favorites
      FROM users u
      WHERE u.id = ?
      LIMIT 1
    `;
    const productsSql = `
      SELECT p.*
      FROM products p
      WHERE p.owner_id = ?
      ORDER BY p.created_at DESC
      LIMIT 20
    `;
    const ordersSql = `
      SELECT o.*,
             p.title as product_title,
             p.price as product_price,
             u1.nickname as buyer_name,
             u2.nickname as seller_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users u1 ON o.buyer_id = u1.id
      LEFT JOIN users u2 ON o.seller_id = u2.id
      WHERE o.buyer_id = ? OR o.seller_id = ?
      ORDER BY o.created_at DESC
      LIMIT 20
    `;

    Promise.all([
      db.query(userSql, [userId]),
      db.query(productsSql, [userId]),
      db.query(ordersSql, [userId, userId]),
    ])
      .then(([userRows, products, orders]) => {
        const u = userRows?.[0] || null;
        if (!u) return res.status(404).json({ message: "用户不存在" });
        return res.json({
          user: {
            id: u.id,
            email: u.email,
            name: u.name,
            nickname: u.nickname,
            avatar: u.avatar,
            phone: u.phone,
            gender: u.gender,
            bio: u.bio,
            role: u.role,
            status: u.status,
            created_at: u.created_at,
          },
          stats: {
            products: u.products || 0,
            orders: u.orders || 0,
            favorites: u.favorites || 0,
          },
          products: products || [],
          orders: orders || [],
        });
      })
      .catch((error) => {
        console.error("获取用户详情失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/users/:userId/role", adminRequired, (req, res) => {
    const userId = Number(req.params.userId);
    const { role } = req.body ?? {};
    if (!role || (role !== "admin" && role !== "user")) {
      return res.status(400).json({ message: "role 必须为 admin 或 user" });
    }

    db.getById("users", userId)
      .then((user) => {
        if (!user) return res.status(404).json({ message: "用户不存在" });
        return db.update("users", userId, { role });
      })
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("更新用户角色失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/users/:userId/status", adminRequired, (req, res) => {
    const userId = Number(req.params.userId);
    const { status } = req.body ?? {};
    if (!status || (status !== "active" && status !== "banned")) {
      return res.status(400).json({ message: "status 必须为 active 或 banned" });
    }

    db.getById("users", userId)
      .then((user) => {
        if (!user) return res.status(404).json({ message: "用户不存在" });
        return db.update("users", userId, { status });
      })
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("更新用户状态失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/users/:userId/avatar", adminRequired, (req, res) => {
    const userId = Number(req.params.userId);
    const { avatar } = req.body ?? {};
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ message: "无效的 userId" });
    if (!String(avatar || "").trim()) return res.status(400).json({ message: "avatar 为必填" });

    db.getById("users", userId)
      .then((user) => {
        if (!user) return res.status(404).json({ message: "用户不存在" });
        return db.update("users", userId, { avatar: String(avatar).trim() }).then(() => user);
      })
      .then((user) => {
        if (!user) return;
        return db.insert("logs", {
          id: `log_${Date.now()}`,
          user_id: req.auth.uid,
          action: "修改用户头像",
          module: "用户管理",
          content: `用户ID: ${userId}, 昵称: ${user.nickname || "-"}`,
          ip: req.ip || "unknown",
          created_at: new Date().toISOString(),
        });
      })
      .then(() => res.json({ message: "ok" }))
      .catch((error) => {
        console.error("修改用户头像失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.get("/admin/stats", adminRequired, (_req, res) => {
    const statsSql = `
    SELECT
      (SELECT COUNT(*) FROM users) as totalUsers,
      (SELECT COUNT(*) FROM products) as totalProducts,
      (SELECT COUNT(*) FROM orders) as totalOrders,
      (SELECT COUNT(*) FROM favorites) as totalFavorites,
      (SELECT SUM(p.price) FROM orders o JOIN products p ON o.product_id = p.id) as totalAmount
  `;

    const topFavoritesSql = `
    SELECT p.id, p.title, COUNT(f.id) as favorites
    FROM products p
    LEFT JOIN favorites f ON p.id = f.product_id
    GROUP BY p.id, p.title
    ORDER BY favorites DESC
    LIMIT 10
  `;

    Promise.all([db.query(statsSql), db.query(topFavoritesSql)])
      .then(([statsResult, topFavoritesResult]) => {
        const stats = statsResult[0];
        const topFavoritedProducts = topFavoritesResult;

        res.json({
          stats: {
            totalUsers: stats.totalUsers || 0,
            totalProducts: stats.totalProducts || 0,
            totalOrders: stats.totalOrders || 0,
            totalFavorites: stats.totalFavorites || 0,
            totalAmount: stats.totalAmount || 0,
            topFavoritedProducts,
          },
        });
      })
      .catch((error) => {
        console.error("获取统计数据失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 公告管理 ---
  router.get("/admin/announcements", adminRequired, (_req, res) => {
    const sql = `
    SELECT * FROM announcements
    ORDER BY created_at DESC
  `;

    db.query(sql)
      .then((announcements) => {
        res.json({ list: announcements });
      })
      .catch((error) => {
        console.error("获取公告列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.post("/admin/announcements", adminRequired, (req, res) => {
    const { title, content, status = "published" } = req.body ?? {};
    if (!title || !content) return res.status(400).json({ message: "title 和 content 为必填" });

    const announcementData = {
      id: `ann_${Date.now()}`,
      title,
      content,
      isTop: false,
      status: status === "draft" ? "draft" : "published",
      created_at: new Date().toISOString(),
    };

    db.insert("announcements", announcementData)
      .then(() => {
        res.status(201).json({ item: announcementData });
      })
      .catch((error) => {
        console.error("创建公告失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.put("/admin/announcements/:id", adminRequired, (req, res) => {
    const { id } = req.params;
    const { title, content, status } = req.body ?? {};

    const checkSql = "SELECT * FROM announcements WHERE id = ?";
    db.query(checkSql, [id])
      .then((announcements) => {
        if (announcements.length === 0) {
          return res.status(404).json({ message: "公告不存在" });
        }

        const updateData = {};
        if (title != null) updateData.title = title;
        if (content != null) updateData.content = content;
        if (status != null) updateData.status = status === "draft" ? "draft" : "published";

        return db.update("announcements", id, updateData);
      })
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("更新公告失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/announcements/:id/top", adminRequired, (req, res) => {
    const { id } = req.params;
    const { isTop } = req.body ?? {};

    const checkSql = "SELECT * FROM announcements WHERE id = ?";
    db.query(checkSql, [id])
      .then((announcements) => {
        if (announcements.length === 0) {
          return res.status(404).json({ message: "公告不存在" });
        }
        return db.query("UPDATE announcements SET isTop = ? WHERE id = ?", [Boolean(isTop), id]);
      })
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("更新公告置顶状态失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.delete("/admin/announcements/:id", adminRequired, (req, res) => {
    const { id } = req.params;

    const checkSql = "SELECT * FROM announcements WHERE id = ?";
    db.query(checkSql, [id])
      .then((announcements) => {
        if (announcements.length === 0) {
          return res.status(404).json({ message: "公告不存在" });
        }
        return db.query("DELETE FROM announcements WHERE id = ?", [id]);
      })
      .then(() => {
        res.status(204).send();
      })
      .catch((error) => {
        console.error("删除公告失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 轮播图管理 ---
  router.get("/admin/banners", adminRequired, (_req, res) => {
    const sql = `
    SELECT * FROM banners
    ORDER BY sort ASC
  `;

    db.query(sql)
      .then((banners) => {
        res.json({ list: banners });
      })
      .catch((error) => {
        console.error("获取轮播图列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.post("/admin/banners", adminRequired, (req, res) => {
    const { title, image, link = "/products" } = req.body ?? {};
    if (!title || !image) return res.status(400).json({ message: "title 和 image 为必填" });

    const maxSortSql = "SELECT MAX(sort) as maxSort FROM banners";
    db.query(maxSortSql)
      .then((result) => {
        const maxSort = result[0].maxSort || 0;

        const item = {
          id: `ban_${Date.now()}`,
          title,
          image,
          link,
          sort: maxSort + 1,
          active: true,
          created_at: new Date().toISOString(),
        };

        return db.insert("banners", item).then(() => item);
      })
      .then((item) => {
        res.status(201).json({ item });
      })
      .catch((error) => {
        console.error("创建轮播图失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.put("/admin/banners/:id", adminRequired, (req, res) => {
    const { id } = req.params;
    const { title, image, link, sort } = req.body ?? {};

    const checkSql = "SELECT * FROM banners WHERE id = ?";
    db.query(checkSql, [id])
      .then((banners) => {
        if (banners.length === 0) {
          return res.status(404).json({ message: "轮播图不存在" });
        }

        const updateData = {};
        if (title != null) updateData.title = title;
        if (image != null) updateData.image = image;
        if (link != null) updateData.link = link;
        if (sort != null) updateData.sort = Number(sort);

        return db.update("banners", id, updateData);
      })
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("更新轮播图失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/banners/:id/status", adminRequired, (req, res) => {
    const { id } = req.params;
    const { active } = req.body ?? {};

    const checkSql = "SELECT * FROM banners WHERE id = ?";
    db.query(checkSql, [id])
      .then((banners) => {
        if (banners.length === 0) {
          return res.status(404).json({ message: "轮播图不存在" });
        }
        return db.query("UPDATE banners SET active = ? WHERE id = ?", [Boolean(active), id]);
      })
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("更新轮播图状态失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/banners/sort", adminRequired, (req, res) => {
    const { ids } = req.body ?? {};
    if (!Array.isArray(ids)) return res.status(400).json({ message: "ids 必须为数组" });

    const updatePromises = ids.map((id, idx) => {
      return db.query("UPDATE banners SET sort = ? WHERE id = ?", [idx + 1, id]);
    });

    Promise.all(updatePromises)
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("更新轮播图排序失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.delete("/admin/banners/:id", adminRequired, (req, res) => {
    const { id } = req.params;

    const checkSql = "SELECT * FROM banners WHERE id = ?";
    db.query(checkSql, [id])
      .then((banners) => {
        if (banners.length === 0) {
          return res.status(404).json({ message: "轮播图不存在" });
        }
        return db.query("DELETE FROM banners WHERE id = ?", [id]);
      })
      .then(() => {
        res.status(204).send();
      })
      .catch((error) => {
        console.error("删除轮播图失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 轮播图图片上传 ---
  router.post("/admin/banners/upload", adminRequired, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "file 为必填" });

    try {
      const folder = "banners";
      const originalName = req.file.originalname || "banner.bin";
      const ext = originalName.includes(".") ? originalName.split(".").pop() : "";
      const datePath = new Date().toISOString().slice(0, 10);
      const filename = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext ? `.${ext}` : ""}`;

      if (ossReady && s3Client) {
        const key = `${folder}/${datePath}/${filename}`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: OSS_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype || "application/octet-stream",
          }),
        );

        const publicBase = String(OSS_PUBLIC_BASE_URL || "").replace(/\/$/, "");
        const publicUrl = publicBase ? `${publicBase}/${OSS_BUCKET}/${key}` : null;
        const base = `${req.protocol}://${req.get("host")}`;
        const path = `/api/oss/object?key=${encodeURIComponent(key)}`;
        const proxyUrl = `${base}${path}`;

        return res.json({
          key,
          bucket: OSS_BUCKET,
          url: publicUrl || proxyUrl,
          path,
        });
      }

      const relativePath = path.posix.join(folder, datePath, filename);
      const absolutePath = path.join(UPLOADS_DIR, folder, datePath, filename);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, req.file.buffer);

      const base = `${req.protocol}://${req.get("host")}`;
      return res.json({
        url: `${base}/uploads/${relativePath.replace(/\\/g, "/")}`,
        path: `/uploads/${relativePath.replace(/\\/g, "/")}`,
      });
    } catch (error) {
      console.error("轮播图上传失败:", error);
      return res.status(500).json({ message: "上传失败" });
    }
  });

  // --- Admin: 分类管理 ---
  router.get("/admin/categories", adminRequired, (_req, res) => {
    const sql = `
    SELECT * FROM categories
    ORDER BY sort ASC
  `;

    db.query(sql)
      .then((categories) => {
        res.json({ list: categories });
      })
      .catch((error) => {
        console.error("获取分类列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.post("/admin/categories", adminRequired, (req, res) => {
    const { name, parentId = null, enabled = true } = req.body ?? {};
    if (!name) return res.status(400).json({ message: "name 为必填" });

    const maxSortSql = "SELECT MAX(sort) as maxSort FROM categories WHERE parentId = ?";
    db.query(maxSortSql, [parentId])
      .then((result) => {
        const maxSort = result[0].maxSort || 0;
        const sort = maxSort + 1;

        const item = {
          id: `cat_${Date.now()}`,
          name,
          parentId,
          sort,
          enabled: Boolean(enabled),
        };

        return db.insert("categories", item).then(() => item);
      })
      .then((item) => {
        res.status(201).json({ item });
      })
      .catch((error) => {
        console.error("创建分类失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.put("/admin/categories/:id", adminRequired, (req, res) => {
    const { id } = req.params;
    const { name, enabled } = req.body ?? {};

    const checkSql = "SELECT * FROM categories WHERE id = ?";
    db.query(checkSql, [id])
      .then((categories) => {
        if (categories.length === 0) {
          return res.status(404).json({ message: "分类不存在" });
        }

        const updateData = {};
        if (name != null) updateData.name = name;
        if (enabled != null) updateData.enabled = Boolean(enabled);

        return db.update("categories", id, updateData);
      })
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("更新分类失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.delete("/admin/categories/:id", adminRequired, (req, res) => {
    const { id } = req.params;

    db.query("SELECT COUNT(*) as count FROM categories WHERE parentId = ?", [id])
      .then((result) => {
        if (result[0].count > 0) {
          return res.status(400).json({ message: "存在子分类，无法删除" });
        }

        return db.query("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [id]).then((result) => {
          if (result[0].count > 0) {
            return res.status(400).json({ message: "分类已被商品使用，无法删除" });
          }
          return db.query("DELETE FROM categories WHERE id = ?", [id]);
        });
      })
      .then(() => {
        res.status(204).send();
      })
      .catch((error) => {
        console.error("删除分类失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // 商品审核功能已移除

  // --- Admin: 字典管理 ---
  router.get("/admin/dicts/:type", adminRequired, (req, res) => {
    const type = String(req.params.type || "").trim();
    if (!type) return res.status(400).json({ message: "type 为必填" });
    db.query("SELECT * FROM dict_items WHERE dict_type = ? ORDER BY sort ASC", [type])
      .then((list) => res.json({ list }))
      .catch((error) => {
        console.error("获取字典列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.post("/admin/dicts/:type", adminRequired, (req, res) => {
    const type = String(req.params.type || "").trim();
    const { value, label, enabled } = req.body ?? {};
    if (!type) return res.status(400).json({ message: "type 为必填" });
    if (!String(value || "").trim() || !String(label || "").trim()) {
      return res.status(400).json({ message: "value/label 为必填" });
    }

    const maxSortSql = "SELECT MAX(sort) as maxSort FROM dict_items WHERE dict_type = ?";
    db.query(maxSortSql, [type])
      .then((rows) => {
        const maxSort = Number(rows?.[0]?.maxSort ?? 0) || 0;
        const item = {
          id: `dict_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
          dict_type: type,
          value: String(value).trim(),
          label: String(label).trim(),
          sort: maxSort + 1,
          enabled: enabled == null ? true : Boolean(enabled),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return db.insert("dict_items", item).then(() => item);
      })
      .then((item) => res.status(201).json({ item }))
      .catch((error) => {
        console.error("创建字典项失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.put("/admin/dicts/:type/:id", adminRequired, (req, res) => {
    const type = String(req.params.type || "").trim();
    const id = String(req.params.id || "").trim();
    const { value, label, enabled, sort } = req.body ?? {};
    if (!type || !id) return res.status(400).json({ message: "type/id 为必填" });

    db.query("SELECT * FROM dict_items WHERE id = ? AND dict_type = ? LIMIT 1", [id, type])
      .then((rows) => {
        const item = rows?.[0];
        if (!item) return res.status(404).json({ message: "字典项不存在" });
        const updateData = {};
        if (value != null) updateData.value = String(value).trim();
        if (label != null) updateData.label = String(label).trim();
        if (enabled != null) updateData.enabled = Boolean(enabled);
        if (sort != null) updateData.sort = Number(sort);
        updateData.updated_at = new Date().toISOString();
        return db.update("dict_items", id, updateData);
      })
      .then(() => res.json({ message: "ok" }))
      .catch((error) => {
        console.error("更新字典项失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/dicts/:type/sort", adminRequired, (req, res) => {
    const type = String(req.params.type || "").trim();
    const { ids } = req.body ?? {};
    if (!type) return res.status(400).json({ message: "type 为必填" });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids 必须为数组" });
    Promise.all(
      ids.map((id, idx) =>
        db.query("UPDATE dict_items SET sort = ?, updated_at = ? WHERE id = ? AND dict_type = ?", [
          idx + 1,
          new Date().toISOString(),
          id,
          type,
        ])
      )
    )
      .then(() => res.json({ message: "ok" }))
      .catch((error) => {
        console.error("排序字典项失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.delete("/admin/dicts/:type/:id", adminRequired, (req, res) => {
    const type = String(req.params.type || "").trim();
    const id = String(req.params.id || "").trim();
    if (!type || !id) return res.status(400).json({ message: "type/id 为必填" });
    db.query("DELETE FROM dict_items WHERE id = ? AND dict_type = ?", [id, type])
      .then(() => res.status(204).send())
      .catch((error) => {
        console.error("删除字典项失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 商品管理 ---
  router.get("/admin/products", adminRequired, (req, res) => {
    const { status, keyword } = req.query;

    let sql = `
    SELECT p.*, u.nickname as seller_name, u.id as seller_id
    FROM products p
    LEFT JOIN users u ON p.owner_id = u.id
  `;

    const params = [];
    const whereClause = [];

    if (status) {
      whereClause.push("p.status = ?");
      params.push(status);
    } else {
      // 默认不返回已删除
      whereClause.push("p.status <> 'deleted'");
    }

    if (keyword) {
      whereClause.push("(p.title LIKE ? OR p.description LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (whereClause.length > 0) {
      sql += " WHERE " + whereClause.join(" AND ");
    }

    sql += " ORDER BY p.created_at DESC";

    db.query(sql, params)
      .then((products) => {
        res.json({ list: products });
      })
      .catch((error) => {
        console.error("获取商品列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.get("/admin/products/:id", adminRequired, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "无效的商品ID" });
    }

    const sql = `
      SELECT p.*, u.nickname as seller_name, u.id as seller_id
      FROM products p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
      LIMIT 1
    `;

    db.query(sql, [id])
      .then((rows) => {
        const p = rows?.[0] || null;
        if (!p) return res.status(404).json({ message: "商品不存在" });
        return res.json({ item: p });
      })
      .catch((error) => {
        console.error("获取商品详情失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.put("/admin/products/:id", adminRequired, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "无效的商品ID" });
    }

    const payload = req.body ?? {};
    const {
      title,
      description,
      price,
      image_url,
      condition,
      category_id,
      campus,
      reject_reason,
      images,
    } = payload;

    db.getById("products", id)
      .then((p) => {
        if (!p) return res.status(404).json({ message: "商品不存在" });
        if (p.status === "deleted") return res.status(400).json({ message: "商品已删除" });

        const updateData = {};
        if (title != null) updateData.title = String(title);
        if (description != null) updateData.description = String(description);
        if (price != null) updateData.price = price;
        if (image_url != null) updateData.image_url = String(image_url);
        if (condition != null) updateData.condition = String(condition);
        if (category_id != null) updateData.category_id = String(category_id);
        if (campus != null) updateData.campus = String(campus);
        if (reject_reason != null) updateData.reject_reason = String(reject_reason);

        // images 字段：优先使用传入的 images，其次在 image_url 变更时同步为单图数组
        if (images != null) {
          updateData.images = Array.isArray(images) ? JSON.stringify(images) : images;
        } else if (image_url != null) {
          updateData.images = JSON.stringify([String(image_url)]);
        }

        updateData.updated_at = new Date().toISOString();

        return db.update("products", id, updateData).then(() => p);
      })
      .then((p) => {
        if (!p || !p.id) return;
        return db.insert("logs", {
          id: `log_${Date.now()}`,
          user_id: req.auth.uid,
          action: "编辑商品",
          module: "商品管理",
          content: `商品ID: ${p.id}, 商品名称: ${p.title}`,
          ip: req.ip || "unknown",
          created_at: new Date().toISOString(),
        });
      })
      .then(() => res.json({ message: "ok" }))
      .catch((error) => {
        console.error("更新商品失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/products/:id/status", adminRequired, (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};
    if (!["approved", "down", "deleted"].includes(status)) {
      return res.status(400).json({ message: "status 必须为 approved/down/deleted" });
    }

    db.getById("products", id)
      .then((p) => {
        if (!p) return res.status(404).json({ message: "商品不存在" });
        return db
          .update("products", id, { status, updated_at: new Date().toISOString() })
          .then(() => p);
      })
      .then((p) => {
        const actionText = status === "approved" ? "上架" : status === "down" ? "下架/隐藏" : "删除";
        return db.insert("logs", {
          id: `log_${Date.now()}`,
          user_id: req.auth.uid,
          action: `商品${actionText}`,
          module: "商品管理",
          content: `商品ID: ${p.id}, 商品名称: ${p.title}`,
          ip: req.ip || "unknown",
          created_at: new Date().toISOString(),
        });
      })
      .then(() => res.json({ message: "ok" }))
      .catch((error) => {
        console.error("更新商品状态失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 订单全量管理 ---
  router.get("/admin/orders", adminRequired, (req, res) => {
    const { status, keyword } = req.query;

    let sql = `
    SELECT o.*, 
           p.title as product_title, 
           p.price as product_price, 
           u1.nickname as buyer_name, 
           u2.nickname as seller_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users u1 ON o.buyer_id = u1.id
    LEFT JOIN users u2 ON o.seller_id = u2.id
  `;

    const params = [];
    const whereClause = [];

    if (status) {
      whereClause.push("o.status = ?");
      params.push(status);
    }

    if (keyword) {
      whereClause.push("(o.orderNo LIKE ? OR p.title LIKE ? OR u1.nickname LIKE ? OR u2.nickname LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (whereClause.length > 0) {
      sql += " WHERE " + whereClause.join(" AND ");
    }

    sql += " ORDER BY o.created_at DESC";

    db.query(sql, params)
      .then((orders) => {
        res.json({ list: orders });
      })
      .catch((error) => {
        console.error("获取订单列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 投诉与纠纷处理 ---
  router.get("/admin/complaints", adminRequired, (req, res) => {
    const { status, type } = req.query;

    let sql = `
    SELECT c.*, 
           u.nickname as user_name
    FROM complaints c
    LEFT JOIN users u ON c.user_id = u.id
  `;

    const params = [];
    const whereClause = [];

    if (status) {
      whereClause.push("c.status = ?");
      params.push(status);
    }

    if (type) {
      whereClause.push("c.type = ?");
      params.push(type);
    }

    if (whereClause.length > 0) {
      sql += " WHERE " + whereClause.join(" AND ");
    }

    sql += " ORDER BY c.created_at DESC";

    db.query(sql, params)
      .then((complaints) => {
        res.json({ list: complaints });
      })
      .catch((error) => {
        console.error("获取投诉列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  router.patch("/admin/complaints/:id/handle", adminRequired, (req, res) => {
    const id = Number(req.params.id);
    const { status, result } = req.body ?? {};

    if (!status || !result) {
      return res.status(400).json({ message: "status 和 result 为必填" });
    }

    db.getById("complaints", id)
      .then((complaint) => {
        if (!complaint) return res.status(404).json({ message: "投诉不存在" });

        const updateData = {
          status,
          result,
          updated_at: new Date().toISOString(),
        };

        return db.update("complaints", id, updateData).then(() => complaint);
      })
      .then((complaint) => {
        const notification = {
          id: `notif_${Date.now()}`,
          user_id: complaint.user_id,
          type: "complaint_result",
          title: "投诉处理结果",
          content: `您的投诉已处理：${result}`,
          is_read: false,
          created_at: new Date().toISOString(),
          complaint_id: complaint.id,
        };

        return db.insert("notifications", notification).then(() => complaint);
      })
      .then((complaint) => {
        const log = {
          id: `log_${Date.now()}`,
          user_id: req.auth.uid,
          action: "处理投诉",
          module: "投诉管理",
          content: `投诉ID: ${complaint.id}, 处理结果: ${result}`,
          ip: req.ip || "unknown",
          created_at: new Date().toISOString(),
        };

        return db.insert("logs", log);
      })
      .then(() => {
        res.json({ message: "ok" });
      })
      .catch((error) => {
        console.error("处理投诉失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 操作日志管理 ---
  router.get("/admin/logs", adminRequired, (req, res) => {
    const { action, module, startDate, endDate } = req.query;

    let sql = `
    SELECT l.*, 
           u.nickname as user_name
    FROM logs l
    LEFT JOIN users u ON l.user_id = u.id
  `;

    const params = [];
    const whereClause = [];

    if (action) {
      whereClause.push("l.action LIKE ?");
      params.push(`%${action}%`);
    }

    if (module) {
      whereClause.push("l.module LIKE ?");
      params.push(`%${module}%`);
    }

    if (startDate) {
      whereClause.push("l.created_at >= ?");
      params.push(startDate);
    }

    if (endDate) {
      whereClause.push("l.created_at <= ?");
      params.push(endDate);
    }

    if (whereClause.length > 0) {
      sql += " WHERE " + whereClause.join(" AND ");
    }

    sql += " ORDER BY l.created_at DESC";

    db.query(sql, params)
      .then((logs) => {
        res.json({ list: logs });
      })
      .catch((error) => {
        console.error("获取操作日志失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 评价与内容审核 ---
  router.get("/admin/evaluations", adminRequired, (_req, res) => {
    const sql = `
    SELECT e.*, 
           u1.nickname as user_name, 
           u2.nickname as target_name,
           o.orderNo as order_no
    FROM evaluations e
    LEFT JOIN users u1 ON e.user_id = u1.id
    LEFT JOIN users u2 ON e.target_id = u2.id
    LEFT JOIN orders o ON e.order_id = o.id
    ORDER BY e.created_at DESC
  `;

    db.query(sql)
      .then((evaluations) => {
        res.json({ list: evaluations });
      })
      .catch((error) => {
        console.error("获取评价列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  // --- Admin: 物品收藏管理 ---
  router.get("/admin/favorites", adminRequired, (req, res) => {
    const { product_id, user_id } = req.query;

    let sql = `
    SELECT f.*, 
           u.nickname as user_name, 
           p.title as product_title,
           p.price as product_price
    FROM favorites f
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN products p ON f.product_id = p.id
  `;

    const params = [];
    const whereClause = [];

    if (product_id) {
      whereClause.push("f.product_id = ?");
      params.push(product_id);
    }

    if (user_id) {
      whereClause.push("f.user_id = ?");
      params.push(user_id);
    }

    if (whereClause.length > 0) {
      sql += " WHERE " + whereClause.join(" AND ");
    }

    sql += " ORDER BY f.created_at DESC";

    db.query(sql, params)
      .then((favorites) => {
        res.json({ list: favorites });
      })
      .catch((error) => {
        console.error("获取收藏列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      });
  });

  return router;
}

