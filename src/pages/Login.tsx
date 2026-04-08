import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { setToken, setMe } from "@/lib/auth";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getErrorMessage = (e: unknown) => {
    if (e && typeof e === "object" && "message" in e) {
      const msg = (e as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    return "登录失败";
  };

  const onLogin = async () => {
    const p = phone.trim();
    if (!p || !password) return;
    setLoading(true);
    try {
      const resp = await api.login({ phone: p, password });
      setToken(resp.token);
      setMe({ id: resp.user.id, nickname: resp.user.nickname, role: resp.user.role });
      navigate(resp.user.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/logos/logo_with_slogan_black.svg"
            alt="校园二手交易平台"
            className="mx-auto h-16 w-auto mb-3 dark:hidden"
            loading="eager"
            decoding="async"
          />
          <img
            src="/logos/logo_with_slogan_white.svg"
            alt="校园二手交易平台"
            className="mx-auto h-16 w-auto mb-3 hidden dark:block"
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input id="phone" placeholder="请输入手机号" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" className="rounded border-border" /> 记住我
            </label>
            <Link to="/forgot-password" className="text-primary hover:underline">忘记密码？</Link>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={onLogin}
            disabled={loading || !phone.trim() || !password}
          >
            {loading ? "登录中..." : "登录"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            还没有账号？
            <Link to="/register" className="text-primary hover:underline ml-1">立即注册</Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          登录即表示同意《用户协议》和《隐私政策》
        </p>
      </div>
    </div>
  );
};

export default Login;
