function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "");
}

function isValidCNPhone(phone) {
  return /^1\d{10}$/.test(phone);
}

export function buildAuthService({ db, createToken, hashPassword, verifyPassword, smsService }) {
  async function loginBySms({ phone, code }, { smsService }) {
    if (!smsService) return { status: 500, body: { message: "短信服务未配置" } };
    const p = String(phone || "").trim();
    const c = String(code || "").trim();
    if (!p || !c) return { status: 400, body: { message: "phone 和 code 为必填" } };

    const v = smsService.verifyCode({ phone: p, scene: "login", code: c });
    if (!v.ok) return { status: v.status, body: { message: v.message } };

    const users = await db.query("SELECT * FROM users WHERE phone = ?", [p]);
    const user = users[0];
    if (!user) return { status: 404, body: { message: "该手机号未注册" } };
    if (user.status === "banned") return { status: 403, body: { message: "账号已封禁" } };

    // 基于实际角色分配确定用户角色
    let userRole = user.role;
    try {
      const roles = await db.query(
        `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = ? AND r.status = 'active' 
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         ORDER BY FIELD(r.code, 'super_admin', 'tenant_admin', 'admin', 'verified_user', 'user') LIMIT 1`,
        [user.id]
      );
      if (roles.length > 0) {
        userRole = roles[0].code;
      }
    } catch (error) {
      console.error("获取用户角色失败:", error);
    }

    const token = createToken({ uid: user.id, role: userRole });
    return {
      status: 200,
      body: {
        user: {
          id: user.id,
          nickname: user.nickname,
          role: userRole,
          tenantId: user.tenant_id,
          hasStudentId: !!user.student_id && user.student_id.length > 0,
        },
        token,
      },
    };
  }

  async function resetPasswordBySms({ phone, code, newPassword }, { smsService }) {
    if (!smsService) return { status: 500, body: { message: "短信服务未配置" } };
    const p = String(phone || "").trim();
    const c = String(code || "").trim();
    const np = String(newPassword || "");
    if (!p || !c || !np) return { status: 400, body: { message: "phone、code、newPassword 为必填" } };

    const v = smsService.verifyCode({ phone: p, scene: "reset_password", code: c });
    if (!v.ok) return { status: v.status, body: { message: v.message } };

    const users = await db.query("SELECT * FROM users WHERE phone = ?", [p]);
    const user = users[0];
    if (!user) return { status: 404, body: { message: "该手机号未注册" } };
    if (user.status === "banned") return { status: 403, body: { message: "账号已封禁" } };

    await db.update("users", user.id, { password_hash: await hashPassword(np) });
    return { status: 200, body: { message: "密码已重置，请使用新密码登录" } };
  }

  async function login({ phone, password }) {
    const p = normalizePhone(phone);
    if (!p || !password) {
      return { status: 400, body: { message: "phone 和 password 为必填" } };
    }
    if (!isValidCNPhone(p)) {
      return { status: 400, body: { message: "手机号格式不正确" } };
    }

    const users = await db.query("SELECT * FROM users WHERE phone = ?", [p]);
    const user = users[0];
    if (!user) return { status: 401, body: { message: "账号或密码不正确" } };
    if (user.status === "banned") return { status: 403, body: { message: "账号已封禁" } };

    const v = await verifyPassword(password, user.password_hash);
    if (!v.ok) return { status: 401, body: { message: "账号或密码不正确" } };
    if (v.needsUpgrade) {
      await db.update("users", user.id, { password_hash: await hashPassword(password) });
    }

    // 基于实际角色分配确定用户角色
    let userRole = user.role;
    try {
      const roles = await db.query(
        `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = ? AND r.status = 'active' 
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         ORDER BY FIELD(r.code, 'super_admin', 'tenant_admin', 'admin', 'verified_user', 'user') LIMIT 1`,
        [user.id]
      );
      if (roles.length > 0) {
        userRole = roles[0].code;
      }
    } catch (error) {
      console.error("获取用户角色失败:", error);
    }

    const token = createToken({ uid: user.id, role: userRole });
    return {
      status: 200,
      body: {
        user: {
          id: user.id,
          nickname: user.nickname,
          role: userRole,
          tenantId: user.tenant_id,
          hasStudentId: !!user.student_id && user.student_id.length > 0,
        },
        token,
      },
    };
  }

  async function register(payload) {
    const { nickname, phone, code, password, gender, bio, avatar } = payload ?? {};
    const p = normalizePhone(phone);
    const c = String(code || "").trim();
    if (!nickname || !p || !c || !password) {
      return { status: 400, body: { message: "nickname、phone、code 和 password 为必填" } };
    }
    if (!isValidCNPhone(p)) {
      return { status: 400, body: { message: "手机号格式不正确" } };
    }
    if (!smsService) {
      return { status: 500, body: { message: "短信服务未配置" } };
    }

    const v = smsService.verifyCode({ phone: p, scene: "register", code: c });
    if (!v.ok) return { status: v.status, body: { message: v.message } };

    const checkSql = "SELECT * FROM users WHERE phone = ?";
    const checkParams = [p];

    const users = await db.query(checkSql, checkParams);
    if (users.length > 0) {
      return { status: 409, body: { message: "手机号已存在" } };
    }

    const userData = {
      name: nickname,
      nickname,
      avatar: avatar || "",
      phone: p,
      gender: gender || "other",
      bio: bio || "",
      role: "user",
      status: "active",
      tenant_id: null,
      student_id: null,
      password_hash: await hashPassword(password),
      created_at: new Date().toISOString(),
    };

    const userId = await db.insert("users", userData);

    const defaultRole = await db.query(
      "SELECT id FROM roles WHERE code = 'user' AND tenant_id IS NULL LIMIT 1"
    );
    if (defaultRole[0]) {
      await db.insert("user_roles", {
        user_id: userId,
        role_id: defaultRole[0].id,
        tenant_id: null,
        granted_by: userId,
        created_at: new Date().toISOString(),
      });
    }

    const token = createToken({ uid: userId, role: "user" });
    return {
      status: 201,
      body: {
        user: {
          id: userId,
          nickname,
          role: "user",
          tenantId: null,
          hasStudentId: false,
        },
        token,
      },
    };
  }

  async function me(authUser) {
    const user = await db.getById("users", authUser.id);
    if (!user) {
      return {
        user: {
          id: authUser.id,
          nickname: authUser.nickname,
          role: authUser.role,
        },
      };
    }

    let tenantName = null;
    if (user.tenant_id) {
      const tenant = await db.getById("tenants", user.tenant_id);
      tenantName = tenant?.name || null;
    }

    // 基于实际角色分配确定用户角色
    let userRole = user.role;
    try {
      const roles = await db.query(
        `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = ? AND r.status = 'active' 
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         ORDER BY FIELD(r.code, 'super_admin', 'tenant_admin', 'admin', 'verified_user', 'user') LIMIT 1`,
        [user.id]
      );
      if (roles.length > 0) {
        userRole = roles[0].code;
      }
    } catch (error) {
      console.error("获取用户角色失败:", error);
    }

    return {
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        gender: user.gender,
        bio: user.bio,
        role: userRole,
        tenantId: user.tenant_id,
        tenantName,
        studentId: user.student_id || "",
        hasStudentId: !!user.student_id && user.student_id.length > 0,
        createdAt: user.created_at,
      },
    };
  }

  return { login, register, me, loginBySms, resetPasswordBySms };
}
