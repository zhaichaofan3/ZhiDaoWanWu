export function buildEmailService({ db, smtpService }) {
  function generateCode(length = 6) {
    return String(Math.floor(Math.random() * Math.pow(10, length)))
      .padStart(length, "0");
  }

  async function sendVerificationEmail({ userId, email, tenantId, scene = "email_verify" }) {
    if (!userId || !email) {
      return { status: 400, body: { message: "userId 和 email 为必填" } };
    }

    if (!email.includes("@")) {
      return { status: 400, body: { message: "邮箱格式不正确" } };
    }

    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const existingPending = await db.query(
      `SELECT id FROM email_verifications
       WHERE user_id = ? AND email = ? AND scene = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [userId, email, scene]
    );

    if (existingPending[0]) {
      await db.update("email_verifications", existingPending[0].id, {
        code,
        expires_at: expiresAt.toISOString(),
        ip: "pending",
        created_at: new Date().toISOString(),
      });
    } else {
      await db.insert("email_verifications", {
        user_id: userId,
        email,
        tenant_id: tenantId || null,
        code,
        scene,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        ip: "pending",
        created_at: new Date().toISOString(),
      });
    }

    // 实际发送邮件
    if (smtpService) {
      const mailResult = await smtpService.sendVerificationEmail(email, code, 30 * 60);
      if (!mailResult.ok) {
        console.error("邮件发送失败:", mailResult.error);
        // 邮件发送失败但仍返回成功，因为验证码已经生成
      }
    }

    return {
      status: 200,
      body: {
        message: "验证码已发送",
        expiresIn: 30 * 60,
      },
    };
  }

  async function verifyEmailCode({ userId, email, code, scene = "email_verify" }) {
    if (!userId || !email || !code) {
      return { status: 400, body: { message: "userId、email 和 code 为必填" } };
    }

    const verifications = await db.query(
      `SELECT * FROM email_verifications
       WHERE user_id = ? AND email = ? AND code = ? AND scene = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [userId, email, code, scene]
    );

    const verification = verifications[0];
    if (!verification) {
      return { status: 400, body: { message: "验证码无效或已过期" } };
    }

    const expiresAt = new Date(verification.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      await db.update("email_verifications", verification.id, { status: "expired" });
      return { status: 400, body: { message: "验证码已过期" } };
    }

    await db.update("email_verifications", verification.id, {
      status: "verified",
      verified_at: new Date().toISOString(),
    });

    await db.update("users", userId, {
      email_verified: 1,
      email_verified_at: new Date().toISOString(),
      email: email,
      tenant_id: verification.tenant_id,
    });

    if (verification.tenant_id) {
      const defaultRole = await db.query(
        "SELECT id FROM roles WHERE code = 'verified_user' AND tenant_id IS NULL LIMIT 1"
      );
      if (defaultRole[0]) {
        const existingRole = await db.query(
          "SELECT id FROM user_roles WHERE user_id = ? AND role_id = ?",
          [userId, defaultRole[0].id]
        );
        if (!existingRole[0]) {
          await db.insert("user_roles", {
            user_id: userId,
            role_id: defaultRole[0].id,
            tenant_id: verification.tenant_id,
            granted_by: userId,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return { status: 200, body: { message: "邮箱认证成功" } };
  }

  async function getVerificationStatus(userId) {
    const verifications = await db.query(
      `SELECT ev.*, t.name as tenant_name
       FROM email_verifications ev
       LEFT JOIN tenants t ON t.id = ev.tenant_id
       WHERE ev.user_id = ?
       ORDER BY ev.created_at DESC`,
      [userId]
    );

    const user = await db.getById("users", userId);

    return {
      status: 200,
      body: {
        emailVerified: user?.email_verified === 1,
        email: user?.email || "",
        tenantId: user?.tenant_id || null,
        verifications: verifications || [],
      },
    };
  }

  return {
    sendVerificationEmail,
    verifyEmailCode,
    getVerificationStatus,
  };
}
