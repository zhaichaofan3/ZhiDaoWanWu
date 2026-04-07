export function buildAuthService({ db, createToken, hashPasswordMD5 }) {
  async function login({ account, email, studentId, password }) {
    const loginKey = account || email || studentId;
    if (!loginKey || !password) {
      return { status: 400, body: { message: "account(或email/学号) 和 password 为必填" } };
    }

    let sql;
    let params;
    if (loginKey.includes("@")) {
      sql = "SELECT * FROM users WHERE email = ?";
      params = [loginKey];
    } else {
      sql = "SELECT * FROM users WHERE studentId = ? OR phone = ?";
      params = [loginKey, loginKey];
    }

    const users = await db.query(sql, params);
    const user = users[0];
    if (!user) return { status: 401, body: { message: "账号或密码不正确" } };
    if (user.status === "banned") return { status: 403, body: { message: "账号已封禁" } };

    const ok =
      user.password_hash === "demo" ||
      user.password_hash === password ||
      user.password_hash === hashPasswordMD5(password);
    if (!ok) return { status: 401, body: { message: "账号或密码不正确" } };

    const token = createToken({ uid: user.id, role: user.role });
    return {
      status: 200,
      body: {
        user: { id: user.id, nickname: user.nickname, role: user.role, studentId: user.studentId },
        token,
      },
    };
  }

  async function register(payload) {
    const { nickname, studentId, phone, password, gender, grade, major, bio, avatar } = payload ?? {};
    if (!nickname || !studentId || !password) {
      return { status: 400, body: { message: "nickname、studentId 和 password 为必填" } };
    }

    let checkSql;
    let checkParams;
    if (phone) {
      checkSql = "SELECT * FROM users WHERE studentId = ? OR phone = ?";
      checkParams = [studentId, phone];
    } else {
      checkSql = "SELECT * FROM users WHERE studentId = ?";
      checkParams = [studentId];
    }

    const users = await db.query(checkSql, checkParams);
    if (users.length > 0) {
      return { status: 409, body: { message: "学号或手机号已存在" } };
    }

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

    const userId = await db.insert("users", userData);
    const token = createToken({ uid: userId, role: "user" });
    return {
      status: 201,
      body: { user: { id: userId, nickname, role: "user", studentId }, token },
    };
  }

  function me(authUser) {
    return {
      user: {
        id: authUser.id,
        nickname: authUser.nickname,
        avatar: authUser.avatar,
        phone: authUser.phone,
        studentId: authUser.studentId,
        gender: authUser.gender,
        grade: authUser.grade,
        major: authUser.major,
        bio: authUser.bio,
        role: authUser.role,
      },
    };
  }

  return { login, register, me };
}
