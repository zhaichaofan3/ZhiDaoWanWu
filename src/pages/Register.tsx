import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { setMe, setToken } from "@/lib/auth";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("2022级");
  const [major, setMajor] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (password !== confirmPassword) return alert("两次密码不一致");
    if (!nickname.trim() || !studentId.trim() || !password) return;
    setLoading(true);
    try {
      const resp = await api.register({
        nickname: nickname.trim(),
        studentId: studentId.trim(),
        phone: phone.trim() || undefined,
        password,
        grade,
        major: major.trim() || undefined,
      });
      setToken(resp.token);
      setMe({
        id: resp.user.id,
        nickname: resp.user.nickname,
        role: resp.user.role,
        studentId: resp.user.studentId,
      });
      navigate("/", { replace: true });
    } catch (e: any) {
      alert(e?.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl mb-3">
            校
          </div>
          <h1 className="text-2xl font-bold text-foreground">注册账号</h1>
          <p className="text-sm text-muted-foreground mt-1">加入校园二手交易平台</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称</Label>
              <Input id="nickname" placeholder="取个昵称" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId">学号</Label>
              <Input id="studentId" placeholder="请输入学号" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input id="phone" type="tel" placeholder="请输入手机号" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>年级</Label>
              <Select value={grade} onValueChange={(v) => setGrade(v)}>
                <SelectTrigger><SelectValue placeholder="选择年级" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2021级">2021级</SelectItem>
                  <SelectItem value="2022级">2022级</SelectItem>
                  <SelectItem value="2023级">2023级</SelectItem>
                  <SelectItem value="2024级">2024级</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="major">专业</Label>
              <Input id="major" placeholder="请输入专业" value={major} onChange={(e) => setMajor(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="8位以上，包含数字和字母"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button className="w-full" size="lg" disabled={loading} onClick={onRegister}>
            {loading ? "注册中..." : "注册"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            已有账号？
            <Link to="/login" className="text-primary hover:underline ml-1">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
