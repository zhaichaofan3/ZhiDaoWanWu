import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Ban, RotateCcw, Shield, ShieldCheck, RefreshCw, KeyRound, Upload, Phone, Eye, Check, AlertCircle, CheckCircle, Building2, Coins } from "lucide-react";
import { resolveAssetUrl } from "@/lib/assets";
import { useUtc8Time } from "@/hooks/use-utc8-time";
import OrderDetailDialog from "@/components/OrderDetailDialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Detail = Awaited<ReturnType<typeof api.adminGetUserDetail>>;

interface Role {
  id: number;
  code: string;
  name: string;
  tenantId?: number | null;
}

interface Tenant {
  id: number;
  code: string;
  name: string;
  short_name?: string;
}

export default function UserDetail() {
  const { formatDateTime } = useUtc8Time();
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = Number(id);

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  
  // 角色和学校管理
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"role" | "tenant">("role");
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerSuccess, setDrawerSuccess] = useState<string | null>(null);

  const [points, setPoints] = useState<any>(null);
  const [pointLogs, setPointLogs] = useState<any[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const loadTenants = async () => {
    try {
      const res = await api.adminListTenants({ status: "active" });
      setTenants(res.list || []);
    } catch (err) {
      console.error("加载学校失败:", err);
      setTenants([]);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.adminGetRoles();
      setRoles(res.list || []);
    } catch (err) {
      console.error("加载角色失败:", err);
      setRoles([]);
    }
  };

  const loadUserPoints = async () => {
    if (!Number.isFinite(userId) || userId <= 0) return;
    setPointsLoading(true);
    try {
      const data = await api.adminGetUserPoints(userId);
      setPoints(data.points);
      setPointLogs(data.logs || []);
    } catch (err) {
      console.error("加载用户积分失败:", err);
    } finally {
      setPointsLoading(false);
    }
  };

  const refresh = async () => {
    if (!Number.isFinite(userId) || userId <= 0) {
      setError("无效的用户ID");
      setDetail(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [r, l, c, e, ch] = await Promise.all([
        api.adminGetUserDetail(userId),
        api.adminGetUserLogs(userId, 10000).catch(() => []),
        api.adminGetUserComplaints(userId, 10000).catch(() => []),
        api.adminGetUserEvaluations(userId, 10000).catch(() => []),
        api.adminGetUserChats(userId, 10000).catch(() => []),
      ]);
      setDetail(r);
      setLogs(l || []);
      setComplaints(c || []);
      setEvaluations(e || []);
      setChats(ch || []);
      
      // 加载学校和角色数据
      await Promise.all([loadTenants(), loadRoles()]);
      // 加载用户积分数据
      await loadUserPoints();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "加载失败");
      setDetail(null);
      setLogs([]);
      setComplaints([]);
      setEvaluations([]);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleBan = async () => {
    if (!detail) return;
    
    setIsLoading(true);
    try {
      const next = detail.user.status === "banned" ? "active" : "banned";
      await api.adminSetUserStatus(detail.user.id, next);
      await refresh();
      toast.success(next === "active" ? "用户已解封" : "用户已封禁");
    } catch (error) {
      console.error("切换用户状态失败:", error);
      toast.error("操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = async () => {
    if (!detail) return;
    
    setIsLoading(true);
    try {
      const next = detail.user.role === "admin" ? "user" : "admin";
      await api.adminSetUserRole(detail.user.id, next);
      await refresh();
      toast.success(next === "admin" ? "已设为管理员" : "已取消管理员");
    } catch (error) {
      console.error("切换用户角色失败:", error);
      toast.error("操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const openRoleDrawer = async () => {
    if (!detail) return;
    
    setDrawerMode("role");
    setDrawerOpen(true);
    setSelectedRoleIds([]);
    setDrawerError(null);
    setDrawerSuccess(null);

    try {
      const userRolesList = await api.adminGetUserRoles(detail.user.id);
      setUserRoles(userRolesList || []);
      setSelectedRoleIds(userRolesList?.map((r: any) => r.id) || []);
    } catch (error) {
      console.error("获取用户角色失败:", error);
      setUserRoles([]);
      setDrawerError("获取用户角色失败");
    }
  };

  const openTenantDrawer = () => {
    if (!detail) return;
    
    setDrawerMode("tenant");
    setDrawerOpen(true);
    setSelectedTenantId(detail.user.tenant_id || null);
    setDrawerError(null);
    setDrawerSuccess(null);
  };

  const handleSaveRole = async () => {
    if (!detail) return;
    
    setIsLoading(true);
    setDrawerError(null);
    setDrawerSuccess(null);

    try {
      const currentRoleIds = userRoles.map((r) => r.id);
      
      // 撤销未选中的角色
      for (const roleId of currentRoleIds) {
        if (!selectedRoleIds.includes(roleId)) {
          await api.adminRevokeUserRole(detail.user.id, roleId);
        }
      }

      // 授予新选中的角色
      for (const roleId of selectedRoleIds) {
        if (!currentRoleIds.includes(roleId)) {
          await api.adminGrantUserRole(detail.user.id, roleId);
        }
      }

      setDrawerSuccess("角色分配成功");
      // 3秒后关闭抽屉并刷新
      setTimeout(async () => {
        setDrawerOpen(false);
        await refresh();
      }, 1500);
    } catch (error) {
      console.error("角色分配失败:", error);
      setDrawerError("角色分配失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTenant = async () => {
    if (!detail) return;
    
    setIsLoading(true);
    setDrawerError(null);
    setDrawerSuccess(null);

    try {
      await api.adminSetUserTenant(detail.user.id, selectedTenantId);
      setDrawerSuccess(selectedTenantId ? "学校绑定成功" : "学校解绑成功");
      
      // 3秒后关闭抽屉并刷新
      setTimeout(async () => {
        setDrawerOpen(false);
        await refresh();
      }, 1500);
    } catch (error) {
      console.error("学校绑定失败:", error);
      setDrawerError("学校绑定失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")} title="返回用户列表">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
          <Button variant="outline" size="sm" className="gap-1" onClick={refresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
          {detail ? (
            <>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => { setPwd(""); setPwdOpen(true); }}>
                <KeyRound className="h-4 w-4" />
                重置密码
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => { setPhone(detail.user.phone || ""); setPhoneOpen(true); }}>
                <Phone className="h-4 w-4" />
                修改手机号
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={openRoleDrawer}>
                <Shield className="h-4 w-4" />
                分配角色
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={openTenantDrawer}>
                <Building2 className="h-4 w-4" />
                绑定学校
              </Button>
              <Button variant="secondary" size="sm" className="gap-1" onClick={toggleRole} disabled={isLoading}>
                {detail.user.role === "admin" ? <ShieldCheck className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4" />}
                {detail.user.role === "admin" ? "取消管理员" : "设为管理员"}
              </Button>
              <Button variant={detail.user.status === "banned" ? "secondary" : "destructive"} size="sm" className="gap-1" onClick={toggleBan} disabled={isLoading}>
                {detail.user.status === "banned" ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                {detail.user.status === "banned" ? "解封" : "封禁"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      ) : loading && !detail ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">加载中...</CardContent>
        </Card>
      ) : detail ? (
        <>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">用户详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none"
                    disabled={avatarUploading}
                    onClick={() => {
                      const el = document.getElementById("admin-user-avatar-file") as HTMLInputElement | null;
                      el?.click();
                    }}
                    title={avatarUploading ? "上传中..." : "点击更换头像"}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={resolveAssetUrl(detail.user.avatar)} />
                      <AvatarFallback>{(detail.user.nickname || "U")[0]}</AvatarFallback>
                    </Avatar>
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload className="h-4 w-4" />
                    </span>
                    {avatarUploading ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-[11px] text-white">
                        上传中...
                      </span>
                    ) : null}
                  </button>
                  <input
                    id="admin-user-avatar-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !detail) return;
                      setAvatarUploading(true);
                      try {
                        const r = await api.ossUploadFile(file, "avatars");
                        await api.adminSetUserAvatar(detail.user.id, r.path || r.url);
                        await refresh();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setAvatarUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <div className="font-semibold text-foreground truncate max-w-[24rem]">
                      {detail.user.nickname}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[20rem]">
                      ID: {detail.user.id}
                    </div>
                    <Badge variant={
                      detail.user.role === "admin" 
                        ? "default" 
                        : detail.user.role === "verified_user" 
                          ? "default" 
                          : "secondary"
                    }>
                      {detail.user.role === "admin" 
                        ? "管理员" 
                        : detail.user.role === "verified_user" 
                          ? "已认证用户" 
                          : "用户"
                      }
                    </Badge>
                    <Badge variant={detail.user.status === "active" ? "outline" : "destructive"}>
                      {detail.user.status === "active" ? "正常" : "已封禁"}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                  {detail.user.bio || "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                <div className="rounded-md border border-border px-3 py-2">
                  <div className="text-muted-foreground text-xs">手机号</div>
                  <div className="mt-0.5 font-medium break-all">{detail.user.phone || "-"}</div>
                </div>
                <div className="rounded-md border border-border px-3 py-2">
                  <div className="text-muted-foreground text-xs">性别</div>
                  <div className="mt-0.5 font-medium">{detail.user.gender || "-"}</div>
                </div>
                <div className="rounded-md border border-border px-3 py-2">
                  <div className="text-muted-foreground text-xs">学号</div>
                  <div className="mt-0.5 font-medium">{detail.user.studentId || "-"}</div>
                </div>
                <div className="rounded-md border border-border px-3 py-2">
                  <div className="text-muted-foreground text-xs">认证状态</div>
                  <div className="mt-0.5 font-medium">
                    {detail.user.isVerified ? (
                      <Badge variant="default">已认证</Badge>
                    ) : (
                      <Badge variant="outline">未认证</Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-border px-3 py-2 md:col-span-4">
                  <div className="text-muted-foreground text-xs">注册时间</div>
                  <div className="mt-0.5 font-medium">
                    {formatDateTime(detail.user.created_at)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">详细信息</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="products" className="w-full">
                <div className="px-6 py-2 border-b border-border">
                  <TabsList className="flex flex-wrap justify-start h-auto">
                    <TabsTrigger value="products">商品（{(detail.products || []).length}）</TabsTrigger>
                    <TabsTrigger value="orders">订单（{(detail.orders || []).length}）</TabsTrigger>
                    <TabsTrigger value="logs">日志（{logs.length}）</TabsTrigger>
                    <TabsTrigger value="complaints">投诉（{complaints.length}）</TabsTrigger>
                    <TabsTrigger value="evaluations">评价（{evaluations.length}）</TabsTrigger>
                    <TabsTrigger value="chats">聊天（{chats.length}）</TabsTrigger>
                    <TabsTrigger value="points">
                      <Coins className="h-4 w-4 mr-1" />
                      积分中心
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="products" className="m-0">
                  <div className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground mb-3">发布商品</div>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>标题</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>价格</TableHead>
                            <TableHead>发布时间</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detail.products || []).map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.title || "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{p.status || "-"}</TableCell>
                              <TableCell className="text-primary font-medium">¥{p.price ?? "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
                            </TableRow>
                          ))}
                          {(detail.products || []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                                暂无数据
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="orders" className="m-0">
                  <div className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground mb-3">相关订单</div>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>订单号</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>商品</TableHead>
                            <TableHead>买家/卖家</TableHead>
                            <TableHead>时间</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detail.orders || []).map((o: any) => (
                            <TableRow key={o.id}>
                              <TableCell className="font-medium">{o.orderNo || o.id}</TableCell>
                              <TableCell className="text-muted-foreground">{o.status || "-"}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {o.product_title ? `${o.product_title}（¥${o.product_price ?? "-"}）` : "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {o.buyer_name || "-"} / {o.seller_name || "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatDateTime(o.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="查看订单详情"
                                  onClick={() => setActiveOrderId(Number(o.id))}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(detail.orders || []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                                暂无数据
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="m-0">
                  <div className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground mb-3">操作日志</div>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>动作</TableHead>
                            <TableHead>模块</TableHead>
                            <TableHead>内容</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((x: any) => (
                            <TableRow key={x.id}>
                              <TableCell className="text-muted-foreground">{formatDateTime(x.created_at)}</TableCell>
                              <TableCell className="font-medium">{x.action || "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{x.module || "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{x.content || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {logs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                                暂无数据
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="complaints" className="m-0">
                  <div className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground mb-3">投诉</div>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>内容</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {complaints.map((x: any) => (
                            <TableRow key={x.id}>
                              <TableCell className="text-muted-foreground">{formatDateTime(x.created_at)}</TableCell>
                              <TableCell className="text-muted-foreground">{x.type || "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{x.status || "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{x.content || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {complaints.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                                暂无数据
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="evaluations" className="m-0">
                  <div className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground mb-3">评价</div>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>订单</TableHead>
                            <TableHead>对象</TableHead>
                            <TableHead>评分</TableHead>
                            <TableHead>内容</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {evaluations.map((x: any) => (
                            <TableRow key={x.id}>
                              <TableCell className="text-muted-foreground">{formatDateTime(x.created_at)}</TableCell>
                              <TableCell className="text-muted-foreground">{x.order_id ?? "-"}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {x.target_type || "-"} / {x.target_id ?? "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{x.rating ?? "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{x.content || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {evaluations.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                                暂无数据
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chats" className="m-0">
                  <div className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground mb-3">聊天记录</div>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>对方</TableHead>
                            <TableHead>商品</TableHead>
                            <TableHead>内容</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chats.map((x: any) => (
                            <TableRow key={x.id}>
                              <TableCell className="text-muted-foreground">
                                {formatDateTime(x.created_at)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {x.other_nickname ? `${x.other_nickname}（ID:${x.other_id}）` : "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {x.product_title ? `${x.product_title}${x.product_id ? `（ID:${x.product_id}）` : ""}` : "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{x.content || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {chats.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                                暂无数据
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="points" className="m-0">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-foreground">积分中心</div>
                      <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>
                        调整积分
                      </Button>
                    </div>
                    {pointsLoading ? (
                      <div className="py-10 text-center text-muted-foreground">加载中...</div>
                    ) : points ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="rounded-lg border border-border p-4">
                            <div className="text-muted-foreground text-xs mb-1">当前积分</div>
                            <div className="text-2xl font-bold text-primary">{points.points ?? 0}</div>
                          </div>
                          <div className="rounded-lg border border-border p-4">
                            <div className="text-muted-foreground text-xs mb-1">历史累计积分</div>
                            <div className="text-2xl font-bold">{points.total_points ?? 0}</div>
                          </div>
                          <div className="rounded-lg border border-border p-4">
                            <div className="text-muted-foreground text-xs mb-1">积分记录</div>
                            <div className="text-2xl font-bold">{pointLogs.length}</div>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-foreground mb-3">积分记录</div>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>时间</TableHead>
                                <TableHead>类型</TableHead>
                                <TableHead>积分变动</TableHead>
                                <TableHead>余额</TableHead>
                                <TableHead>来源/原因</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pointLogs.map((log: any) => (
                                <TableRow key={log.id}>
                                  <TableCell className="text-muted-foreground">
                                    {formatDateTime(log.created_at)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      log.type === "earn" ? "default" :
                                      log.type === "deduct" ? "secondary" : "outline"
                                    }>
                                      {log.type === "earn" ? "获得" : log.type === "deduct" ? "消费" : "调整"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={`font-medium ${log.points > 0 ? "text-green-600" : log.points < 0 ? "text-red-600" : ""}`}>
                                    {log.points > 0 ? "+" : ""}{log.points}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{log.balance}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {log.rule_name || log.description || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {pointLogs.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                                    暂无积分记录
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <div className="py-10 text-center text-muted-foreground">暂无数据</div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">暂无数据</CardContent>
        </Card>
      )}

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置用户密码</DialogTitle>
            <DialogDescription>为该用户设置一个新密码（至少 6 位）。</DialogDescription>
          </DialogHeader>
          <Input value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="输入新密码" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!detail) return;
                setPwdSaving(true);
                try {
                  await api.adminResetUserPassword(detail.user.id, pwd);
                  setPwdOpen(false);
                  await refresh();
                } finally {
                  setPwdSaving(false);
                }
              }}
              disabled={pwdSaving || pwd.trim().length < 6}
            >
              {pwdSaving ? "提交中..." : "确认重置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={phoneOpen} onOpenChange={setPhoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改用户手机号</DialogTitle>
            <DialogDescription>直接为该用户更新手机号（需为 11 位大陆手机号且不能被占用）。</DialogDescription>
          </DialogHeader>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="输入新手机号" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneOpen(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!detail) return;
                setPhoneSaving(true);
                try {
                  await api.adminSetUserPhone(detail.user.id, phone);
                  setPhoneOpen(false);
                  await refresh();
                } finally {
                  setPhoneSaving(false);
                }
              }}
              disabled={phoneSaving || String(phone || "").trim().length !== 11}
            >
              {phoneSaving ? "提交中..." : "确认修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OrderDetailDialog
        open={activeOrderId !== null}
        orderId={activeOrderId}
        onOpenChange={(next) => {
          if (!next) setActiveOrderId(null);
        }}
      />

      <Sheet
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) {
            setDrawerError(null);
            setDrawerSuccess(null);
          }
        }}
      >
        <SheetContent side="right" className="w-[95vw] sm:max-w-xl p-0">
          <SheetHeader className="p-6 pb-3">
            <SheetTitle>{drawerMode === "role" ? "分配角色" : "绑定学校"}</SheetTitle>
            <SheetDescription>
              {detail ? `${detail.user.nickname} (${detail.user.phone})` : ""}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-160px)] px-6 pb-6">
            {drawerError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 text-red-800 border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{drawerError}</span>
                </div>
              </div>
            )}
            
            {drawerSuccess && (
              <div className="mb-4 p-3 rounded-md bg-green-50 text-green-800 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{drawerSuccess}</span>
                </div>
              </div>
            )}

            {drawerMode === "role" ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">选择角色</Label>
                    <span className="text-xs text-muted-foreground">
                      已选择 {selectedRoleIds.length} 个角色
                    </span>
                  </div>
                  <div className="space-y-2">
                    {roles.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无可用角色
                      </div>
                    ) : (
                      roles.map((role) => (
                        <div 
                          key={role.id} 
                          className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            if (selectedRoleIds.includes(role.id)) {
                              setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.id));
                            } else {
                              setSelectedRoleIds([...selectedRoleIds, role.id]);
                            }
                          }}
                        >
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={selectedRoleIds.includes(role.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRoleIds([...selectedRoleIds, role.id]);
                              } else {
                                setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={`role-${role.id}`} 
                              className="font-medium cursor-pointer"
                            >
                              {role.name}
                            </Label>
                            <div className="text-xs text-muted-foreground mt-1">
                              {role.code} {role.tenantId ? `(租户: ${role.tenantId})` : "(全局)"}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-muted">
                  <Button 
                    variant="outline" 
                    onClick={() => setDrawerOpen(false)}
                    disabled={isLoading}
                  >
                    取消
                  </Button>
                  <Button 
                    onClick={handleSaveRole}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        保存中...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        保存
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">选择学校</Label>
                  <Select
                    value={selectedTenantId?.toString() || "none"}
                    onValueChange={(v) => setSelectedTenantId(v === "none" ? null : Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择学校" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不绑定学校</SelectItem>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id.toString()}>
                          {tenant.name} {tenant.short_name ? `(${tenant.short_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-muted">
                  <Button 
                    variant="outline" 
                    onClick={() => setDrawerOpen(false)}
                    disabled={isLoading}
                  >
                    取消
                  </Button>
                  <Button 
                    onClick={handleSaveTenant}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        保存中...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        保存
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={adjustOpen} onOpenChange={(v) => {
        setAdjustOpen(v);
        if (!v) {
          setAdjustPoints("");
          setAdjustReason("");
          setAdjustError("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整用户积分</DialogTitle>
            <DialogDescription>为 {detail?.user.nickname} 手动调整积分（可正可负）。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {adjustError && (
              <div className="p-3 rounded-md bg-red-50 text-red-800 border border-red-200 text-sm">
                {adjustError}
              </div>
            )}
            <div>
              <Label className="text-sm font-medium mb-2 block">积分变动</Label>
              <Input
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="例如：100 或 -50"
                type="number"
              />
              <p className="text-xs text-muted-foreground mt-1">正数增加积分，负数扣减积分</p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">调整原因</Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="请输入调整原因"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!detail) return;
                const pointsNum = Number(adjustPoints);
                if (!Number.isFinite(pointsNum) || pointsNum === 0) {
                  setAdjustError("请输入有效的积分数值（非0）");
                  return;
                }
                if (!adjustReason.trim()) {
                  setAdjustError("请输入调整原因");
                  return;
                }
                setAdjustSaving(true);
                setAdjustError("");
                try {
                  await api.adminAdjustUserPoints(detail.user.id, {
                    points: pointsNum,
                    reason: adjustReason.trim(),
                  });
                  setAdjustOpen(false);
                  await loadUserPoints();
                  toast.success("积分调整成功");
                } catch (err) {
                  console.error("调整积分失败:", err);
                  setAdjustError(err instanceof Error ? err.message : "调整失败");
                } finally {
                  setAdjustSaving(false);
                }
              }}
              disabled={adjustSaving}
            >
              {adjustSaving ? "调整中..." : "确认调整"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

