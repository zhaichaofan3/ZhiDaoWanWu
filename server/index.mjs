import express from "express";
import cors from "cors";
import { mysqlDb } from "./db-mysql.mjs";
import crypto from "node:crypto";

const app = express();
const PORT = process.env.PORT || 4000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || "dev-token-secret";
const PASSWORD_SALT = "secondhand-salt";

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString();
}

function createToken(payload) {
  // 这里用一个轻量 token 实现（非生产级 JWT），仅用于项目开发联调
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天
  const body = { ...payload, exp };
  const tokenBody = base64UrlEncode(JSON.stringify(body));
  const sig = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(tokenBody)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${tokenBody}.${sig}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [tokenBody, sig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(tokenBody)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(tokenBody));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPasswordMD5(password) {
  return `md5:${crypto.createHash("md5").update(`${PASSWORD_SALT}:${password}`).digest("hex")}`;
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const m = String(header).match(/^Bearer (.+)$/i);
  const token = m?.[1] || "";
  const payload = verifyToken(token);
  if (!payload?.uid) return res.status(401).json({ message: "未登录或 token 无效" });

  // 从数据库获取用户信息
  mysqlDb.getById('users', payload.uid).then((user) => {
    if (!user) return res.status(401).json({ message: "用户不存在" });
    if (user.status === "banned") return res.status(403).json({ message: "账号已封禁" });

    req.auth = { uid: user.id, role: user.role, user };
    next();
  }).catch((error) => {
    console.error('获取用户信息失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
}

function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.auth.role !== "admin") return res.status(403).json({ message: "需要管理员权限" });
    next();
  });
}

app.use(cors());
app.use(express.json());

// 初始化数据库
mysqlDb.initDatabase();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/login", (req, res) => {
  const { account, email, studentId, password } = req.body ?? {};
  const loginKey = account || email || studentId;
  if (!loginKey || !password) {
    return res.status(400).json({ message: "account(或email/学号) 和 password 为必填" });
  }

  // 从数据库获取用户信息
  let sql, params;
  if (loginKey.includes("@")) {
    sql = "SELECT * FROM users WHERE email = ?";
    params = [loginKey];
  } else {
    sql = "SELECT * FROM users WHERE studentId = ? OR phone = ?";
    params = [loginKey, loginKey];
  }

  mysqlDb.query(sql, params).then((users) => {
    const user = users[0];
    if (!user) return res.status(401).json({ message: "账号或密码不正确" });
    if (user.status === "banned") return res.status(403).json({ message: "账号已封禁" });

    const ok = user.password_hash === "demo" || user.password_hash === password || user.password_hash === hashPasswordMD5(password);

    if (!ok) return res.status(401).json({ message: "账号或密码不正确" });

    const token = createToken({ uid: user.id, role: user.role });
    res.json({
      user: { id: user.id, nickname: user.nickname, role: user.role, studentId: user.studentId },
      token,
    });
  }).catch((error) => {
    console.error('登录失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.post("/api/auth/register", (req, res) => {
  const {
    nickname,
    studentId,
    phone,
    password,
    gender,
    grade,
    major,
    bio,
    avatar,
  } = req.body ?? {};

  if (!nickname || !studentId || !password) {
    return res.status(400).json({ message: "nickname、studentId 和 password 为必填" });
  }

  // 检查学号或手机号是否已存在
  let checkSql, checkParams;
  if (phone) {
    checkSql = "SELECT * FROM users WHERE studentId = ? OR phone = ?";
    checkParams = [studentId, phone];
  } else {
    checkSql = "SELECT * FROM users WHERE studentId = ?";
    checkParams = [studentId];
  }

  mysqlDb.query(checkSql, checkParams).then((users) => {
    if (users.length > 0) {
      return res.status(409).json({ message: "学号或手机号已存在" });
    }

    // 创建新用户
    const userData = {
      email: "",
      name: nickname,
      nickname,
      avatar: avatar || "",
      phone: phone || "",
      studentId,
      gender: gender || "other",
      grade: grade || "",
      major: major || "",
      bio: bio || "",
      role: "user",
      status: "active",
      password_hash: hashPasswordMD5(password),
      created_at: new Date().toISOString(),
    };

    return mysqlDb.insert('users', userData);
  }).then((userId) => {
    const token = createToken({ uid: userId, role: "user" });
    res.status(201).json({
      user: { id: userId, nickname, role: "user", studentId },
      token,
    });
  }).catch((error) => {
    console.error('注册失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  const u = req.auth.user;
  res.json({
    user: {
      id: u.id,
      nickname: u.nickname,
      avatar: u.avatar,
      phone: u.phone,
      studentId: u.studentId,
      gender: u.gender,
      grade: u.grade,
      major: u.major,
      bio: u.bio,
      role: u.role,
    },
  });
});

app.get("/api/products", (_req, res) => {
  // 从数据库获取商品列表
  const sql = `
    SELECT p.*, u.name as owner_name
    FROM products p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.status <> 'deleted'
    ORDER BY p.created_at DESC
  `;

  mysqlDb.query(sql).then((products) => {
    res.json(products);
  }).catch((error) => {
    console.error('获取商品列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  
  // 从数据库获取商品详情
  const sql = `
    SELECT p.*, u.name as owner_name
    FROM products p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `;

  mysqlDb.query(sql, [id]).then((products) => {
    const product = products[0];
    if (!product) {
      return res.status(404).json({ message: "商品不存在" });
    }
    res.json(product);
  }).catch((error) => {
    console.error('获取商品详情失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.post("/api/products", authRequired, (req, res) => {
  const { title, description, price, image_url, condition, category_id, campus } = req.body ?? {};
  if (!title || price == null || !condition || !category_id || !campus) {
    return res.status(400).json({ message: "title, price, condition, category_id, campus 为必填" });
  }

  // 创建商品
  const productData = {
    title,
    description: description ?? "",
    price,
    image_url: image_url ?? "",
    images: image_url ? JSON.stringify([image_url]) : null,
    condition,
    category_id,
    campus,
    owner_id: req.auth.uid,
    status: "pending", // 待审核
    created_at: new Date().toISOString(),
    views: 0,
    favorites: 0,
  };

  mysqlDb.insert('products', productData).then((productId) => {
    const product = {
      ...productData,
      id: productId,
    };
    res.status(201).json(product);
  }).catch((error) => {
    console.error('创建商品失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.put("/api/products/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const { title, description, price, image_url, condition, category_id, campus } = req.body ?? {};
  
  // 从数据库获取商品信息
  mysqlDb.getById('products', id).then((product) => {
    if (!product) {
      return res.status(404).json({ message: "商品不存在" });
    }
    
    if (product.owner_id !== req.auth.uid) {
      return res.status(403).json({ message: "无权限修改此商品" });
    }
    
    if (product.status === "approved" || product.status === "pending") {
      return res.status(400).json({ message: "仅可编辑审核驳回、已下架的商品" });
    }
    
    // 更新商品信息
    const updateData = {};
    if (title != null) updateData.title = title;
    if (description != null) updateData.description = description;
    if (price != null) updateData.price = price;
    if (image_url != null) {
      updateData.image_url = image_url;
      updateData.images = JSON.stringify([image_url]);
    }
    if (condition != null) updateData.condition = condition;
    if (category_id != null) updateData.category_id = category_id;
    if (campus != null) updateData.campus = campus;
    updateData.status = "pending"; // 重新进入审核流程
    updateData.updated_at = new Date().toISOString();
    
    return mysqlDb.update('products', id, updateData);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新商品失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/products/:id/status", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};
  
  // 从数据库获取商品信息
  mysqlDb.getById('products', id).then((product) => {
    if (!product) {
      return res.status(404).json({ message: "商品不存在" });
    }
    
    if (product.owner_id !== req.auth.uid) {
      return res.status(403).json({ message: "无权限修改此商品" });
    }
    
    if (status === "up" && (product.status === "approved" || product.status === "pending")) {
      // 更新商品状态
      return mysqlDb.update('products', id, {
        status: "approved",
        updated_at: new Date().toISOString(),
      });
    } else if (status === "down" && product.status === "approved") {
      // 检查是否有进行中的订单
      const checkSql = "SELECT * FROM orders WHERE product_id = ? AND status NOT IN ('completed', 'cancelled')";
      return mysqlDb.query(checkSql, [id]).then((orders) => {
        if (orders.length > 0) {
          return res.status(400).json({ message: "有进行中订单的商品不可下架" });
        }
        // 更新商品状态
        return mysqlDb.update('products', id, {
          status: "down",
          updated_at: new Date().toISOString(),
        });
      });
    } else {
      return res.status(400).json({ message: "无效的状态变更" });
    }
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新商品状态失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.delete("/api/products/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  
  // 从数据库获取商品信息
  mysqlDb.getById('products', id).then((product) => {
    if (!product) {
      return res.status(404).json({ message: "商品不存在" });
    }
    
    if (product.owner_id !== req.auth.uid) {
      return res.status(403).json({ message: "无权限删除此商品" });
    }
    
    if (product.status === "approved" || product.status === "pending") {
      return res.status(400).json({ message: "仅可删除已下架、审核驳回的商品" });
    }
    
    // 检查是否有进行中的订单
    const checkSql = "SELECT * FROM orders WHERE product_id = ? AND status NOT IN ('completed', 'cancelled')";
    return mysqlDb.query(checkSql, [id]).then((orders) => {
      if (orders.length > 0) {
        return res.status(400).json({ message: "有进行中订单的商品不可删除" });
      }
      
      // 删除相关的收藏
      const deleteFavoritesSql = "DELETE FROM favorites WHERE product_id = ?";
      return mysqlDb.query(deleteFavoritesSql, [id]).then(() => {
        // 删除商品
        return mysqlDb.delete('products', id);
      });
    });
  }).then(() => {
    res.status(204).send();
  }).catch((error) => {
    console.error('删除商品失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.get("/api/users/:userId/favorites", (req, res) => {
  const userId = Number(req.params.userId);
  
  // 从数据库获取收藏列表
  const sql = `
    SELECT f.id, f.created_at, f.product_id, p.title, p.price, p.image_url
    FROM favorites f
    LEFT JOIN products p ON f.product_id = p.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `;

  mysqlDb.query(sql, [userId]).then((favorites) => {
    res.json(favorites);
  }).catch((error) => {
    console.error('获取收藏列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.post("/api/users/:userId/favorites", (req, res) => {
  const userId = Number(req.params.userId);
  const { product_id } = req.body ?? {};

  if (!product_id) {
    return res.status(400).json({ message: "product_id 为必填" });
  }

  // 检查是否已经收藏
  const checkSql = "SELECT * FROM favorites WHERE user_id = ? AND product_id = ?";
  mysqlDb.query(checkSql, [userId, product_id]).then((favorites) => {
    if (favorites.length === 0) {
      // 创建收藏
      const favoriteData = {
        user_id: userId,
        product_id,
        created_at: new Date().toISOString(),
      };
      return mysqlDb.insert('favorites', favoriteData);
    }
    return null;
  }).then(() => {
    res.status(201).json({ message: "ok" });
  }).catch((error) => {
    console.error('创建收藏失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.delete("/api/users/:userId/favorites/:productId", (req, res) => {
  const userId = Number(req.params.userId);
  const productId = Number(req.params.productId);
  
  // 删除收藏
  const deleteSql = "DELETE FROM favorites WHERE user_id = ? AND product_id = ?";
  mysqlDb.query(deleteSql, [userId, productId]).then(() => {
    res.status(204).send();
  }).catch((error) => {
    console.error('删除收藏失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.put("/api/users/me/profile", authRequired, (req, res) => {
  const meId = req.auth.uid;
  const body = req.body ?? {};
  const fields = {
    nickname: body.nickname,
    avatar: body.avatar,
    gender: body.gender,
    grade: body.grade,
    major: body.major,
    bio: body.bio,
  };

  if (!fields.nickname || !String(fields.nickname).trim()) {
    return res.status(400).json({ message: "nickname 为必填" });
  }

  // 检查昵称是否已存在
  const checkSql = "SELECT * FROM users WHERE nickname = ? AND id != ?";
  mysqlDb.query(checkSql, [fields.nickname, meId]).then((users) => {
    if (users.length > 0) {
      return res.status(409).json({ message: "昵称已存在" });
    }

    // 更新用户信息
    return mysqlDb.update('users', meId, fields);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新用户信息失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.put("/api/users/me/password", authRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body ?? {};
  if (!oldPassword || !newPassword) return res.status(400).json({ message: "oldPassword 和 newPassword 为必填" });
  if (oldPassword === newPassword) return res.status(400).json({ message: "新密码不能与旧密码相同" });

  const meId = req.auth.uid;
  
  // 从数据库获取用户信息
  mysqlDb.getById('users', meId).then((user) => {
    if (!user) return res.status(404).json({ message: "用户不存在" });

    const ok = user.password_hash === "demo" || user.password_hash === oldPassword || user.password_hash === hashPasswordMD5(oldPassword);
    if (!ok) return res.status(401).json({ message: "旧密码不正确" });

    // 更新密码
    return mysqlDb.update('users', meId, {
      password_hash: hashPasswordMD5(newPassword),
    });
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新密码失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// 地址：先做基础版（增删改/默认地址）
app.get("/api/users/me/addresses", authRequired, (req, res) => {
  const userId = req.auth.uid;
  
  // 从数据库获取地址列表
  const sql = `
    SELECT * FROM addresses
    WHERE user_id = ?
    ORDER BY isDefault DESC, created_at DESC
  `;

  mysqlDb.query(sql, [userId]).then((addresses) => {
    res.json({ list: addresses });
  }).catch((error) => {
    console.error('获取地址列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.post("/api/users/me/addresses", authRequired, (req, res) => {
  const userId = req.auth.uid;
  const { contact, phone, campus, building, detail, isDefault } = req.body ?? {};
  
  if (!contact || !phone || !campus || !building || !detail) {
    return res.status(400).json({ message: "contact、phone、campus、building、detail 为必填" });
  }
  
  // 检查地址数量
  const countSql = "SELECT COUNT(*) as count FROM addresses WHERE user_id = ?";
  mysqlDb.query(countSql, [userId]).then((result) => {
    if (result[0].count >= 10) {
      return res.status(400).json({ message: "最多保存 10 个收货地址" });
    }
    
    // 如果是默认地址，先将其他地址设置为非默认
    if (isDefault) {
      const updateSql = "UPDATE addresses SET isDefault = false WHERE user_id = ?";
      return mysqlDb.query(updateSql, [userId]).then(() => true);
    }
    return true;
  }).then(() => {
    // 创建地址
    const addressData = {
      user_id: userId,
      contact,
      phone,
      campus,
      building,
      detail,
      isDefault: Boolean(isDefault),
      created_at: new Date().toISOString(),
    };
    return mysqlDb.insert('addresses', addressData);
  }).then((addressId) => {
    const address = {
      id: addressId,
      user_id: userId,
      contact,
      phone,
      campus,
      building,
      detail,
      isDefault: Boolean(isDefault),
      created_at: new Date().toISOString(),
    };
    res.status(201).json({ message: "ok", address });
  }).catch((error) => {
    console.error('创建地址失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.delete("/api/users/me/addresses/:id", authRequired, (req, res) => {
  const userId = req.auth.uid;
  const addressId = Number(req.params.id);
  
  // 删除地址
  const deleteSql = "DELETE FROM addresses WHERE user_id = ? AND id = ?";
  mysqlDb.query(deleteSql, [userId, addressId]).then(() => {
    res.status(204).send();
  }).catch((error) => {
    console.error('删除地址失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/users/me/addresses/:id/default", authRequired, (req, res) => {
  const userId = req.auth.uid;
  const addressId = Number(req.params.id);
  
  // 检查地址是否存在
  mysqlDb.getById('addresses', addressId).then((address) => {
    if (!address || address.user_id !== userId) {
      return res.status(404).json({ message: "地址不存在" });
    }
    
    // 将所有地址设置为非默认
    const updateSql1 = "UPDATE addresses SET isDefault = false WHERE user_id = ?";
    return mysqlDb.query(updateSql1, [userId]).then(() => {
      // 将指定地址设置为默认
      const updateSql2 = "UPDATE addresses SET isDefault = true WHERE id = ?";
      return mysqlDb.query(updateSql2, [addressId]);
    });
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('设置默认地址失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Public: 公告/轮播图/分类（给前台使用） ---
app.get("/api/announcements", (_req, res) => {
  // 从数据库获取公告列表
  const sql = `
    SELECT * FROM announcements
    WHERE status = 'published'
    ORDER BY isTop DESC, created_at DESC
  `;

  mysqlDb.query(sql).then((announcements) => {
    res.json({ list: announcements });
  }).catch((error) => {
    console.error('获取公告列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.get("/api/banners", (_req, res) => {
  // 从数据库获取轮播图列表
  const sql = `
    SELECT * FROM banners
    WHERE active = true
    ORDER BY sort ASC
  `;

  mysqlDb.query(sql).then((banners) => {
    res.json({ list: banners });
  }).catch((error) => {
    console.error('获取轮播图列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.get("/api/categories", (_req, res) => {
  // 从数据库获取分类列表
  const sql = `
    SELECT * FROM categories
    WHERE enabled = true
    ORDER BY sort ASC
  `;

  mysqlDb.query(sql).then((categories) => {
    res.json({ list: categories });
  }).catch((error) => {
    console.error('获取分类列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.post("/api/orders", authRequired, (req, res) => {
  const { product_id, deliveryAddress, deliveryTime } = req.body ?? {};
  if (!product_id || !deliveryAddress || !deliveryTime) {
    return res.status(400).json({ message: "product_id, deliveryAddress, deliveryTime 为必填" });
  }

  const buyerId = req.auth.uid;
  
  // 从数据库获取商品信息
  mysqlDb.getById('products', product_id).then((product) => {
    if (!product) {
      return res.status(404).json({ message: "商品不存在" });
    }
    
    if (product.status !== "approved") {
      return res.status(400).json({ message: "商品不可购买" });
    }
    
    if (product.owner_id === buyerId) {
      return res.status(400).json({ message: "不能购买自己的商品" });
    }
    
    // 检查是否已有进行中的订单
    const checkSql = "SELECT * FROM orders WHERE product_id = ? AND status NOT IN ('completed', 'cancelled')";
    return mysqlDb.query(checkSql, [product_id]).then((orders) => {
      if (orders.length > 0) {
        return res.status(400).json({ message: "商品已被下单" });
      }
      
      // 生成订单号
      const orderNo = `TX${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(Date.now()).slice(-3).padStart(3, "0")}`;
      
      // 创建订单
      const orderData = {
        orderNo,
        buyer_id: buyerId,
        seller_id: product.owner_id,
        product_id,
        status: "pending",
        amount: product.price,
        deliveryAddress,
        deliveryTime,
        timeline: JSON.stringify([{
          content: "订单创建成功",
          time: new Date().toISOString()
        }]),
        created_at: new Date().toISOString(),
      };
      
      return mysqlDb.insert('orders', orderData);
    });
  }).then((orderId) => {
    // 获取创建的订单
    return mysqlDb.getById('orders', orderId);
  }).then((order) => {
    res.status(201).json(order);
  }).catch((error) => {
    console.error('创建订单失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.get("/api/users/me/orders", authRequired, (req, res) => {
  const userId = req.auth.uid;
  
  // 获取买家订单
  const buyerSql = `
    SELECT o.*, p.title, p.price, p.image_url, u.id as seller_id, u.nickname as seller_nickname, u.avatar as seller_avatar
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users u ON o.seller_id = u.id
    WHERE o.buyer_id = ?
  `;
  
  // 获取卖家订单
  const sellerSql = `
    SELECT o.*, p.title, p.price, p.image_url, u.id as buyer_id, u.nickname as buyer_nickname, u.avatar as buyer_avatar
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users u ON o.buyer_id = u.id
    WHERE o.seller_id = ?
  `;
  
  Promise.all([
    mysqlDb.query(buyerSql, [userId]),
    mysqlDb.query(sellerSql, [userId])
  ]).then(([buyerOrders, sellerOrders]) => {
    // 处理买家订单
    const formattedBuyerOrders = buyerOrders.map((order) => ({
      ...order,
      product: {
        id: order.product_id,
        title: order.title,
        price: order.price,
        image_url: order.image_url
      },
      seller: {
        id: order.seller_id,
        nickname: order.seller_nickname,
        avatar: order.seller_avatar
      }
    }));
    
    // 处理卖家订单
    const formattedSellerOrders = sellerOrders.map((order) => ({
      ...order,
      product: {
        id: order.product_id,
        title: order.title,
        price: order.price,
        image_url: order.image_url
      },
      buyer: {
        id: order.buyer_id,
        nickname: order.buyer_nickname,
        avatar: order.buyer_avatar
      }
    }));
    
    res.json({ buyerOrders: formattedBuyerOrders, sellerOrders: formattedSellerOrders });
  }).catch((error) => {
    console.error('获取订单列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.get("/api/orders/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const userId = req.auth.uid;
  
  // 从数据库获取订单详情
  const sql = `
    SELECT o.*, p.title, p.price, p.image_url, 
           b.id as buyer_id, b.nickname as buyer_nickname, b.avatar as buyer_avatar,
           s.id as seller_id, s.nickname as seller_nickname, s.avatar as seller_avatar
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users b ON o.buyer_id = b.id
    LEFT JOIN users s ON o.seller_id = s.id
    WHERE o.id = ?
  `;

  mysqlDb.query(sql, [id]).then((orders) => {
    const order = orders[0];
    if (!order) {
      return res.status(404).json({ message: "订单不存在" });
    }
    
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      return res.status(403).json({ message: "无权限查看此订单" });
    }
    
    const orderDetail = {
      ...order,
      product: {
        id: order.product_id,
        title: order.title,
        price: order.price,
        image_url: order.image_url
      },
      buyer: {
        id: order.buyer_id,
        nickname: order.buyer_nickname,
        avatar: order.buyer_avatar
      },
      seller: {
        id: order.seller_id,
        nickname: order.seller_nickname,
        avatar: order.seller_avatar
      }
    };
    
    res.json(orderDetail);
  }).catch((error) => {
    console.error('获取订单详情失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/orders/:id/status", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};
  const userId = req.auth.uid;
  
  // 从数据库获取订单信息
  mysqlDb.getById('orders', id).then((order) => {
    if (!order) {
      return res.status(404).json({ message: "订单不存在" });
    }
    
    // 检查权限
    if (status === "confirmed" && order.seller_id !== userId) {
      return res.status(403).json({ message: "只有卖家可以确认订单" });
    }
    
    if (status === "completed" && order.buyer_id !== userId) {
      return res.status(403).json({ message: "只有买家可以确认收货" });
    }
    
    if (status === "cancelled") {
      if (order.buyer_id !== userId && order.seller_id !== userId) {
        return res.status(403).json({ message: "只有买卖双方可以取消订单" });
      }
    }
    
    // 状态流转检查
    if (status === "confirmed" && order.status !== "pending") {
      return res.status(400).json({ message: "只能确认待确认的订单" });
    }
    
    if (status === "completed" && order.status !== "confirmed") {
      return res.status(400).json({ message: "只能完成待交付的订单" });
    }
    
    if (status === "cancelled" && (order.status === "completed" || order.status === "cancelled")) {
      return res.status(400).json({ message: "已完成或已取消的订单不能再次取消" });
    }
    
    // 更新时间线
    let timelineContent = "";
    switch (status) {
      case "confirmed":
        timelineContent = "卖家已确认订单，等待线下交付";
        break;
      case "completed":
        timelineContent = "买家确认收货，交易完成";
        break;
      case "cancelled":
        timelineContent = `订单已取消：${order.buyer_id === userId ? "买家主动取消" : "卖家主动取消"}`;
        break;
    }
    
    // 解析现有的时间线
    let timeline = [];
    if (order.timeline) {
      try {
        timeline = JSON.parse(order.timeline);
      } catch (e) {
        timeline = [];
      }
    }
    
    // 添加新的时间线记录
    timeline.push({
      content: timelineContent,
      time: new Date().toISOString()
    });
    
    // 更新订单状态
    return mysqlDb.update('orders', id, {
      status,
      timeline: JSON.stringify(timeline),
      updated_at: new Date().toISOString(),
    }).then(() => {
      // 创建系统通知
      const notificationBuyer = {
        id: `notif_${Date.now()}_1`,
        user_id: order.buyer_id,
        type: "order_status",
        title: "订单状态更新",
        content: timelineContent,
        is_read: false,
        order_id: order.id,
        created_at: new Date().toISOString(),
      };
      
      const notificationSeller = {
        id: `notif_${Date.now()}_2`,
        user_id: order.seller_id,
        type: "order_status",
        title: "订单状态更新",
        content: timelineContent,
        is_read: false,
        order_id: order.id,
        created_at: new Date().toISOString(),
      };
      
      // 插入通知
      return Promise.all([
        mysqlDb.insert('notifications', notificationBuyer),
        mysqlDb.insert('notifications', notificationSeller)
      ]);
    });
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新订单状态失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// 交易评价管理
app.post("/api/orders/:id/evaluation", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const { rating, content, target_type } = req.body ?? {};
  const userId = req.auth.uid;
  
  if (!rating || !content || !target_type) {
    return res.status(400).json({ message: "rating、content 和 target_type 为必填" });
  }
  
  // 从数据库获取订单信息
  mysqlDb.getById('orders', id).then((order) => {
    if (!order) {
      return res.status(404).json({ message: "订单不存在" });
    }
    
    if (order.status !== "completed") {
      return res.status(400).json({ message: "只有已完成的订单可以评价" });
    }
    
    // 检查是否已经评价过
    const checkSql = "SELECT * FROM evaluations WHERE order_id = ? AND user_id = ?";
    return mysqlDb.query(checkSql, [id, userId]).then((evaluations) => {
      if (evaluations.length > 0) {
        return res.status(400).json({ message: "已经评价过此订单" });
      }
      
      // 创建评价
      const evaluationData = {
        order_id: id,
        user_id: userId,
        target_id: target_type === "seller" ? order.seller_id : order.buyer_id,
        target_type,
        rating,
        content,
        created_at: new Date().toISOString(),
      };
      
      return mysqlDb.insert('evaluations', evaluationData);
    });
  }).then(() => {
    res.status(201).json({ message: "评价成功" });
  }).catch((error) => {
    console.error('创建评价失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// 投诉与反馈管理
app.post("/api/complaints", authRequired, (req, res) => {
  const { type, target_id, content, evidence } = req.body ?? {};
  const userId = req.auth.uid;
  
  if (!type || !target_id || !content) {
    return res.status(400).json({ message: "type、target_id 和 content 为必填" });
  }
  
  // 创建投诉
  const complaintData = {
    user_id: userId,
    type,
    target_id,
    content,
    evidence: evidence ? JSON.stringify(evidence) : null,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mysqlDb.insert('complaints', complaintData).then(() => {
    res.status(201).json({ message: "投诉提交成功" });
  }).catch((error) => {
    console.error('创建投诉失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// 系统通知管理
app.get("/api/users/me/notifications", authRequired, (req, res) => {
  const userId = req.auth.uid;
  
  // 从数据库获取通知列表
  const sql = `
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  mysqlDb.query(sql, [userId]).then((notifications) => {
    res.json({ list: notifications });
  }).catch((error) => {
    console.error('获取通知列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/notifications/:id/read", authRequired, (req, res) => {
  const id = req.params.id;
  const userId = req.auth.uid;
  
  // 检查通知是否存在
  const checkSql = "SELECT * FROM notifications WHERE id = ? AND user_id = ?";
  mysqlDb.query(checkSql, [id, userId]).then((notifications) => {
    if (notifications.length === 0) {
      return res.status(404).json({ message: "通知不存在" });
    }
    
    // 标记为已读
    return mysqlDb.query("UPDATE notifications SET is_read = true WHERE id = ?", [id]);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('标记通知已读失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/notifications/read-all", authRequired, (req, res) => {
  const userId = req.auth.uid;
  
  // 全部标记为已读
  const updateSql = "UPDATE notifications SET is_read = true WHERE user_id = ?";
  mysqlDb.query(updateSql, [userId]).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('全部标记通知已读失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// 消息系统
app.get("/api/messages", authRequired, (req, res) => {
  const userId = req.auth.uid;
  
  // 这里简化处理，实际应该有专门的消息表
  // 暂时返回模拟数据，未读消息数量设为 0
  res.json({
    conversations: [
      {
        id: "conv1",
        contact: {
          id: 1,
          nickname: "数码小王子",
          avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix"
        },
        lastMessage: "iPad还在吗？可以便宜点吗",
        lastTime: "10:30",
        unreadCount: 0,
        productTitle: "iPad Air 5 256G 星光色 99新",
        productPrice: 2800,
        productImage: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=100&h=100&fit=crop",
        productId: "1"
      }
    ]
  });
});

app.get("/api/messages/:id", authRequired, (req, res) => {
  const id = req.params.id;
  // 这里简化处理，实际应该从数据库获取消息
  res.json({
    messages: [
      {
        id: "m1",
        senderId: "1",
        content: "你好，这个iPad还在吗？",
        type: "text",
        time: "10:16",
        isMe: false
      },
      {
        id: "m2",
        senderId: req.auth.uid.toString(),
        content: "在的，成色很好，有什么想了解的？",
        type: "text",
        time: "10:20",
        isMe: true
      }
    ]
  });
});

app.post("/api/messages/:id", authRequired, (req, res) => {
  const id = req.params.id;
  const { content, type } = req.body ?? {};
  
  if (!content) {
    return res.status(400).json({ message: "消息内容不能为空" });
  }
  
  // 这里简化处理，实际应该保存消息到数据库
  res.json({
    id: `m${Date.now()}`,
    senderId: req.auth.uid.toString(),
    content,
    type: type || "text",
    time: new Date().toLocaleTimeString(),
    isMe: true
  });
});

app.get("/api/admin/users", adminRequired, (req, res) => {
  // 从数据库获取用户列表
  const sql = `
    SELECT u.*, 
           (SELECT COUNT(*) FROM products WHERE owner_id = u.id) as products,
           (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id OR seller_id = u.id) as orders
    FROM users u
  `;

  mysqlDb.query(sql).then((users) => {
    const list = users.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      avatar: u.avatar,
      studentId: u.studentId,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
      products: u.products,
      orders: u.orders,
    }));
    res.json({ list });
  }).catch((error) => {
    console.error('获取用户列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/admin/users/:userId/role", adminRequired, (req, res) => {
  const userId = Number(req.params.userId);
  const { role } = req.body ?? {};
  if (!role || (role !== "admin" && role !== "user")) {
    return res.status(400).json({ message: "role 必须为 admin 或 user" });
  }

  // 检查用户是否存在
  mysqlDb.getById('users', userId).then((user) => {
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 更新用户角色
    return mysqlDb.update('users', userId, { role });
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新用户角色失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/admin/users/:userId/status", adminRequired, (req, res) => {
  const userId = Number(req.params.userId);
  const { status } = req.body ?? {};
  if (!status || (status !== "active" && status !== "banned")) {
    return res.status(400).json({ message: "status 必须为 active 或 banned" });
  }

  // 检查用户是否存在
  mysqlDb.getById('users', userId).then((user) => {
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 更新用户状态
    return mysqlDb.update('users', userId, { status });
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新用户状态失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.get("/api/admin/stats", adminRequired, (_req, res) => {
  // 获取统计数据
  const statsSql = `
    SELECT
      (SELECT COUNT(*) FROM users) as totalUsers,
      (SELECT COUNT(*) FROM products) as totalProducts,
      (SELECT COUNT(*) FROM orders) as totalOrders,
      (SELECT COUNT(*) FROM favorites) as totalFavorites,
      (SELECT SUM(p.price) FROM orders o JOIN products p ON o.product_id = p.id) as totalAmount
  `;
  
  // 获取收藏最多的商品
  const topFavoritesSql = `
    SELECT p.id, p.title, COUNT(f.id) as favorites
    FROM products p
    LEFT JOIN favorites f ON p.id = f.product_id
    GROUP BY p.id, p.title
    ORDER BY favorites DESC
    LIMIT 10
  `;
  
  Promise.all([
    mysqlDb.query(statsSql),
    mysqlDb.query(topFavoritesSql)
  ]).then(([statsResult, topFavoritesResult]) => {
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
  }).catch((error) => {
    console.error('获取统计数据失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 公告管理 ---
app.get("/api/admin/announcements", adminRequired, (_req, res) => {
  // 从数据库获取公告列表
  const sql = `
    SELECT * FROM announcements
    ORDER BY created_at DESC
  `;

  mysqlDb.query(sql).then((announcements) => {
    res.json({ list: announcements });
  }).catch((error) => {
    console.error('获取公告列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.post("/api/admin/announcements", adminRequired, (req, res) => {
  const { title, content, status = "published" } = req.body ?? {};
  if (!title || !content) return res.status(400).json({ message: "title 和 content 为必填" });

  // 创建公告
  const announcementData = {
    id: `ann_${Date.now()}`,
    title,
    content,
    isTop: false,
    status: status === "draft" ? "draft" : "published",
    created_at: new Date().toISOString(),
  };

  mysqlDb.insert('announcements', announcementData).then(() => {
    res.status(201).json({ item: announcementData });
  }).catch((error) => {
    console.error('创建公告失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.put("/api/admin/announcements/:id", adminRequired, (req, res) => {
  const { id } = req.params;
  const { title, content, status } = req.body ?? {};
  
  // 检查公告是否存在
  const checkSql = "SELECT * FROM announcements WHERE id = ?";
  mysqlDb.query(checkSql, [id]).then((announcements) => {
    if (announcements.length === 0) {
      return res.status(404).json({ message: "公告不存在" });
    }
    
    // 更新公告
    const updateData = {};
    if (title != null) updateData.title = title;
    if (content != null) updateData.content = content;
    if (status != null) updateData.status = status === "draft" ? "draft" : "published";
    
    return mysqlDb.query("UPDATE announcements SET ? WHERE id = ?", [updateData, id]);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新公告失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/admin/announcements/:id/top", adminRequired, (req, res) => {
  const { id } = req.params;
  const { isTop } = req.body ?? {};
  
  // 检查公告是否存在
  const checkSql = "SELECT * FROM announcements WHERE id = ?";
  mysqlDb.query(checkSql, [id]).then((announcements) => {
    if (announcements.length === 0) {
      return res.status(404).json({ message: "公告不存在" });
    }
    
    // 更新公告置顶状态
    return mysqlDb.query("UPDATE announcements SET isTop = ? WHERE id = ?", [Boolean(isTop), id]);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新公告置顶状态失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.delete("/api/admin/announcements/:id", adminRequired, (req, res) => {
  const { id } = req.params;
  
  // 检查公告是否存在
  const checkSql = "SELECT * FROM announcements WHERE id = ?";
  mysqlDb.query(checkSql, [id]).then((announcements) => {
    if (announcements.length === 0) {
      return res.status(404).json({ message: "公告不存在" });
    }
    
    // 删除公告
    return mysqlDb.query("DELETE FROM announcements WHERE id = ?", [id]);
  }).then(() => {
    res.status(204).send();
  }).catch((error) => {
    console.error('删除公告失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 轮播图管理 ---
app.get("/api/admin/banners", adminRequired, (_req, res) => {
  // 从数据库获取轮播图列表
  const sql = `
    SELECT * FROM banners
    ORDER BY sort ASC
  `;

  mysqlDb.query(sql).then((banners) => {
    res.json({ list: banners });
  }).catch((error) => {
    console.error('获取轮播图列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.post("/api/admin/banners", adminRequired, (req, res) => {
  const { title, image, link = "/products" } = req.body ?? {};
  if (!title || !image) return res.status(400).json({ message: "title 和 image 为必填" });
  
  // 获取最大排序值
  const maxSortSql = "SELECT MAX(sort) as maxSort FROM banners";
  mysqlDb.query(maxSortSql).then((result) => {
    const maxSort = result[0].maxSort || 0;
    
    // 创建轮播图
    const item = {
      id: `ban_${Date.now()}`,
      title,
      image,
      link,
      sort: maxSort + 1,
      active: true,
      created_at: new Date().toISOString(),
    };
    
    return mysqlDb.insert('banners', item).then(() => item);
  }).then((item) => {
    res.status(201).json({ item });
  }).catch((error) => {
    console.error('创建轮播图失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.put("/api/admin/banners/:id", adminRequired, (req, res) => {
  const { id } = req.params;
  const { title, image, link, sort } = req.body ?? {};
  
  // 检查轮播图是否存在
  const checkSql = "SELECT * FROM banners WHERE id = ?";
  mysqlDb.query(checkSql, [id]).then((banners) => {
    if (banners.length === 0) {
      return res.status(404).json({ message: "轮播图不存在" });
    }
    
    // 更新轮播图
    const updateData = {};
    if (title != null) updateData.title = title;
    if (image != null) updateData.image = image;
    if (link != null) updateData.link = link;
    if (sort != null) updateData.sort = Number(sort);
    
    return mysqlDb.query("UPDATE banners SET ? WHERE id = ?", [updateData, id]);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新轮播图失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/admin/banners/:id/status", adminRequired, (req, res) => {
  const { id } = req.params;
  const { active } = req.body ?? {};
  
  // 检查轮播图是否存在
  const checkSql = "SELECT * FROM banners WHERE id = ?";
  mysqlDb.query(checkSql, [id]).then((banners) => {
    if (banners.length === 0) {
      return res.status(404).json({ message: "轮播图不存在" });
    }
    
    // 更新轮播图状态
    return mysqlDb.query("UPDATE banners SET active = ? WHERE id = ?", [Boolean(active), id]);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新轮播图状态失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/admin/banners/sort", adminRequired, (req, res) => {
  const { ids } = req.body ?? {};
  if (!Array.isArray(ids)) return res.status(400).json({ message: "ids 必须为数组" });
  
  // 批量更新轮播图排序
  const updatePromises = ids.map((id, idx) => {
    return mysqlDb.query("UPDATE banners SET sort = ? WHERE id = ?", [idx + 1, id]);
  });
  
  Promise.all(updatePromises).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新轮播图排序失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.delete("/api/admin/banners/:id", adminRequired, (req, res) => {
  const { id } = req.params;
  
  // 检查轮播图是否存在
  const checkSql = "SELECT * FROM banners WHERE id = ?";
  mysqlDb.query(checkSql, [id]).then((banners) => {
    if (banners.length === 0) {
      return res.status(404).json({ message: "轮播图不存在" });
    }
    
    // 删除轮播图
    return mysqlDb.query("DELETE FROM banners WHERE id = ?", [id]);
  }).then(() => {
    res.status(204).send();
  }).catch((error) => {
    console.error('删除轮播图失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 分类管理 ---
app.get("/api/admin/categories", adminRequired, (_req, res) => {
  // 从数据库获取分类列表
  const sql = `
    SELECT * FROM categories
    ORDER BY sort ASC
  `;

  mysqlDb.query(sql).then((categories) => {
    res.json({ list: categories });
  }).catch((error) => {
    console.error('获取分类列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.post("/api/admin/categories", adminRequired, (req, res) => {
  const { name, parentId = null, enabled = true } = req.body ?? {};
  if (!name) return res.status(400).json({ message: "name 为必填" });
  
  // 获取同级别分类的最大排序值
  const maxSortSql = "SELECT MAX(sort) as maxSort FROM categories WHERE parentId = ?";
  mysqlDb.query(maxSortSql, [parentId]).then((result) => {
    const maxSort = result[0].maxSort || 0;
    const sort = maxSort + 1;
    
    // 创建分类
    const item = { 
      id: `cat_${Date.now()}`, 
      name, 
      parentId, 
      sort, 
      enabled: Boolean(enabled) 
    };
    
    return mysqlDb.insert('categories', item).then(() => item);
  }).then((item) => {
    res.status(201).json({ item });
  }).catch((error) => {
    console.error('创建分类失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.put("/api/admin/categories/:id", adminRequired, (req, res) => {
  const { id } = req.params;
  const { name, enabled } = req.body ?? {};
  
  // 检查分类是否存在
  const checkSql = "SELECT * FROM categories WHERE id = ?";
  mysqlDb.query(checkSql, [id]).then((categories) => {
    if (categories.length === 0) {
      return res.status(404).json({ message: "分类不存在" });
    }
    
    // 更新分类
    const updateData = {};
    if (name != null) updateData.name = name;
    if (enabled != null) updateData.enabled = Boolean(enabled);
    
    return mysqlDb.query("UPDATE categories SET ? WHERE id = ?", [updateData, id]);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('更新分类失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.delete("/api/admin/categories/:id", adminRequired, (req, res) => {
  const { id } = req.params;
  
  // 检查是否有子分类
  mysqlDb.query("SELECT COUNT(*) as count FROM categories WHERE parentId = ?", [id]).then((result) => {
    if (result[0].count > 0) {
      return res.status(400).json({ message: "存在子分类，无法删除" });
    }
    
    // 检查是否有商品使用该分类
    return mysqlDb.query("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [id]).then((result) => {
      if (result[0].count > 0) {
        return res.status(400).json({ message: "分类已被商品使用，无法删除" });
      }
      
      // 删除分类
      return mysqlDb.query("DELETE FROM categories WHERE id = ?", [id]);
    });
  }).then(() => {
    res.status(204).send();
  }).catch((error) => {
    console.error('删除分类失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 商品审核/全量管理 ---
app.get("/api/admin/products", adminRequired, (req, res) => {
  const { status, keyword } = req.query;
  
  // 构建查询条件
  let sql = `
    SELECT p.*, u.nickname as seller_name, u.id as seller_id
    FROM products p
    LEFT JOIN users u ON p.owner_id = u.id
  `;
  
  const params = [];
  let whereClause = [];
  
  if (status) {
    whereClause.push("p.status = ?");
    params.push(status);
  }
  
  if (keyword) {
    whereClause.push("(p.title LIKE ? OR p.description LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  if (whereClause.length > 0) {
    sql += " WHERE " + whereClause.join(" AND ");
  }
  
  sql += " ORDER BY p.created_at DESC";
  
  mysqlDb.query(sql, params).then((products) => {
    res.json({ list: products });
  }).catch((error) => {
    console.error('获取商品列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/admin/products/:id/audit", adminRequired, (req, res) => {
  const id = Number(req.params.id);
  const { action, reason = "" } = req.body ?? {};
  if (!["approve", "reject", "down"].includes(action)) {
    return res.status(400).json({ message: "action 必须为 approve/reject/down" });
  }
  
  // 检查商品是否存在
  mysqlDb.getById('products', id).then((p) => {
    if (!p) return res.status(404).json({ message: "商品不存在" });
    
    // 更新商品状态
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (action === "approve") updateData.status = "approved";
    if (action === "reject") {
      updateData.status = "rejected";
      updateData.reject_reason = reason;
    }
    if (action === "down") updateData.status = "down";
    
    return mysqlDb.update('products', id, updateData).then(() => p);
  }).then((p) => {
    // 创建系统通知
    const notification = {
      id: `notif_${Date.now()}`,
      user_id: p.owner_id,
      type: "product_audit",
      title: "商品审核结果",
      content: action === "approve" ? "您的商品已通过审核，已上架" : action === "reject" ? `您的商品审核驳回：${reason}` : "您的商品已被管理员下架",
      is_read: false,
      created_at: new Date().toISOString(),
      product_id: p.id
    };
    
    return mysqlDb.insert('notifications', notification).then(() => p);
  }).then((p) => {
    // 记录操作日志
    const log = {
      id: `log_${Date.now()}`,
      user_id: req.auth.uid,
      action: `商品${action === "approve" ? "审核通过" : action === "reject" ? "审核驳回" : "强制下架"}`,
      module: "商品管理",
      content: `商品ID: ${p.id}, 商品名称: ${p.title}`,
      ip: req.ip || "unknown",
      created_at: new Date().toISOString()
    };
    
    return mysqlDb.insert('logs', log);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('审核商品失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 订单全量管理 ---
app.get("/api/admin/orders", adminRequired, (req, res) => {
  const { status, keyword } = req.query;
  
  // 构建查询条件
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
  let whereClause = [];
  
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
  
  mysqlDb.query(sql, params).then((orders) => {
    res.json({ list: orders });
  }).catch((error) => {
    console.error('获取订单列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 投诉与纠纷处理 ---
app.get("/api/admin/complaints", adminRequired, (req, res) => {
  const { status, type } = req.query;
  
  // 构建查询条件
  let sql = `
    SELECT c.*, 
           u.nickname as user_name
    FROM complaints c
    LEFT JOIN users u ON c.user_id = u.id
  `;
  
  const params = [];
  let whereClause = [];
  
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
  
  mysqlDb.query(sql, params).then((complaints) => {
    res.json({ list: complaints });
  }).catch((error) => {
    console.error('获取投诉列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.patch("/api/admin/complaints/:id/handle", adminRequired, (req, res) => {
  const id = Number(req.params.id);
  const { status, result } = req.body ?? {};
  
  if (!status || !result) {
    return res.status(400).json({ message: "status 和 result 为必填" });
  }
  
  // 检查投诉是否存在
  mysqlDb.getById('complaints', id).then((complaint) => {
    if (!complaint) return res.status(404).json({ message: "投诉不存在" });
    
    // 更新投诉状态
    const updateData = {
      status,
      result,
      updated_at: new Date().toISOString()
    };
    
    return mysqlDb.update('complaints', id, updateData).then(() => complaint);
  }).then((complaint) => {
    // 创建系统通知
    const notification = {
      id: `notif_${Date.now()}`,
      user_id: complaint.user_id,
      type: "complaint_result",
      title: "投诉处理结果",
      content: `您的投诉已处理：${result}`,
      is_read: false,
      created_at: new Date().toISOString(),
      complaint_id: complaint.id
    };
    
    return mysqlDb.insert('notifications', notification).then(() => complaint);
  }).then((complaint) => {
    // 记录操作日志
    const log = {
      id: `log_${Date.now()}`,
      user_id: req.auth.uid,
      action: "处理投诉",
      module: "投诉管理",
      content: `投诉ID: ${complaint.id}, 处理结果: ${result}`,
      ip: req.ip || "unknown",
      created_at: new Date().toISOString()
    };
    
    return mysqlDb.insert('logs', log);
  }).then(() => {
    res.json({ message: "ok" });
  }).catch((error) => {
    console.error('处理投诉失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 操作日志管理 ---
app.get("/api/admin/logs", adminRequired, (req, res) => {
  const { action, module, startDate, endDate } = req.query;
  
  // 构建查询条件
  let sql = `
    SELECT l.*, 
           u.nickname as user_name
    FROM logs l
    LEFT JOIN users u ON l.user_id = u.id
  `;
  
  const params = [];
  let whereClause = [];
  
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
  
  mysqlDb.query(sql, params).then((logs) => {
    res.json({ list: logs });
  }).catch((error) => {
    console.error('获取操作日志失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 评价与内容审核 ---
app.get("/api/admin/evaluations", adminRequired, (req, res) => {
  // 从数据库获取评价列表
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

  mysqlDb.query(sql).then((evaluations) => {
    res.json({ list: evaluations });
  }).catch((error) => {
    console.error('获取评价列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

// --- Admin: 物品收藏管理 ---
app.get("/api/admin/favorites", adminRequired, (req, res) => {
  const { product_id, user_id } = req.query;
  
  // 构建查询条件
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
  let whereClause = [];
  
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
  
  mysqlDb.query(sql, params).then((favorites) => {
    res.json({ list: favorites });
  }).catch((error) => {
    console.error('获取收藏列表失败:', error);
    return res.status(500).json({ message: "服务器内部错误" });
  });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

