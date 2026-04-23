import { createTransport } from 'nodemailer';

export function buildSmtpService() {
  let transporter = null;

  function getTransporter() {
    if (!transporter) {
      transporter = createTransport({
        host: process.env.EMAIL_SMTP_HOST,
        port: Number(process.env.EMAIL_SMTP_PORT),
        secure: true,
        auth: {
          user: process.env.EMAIL_SMTP_USER,
          pass: process.env.EMAIL_SMTP_PASS,
        },
      });
    }
    return transporter;
  }

  async function sendVerificationEmail(email, code, expiresIn) {
    try {
      const transport = getTransporter();

      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: '邮箱验证码 - 智达万物',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">邮箱验证</h2>
            <p>您好，</p>
            <p>您正在验证邮箱，验证码如下：</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="font-size: 24px; text-align: center; color: #333;">${code}</h3>
            </div>
            <p>验证码有效期为 ${Math.floor(expiresIn / 60)} 分钟，请尽快使用。</p>
            <p>如非本人操作，请忽略此邮件。</p>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">--<br>智达万物</p>
          </div>
        `,
      };

      const info = await transport.sendMail(mailOptions);
      console.log('邮件发送成功:', info.messageId);
      return { ok: true, message: '邮件发送成功' };
    } catch (error) {
      console.error('邮件发送失败:', error);
      return { ok: false, message: '邮件发送失败', error: error.message };
    }
  }

  return {
    sendVerificationEmail,
  };
}
