import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ForgotPassword = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const value = account.trim();
    if (!value) return;
    setLoading(true);
    try {
      // 当前后端未提供找回密码接口，这里先给可用引导，避免按钮无响应
      alert("已提交找回请求，请联系管理员重置密码。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold">找回密码</h1>
          <p className="text-sm text-muted-foreground mt-1">请输入学号或手机号</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="account">学号 / 手机号</Label>
          <Input
            id="account"
            placeholder="请输入学号或手机号"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={loading || !account.trim()}>
          {loading ? "提交中..." : "提交找回请求"}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          想起来了？
          <Link to="/login" className="text-primary hover:underline ml-1">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
