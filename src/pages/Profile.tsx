import Header from "@/features/public/components/Header";
import Footer from "@/features/public/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Settings, MapPin, Package, Heart, ShoppingCart, Lock, ChevronRight, LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/auth";
import { clearAuth } from "@/lib/auth";

const Profile = () => {
  const navigate = useNavigate();
  const [me, setMeState] = useState<Me | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((u) => setMeState(u as unknown as Me))
      .catch(() => setMeState(null));
  }, []);

  const user = me
    ? {
        nickname: me.nickname,
        avatar: me.avatar,
        studentId: me.studentId,
        grade: me.grade,
        major: me.major,
        bio: me.bio,
        phone: me.phone,
      }
    : null;

  const menuItems = [
    { icon: Package, label: "我的发布", path: "/my-products", count: 5 },
    { icon: Heart, label: "我的收藏", path: "/favorites", count: 12 },
    { icon: ShoppingCart, label: "我买到的", path: "/orders/buy", count: 3 },
    { icon: ShoppingCart, label: "我卖出的", path: "/orders/sell", count: 2 },
    { icon: MapPin, label: "收货地址", path: "/addresses", count: undefined },
    { icon: Lock, label: "修改密码", path: "/change-password", count: undefined },
    { icon: Settings, label: "账号设置", path: "/settings", count: undefined },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container max-w-3xl py-4 md:py-6">
          <Tabs defaultValue="info">
            <TabsList className="w-full justify-start mb-6">
              <TabsTrigger value="info">个人信息</TabsTrigger>
              <TabsTrigger value="menu">功能菜单</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              {/* Profile Card */}
              <div className="rounded-xl border border-border bg-card p-6 mb-6">
                {user ? (
                  <div className="flex items-center gap-4 mb-6">
                    <img src={user.avatar || ""} alt="" className="h-16 w-16 rounded-full bg-muted" />
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{user.nickname}</h2>
                      <p className="text-sm text-muted-foreground">{user.grade} · {user.major}</p>
                      <p className="text-xs text-muted-foreground mt-1">{user.bio}</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">加载中...</div>
                )}

                <div className="grid grid-cols-3 gap-4 text-center py-4 border-t border-b border-border">
                  <div><span className="text-lg font-bold text-foreground">5</span><br /><span className="text-xs text-muted-foreground">发布</span></div>
                  <div><span className="text-lg font-bold text-foreground">12</span><br /><span className="text-xs text-muted-foreground">收藏</span></div>
                  <div><span className="text-lg font-bold text-foreground">8</span><br /><span className="text-xs text-muted-foreground">交易</span></div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-semibold text-foreground">编辑资料</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">昵称</Label>
                    <Input id="nickname" value={user?.nickname || ""} onChange={(e) => setMeState((prev) => (prev ? { ...prev, nickname: e.target.value } : prev))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号</Label>
                    <Input id="phone" value={user?.phone || ""} disabled />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">年级</Label>
                    <Input id="grade" value={user?.grade || ""} onChange={(e) => setMeState((prev) => (prev ? { ...prev, grade: e.target.value } : prev))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="major">专业</Label>
                    <Input id="major" value={user?.major || ""} onChange={(e) => setMeState((prev) => (prev ? { ...prev, major: e.target.value } : prev))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">个人简介</Label>
                  <Textarea id="bio" value={user?.bio || ""} onChange={(e) => setMeState((prev) => (prev ? { ...prev, bio: e.target.value } : prev))} rows={3} maxLength={100} />
                </div>
                <Button
                  disabled={saving || !user}
                  onClick={async () => {
                    if (!user) return;
                    setSaving(true);
                    try {
                      await api.updateProfile({
                        nickname: user.nickname,
                        avatar: user.avatar,
                        grade: user.grade,
                        major: user.major,
                        bio: user.bio,
                      });
                      alert("保存成功");
                    } catch (e: any) {
                      alert(e?.message || "保存失败");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  保存修改
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="menu">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {menuItems.map((item, i) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-sm text-foreground">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="text-xs text-muted-foreground">{item.count}</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
                <button
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors border-t border-border w-full text-left"
                  onClick={() => {
                    clearAuth();
                    navigate("/login", { replace: true });
                  }}
                >
                  <LogOut className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive">退出登录</span>
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
