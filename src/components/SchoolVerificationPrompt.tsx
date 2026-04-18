import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Mail, School, CheckCircle } from "lucide-react";

interface SchoolVerificationPromptProps {
  onVerified?: () => void;
}

export function SchoolVerificationPrompt({ onVerified }: SchoolVerificationPromptProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sended, setSended] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [coolDownUntil, setCoolDownUntil] = useState(0);

  const handleSendCode = async () => {
    if (!email.trim()) {
      toast.error("请输入邮箱地址");
      return;
    }
    if (!email.includes("@")) {
      toast.error("邮箱格式不正确");
      return;
    }

    setSending(true);
    try {
      const result = await api.sendEmailVerificationCode({ email: email.trim() });
      setTenantName(result.tenantName || null);
      setSended(true);
      toast.success("验证码已发送");
      setCoolDownUntil(Date.now() + 60 * 1000);
    } catch (err: any) {
      toast.error(err.message || "发送失败");
      setSended(false);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      toast.error("请输入验证码");
      return;
    }

    setVerifying(true);
    try {
      await api.verifyEmailCode({ email: email.trim(), code: code.trim() });
      toast.success("认证成功");
      onVerified?.();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "验证失败");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <CardDescription>
          需要先选择学校并完成邮箱认证才能发布商品，请使用您的学校邮箱（如 <span className="font-mono text-foreground">student@university.edu.cn</span>）进行认证。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="school-email">学校邮箱</Label>
          <div className="flex gap-2">
            <Input
              id="school-email"
              type="email"
              placeholder="请输入您的学校邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending || verifying}
            />
            <Button
              onClick={handleSendCode}
              disabled={sending || Date.now() < coolDownUntil}
              variant="secondary"
            >
              {Date.now() < coolDownUntil ? `${Math.ceil((coolDownUntil - Date.now()) / 1000)}s` : sending ? "发送中..." : "发送验证码"}
            </Button>
          </div>
        </div>

        {sended && (
          <div className="space-y-2">
            <Label htmlFor="verify-code">验证码</Label>
            <div className="flex gap-2">
              <Input
                id="verify-code"
                placeholder="请输入验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={verifying}
              />
              <Button onClick={handleVerify} disabled={verifying || !code.trim()}>
                {verifying ? "验证中..." : "验证"}
              </Button>
            </div>
          </div>
        )}

        {tenantName && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            检测到学校：{tenantName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RequireSchoolVerification({ children }: { children: React.ReactNode }) {
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  return (
    <>
      {children}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              完成学校认证
            </DialogTitle>
          </DialogHeader>
          <SchoolVerificationPrompt onVerified={() => setShowVerifyDialog(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useSchoolVerification() {
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  const checkAndPromptVerification = (hasTenantId: boolean, emailVerified: boolean) => {
    if (!hasTenantId || !emailVerified) {
      setShowVerifyDialog(true);
      return false;
    }
    return true;
  };

  return { showVerifyDialog, setShowVerifyDialog, checkAndPromptVerification };
}
