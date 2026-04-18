import { buildEmailService } from "../services/email-service.js";
import { buildTenantService } from "../services/tenant-service.js";

export function buildEmailController(deps) {
  const emailService = buildEmailService(deps);
  const tenantService = buildTenantService(deps);

  return {
    async sendVerificationEmail(req, res) {
      try {
        const { email } = req.body;
        const userId = req.auth.uid;

        if (!email) {
          return res.status(400).json({ message: "email 为必填" });
        }

        if (!email.includes("@")) {
          return res.status(400).json({ message: "邮箱格式不正确" });
        }

        const tenantInfo = await tenantService.getTenantByEmail(email);
        if (!tenantInfo) {
          return res.status(400).json({
            message: "该邮箱不在支持的教育邮箱列表中",
            code: "EMAIL_DOMAIN_NOT_SUPPORTED",
          });
        }

        const result = await emailService.sendVerificationEmail({
          userId,
          email,
          tenantId: tenantInfo.tenant_id,
          scene: "email_verify",
        });

        console.log(`[邮箱验证] 验证码已发送至 ${email}，租户: ${tenantInfo.tenant_name}`);

        return res.status(result.status).json({
          ...result.body,
          tenantName: tenantInfo.tenant_name,
        });
      } catch (error) {
        console.error("发送邮箱验证码失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async verifyEmailCode(req, res) {
      try {
        const { email, code } = req.body;
        const userId = req.auth.uid;

        if (!email || !code) {
          return res.status(400).json({ message: "email 和 code 为必填" });
        }

        const result = await emailService.verifyEmailCode({
          userId,
          email,
          code,
          scene: "email_verify",
        });

        if (result.status === 200) {
          console.log(`[邮箱验证] 用户 ${userId} 认证邮箱 ${email} 成功`);
        }

        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("验证邮箱验证码失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async getVerificationStatus(req, res) {
      try {
        const userId = req.auth.uid;
        const result = await emailService.getVerificationStatus(userId);
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("获取邮箱验证状态失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
  };
}
