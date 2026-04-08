import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Ban, RotateCcw, Shield, ShieldCheck, RefreshCw, KeyRound, Upload } from "lucide-react";
import { resolveAssetUrl } from "@/lib/assets";

type Detail = Awaited<ReturnType<typeof api.adminGetUserDetail>>;

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = Number(id);

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const title = useMemo(() => {
    if (!detail?.user) return "用户详情";
    return `${detail.user.nickname}（ID: ${detail.user.id}）`;
  }, [detail]);

  const refresh = async () => {
    if (!Number.isFinite(userId) || userId <= 0) {
      setError("无效的用户ID");
      setDetail(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [r, l, c, e] = await Promise.all([
        api.adminGetUserDetail(userId),
        api.adminGetUserLogs(userId, 50).catch(() => []),
        api.adminGetUserComplaints(userId, 50).catch(() => []),
        api.adminGetUserEvaluations(userId, 50).catch(() => []),
      ]);
      setDetail(r);
      setLogs(l || []);
      setComplaints(c || []);
      setEvaluations(e || []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "加载失败");
      setDetail(null);
      setLogs([]);
      setComplaints([]);
      setEvaluations([]);
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
    const next = detail.user.status === "banned" ? "active" : "banned";
    await api.adminSetUserStatus(detail.user.id, next);
    await refresh();
  };

  const toggleRole = async () => {
    if (!detail) return;
    const next = detail.user.role === "admin" ? "user" : "admin";
    await api.adminSetUserRole(detail.user.id, next);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")} title="返回用户列表">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {detail?.user?.phone ? `手机号：${detail.user.phone}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
              <Button variant="secondary" size="sm" className="gap-1" onClick={toggleRole}>
                {detail.user.role === "admin" ? <ShieldCheck className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4" />}
                {detail.user.role === "admin" ? "取消管理员" : "设为管理员"}
              </Button>
              <Button variant={detail.user.status === "banned" ? "secondary" : "destructive"} size="sm" className="gap-1" onClick={toggleBan}>
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
              <CardTitle className="text-base">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={resolveAssetUrl(detail.user.avatar)} />
                  <AvatarFallback>{(detail.user.nickname || "U")[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{detail.user.nickname}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {detail.user.name ? `姓名：${detail.user.name}` : "姓名：-"}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1"
                    disabled={avatarUploading}
                    onClick={() => {
                      const el = document.getElementById("admin-user-avatar-file") as HTMLInputElement | null;
                      el?.click();
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    {avatarUploading ? "上传中..." : "更换头像"}
                  </Button>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-muted-foreground">角色</div>
                  <div className="mt-1">
                    <Badge variant={detail.user.role === "admin" ? "default" : "secondary"}>
                      {detail.user.role === "admin" ? "管理员" : "用户"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-muted-foreground">状态</div>
                  <div className="mt-1">
                    <Badge variant={detail.user.status === "active" ? "outline" : "destructive"}>
                      {detail.user.status === "active" ? "正常" : "已封禁"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-muted-foreground">注册时间</div>
                  <div className="mt-1 font-medium">{String(detail.user.created_at || "").slice(0, 19).replace("T", " ") || "-"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-muted-foreground">发布商品</div>
                  <div className="mt-1 text-lg font-semibold">{detail.stats.products}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-muted-foreground">相关订单</div>
                  <div className="mt-1 text-lg font-semibold">{detail.stats.orders}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-muted-foreground">收藏数</div>
                  <div className="mt-1 text-lg font-semibold">{detail.stats.favorites}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-muted-foreground">手机号</div>
                  <div className="mt-1 font-medium">{detail.user.phone || "-"}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-muted-foreground">性别</div>
                  <div className="mt-1 font-medium">{detail.user.gender || "-"}</div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 text-sm">
                <div className="text-muted-foreground">简介</div>
                <div className="mt-2 whitespace-pre-wrap">{detail.user.bio || "-"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">最近发布商品（最多20条）</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="text-muted-foreground">{String(p.created_at || "").slice(0, 19).replace("T", " ")}</TableCell>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">最近相关订单（最多20条）</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>买家/卖家</TableHead>
                    <TableHead>时间</TableHead>
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
                      <TableCell className="text-muted-foreground">{String(o.created_at || "").slice(0, 19).replace("T", " ")}</TableCell>
                    </TableRow>
                  ))}
                  {(detail.orders || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">最近操作日志（最多50条）</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="text-muted-foreground">{String(x.created_at || "").slice(0, 19).replace("T", " ")}</TableCell>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">最近投诉（最多50条）</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="text-muted-foreground">{String(x.created_at || "").slice(0, 19).replace("T", " ")}</TableCell>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">最近评价（最多50条）</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="text-muted-foreground">{String(x.created_at || "").slice(0, 19).replace("T", " ")}</TableCell>
                      <TableCell className="text-muted-foreground">{x.order_id ?? "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{x.target_type || "-"} / {x.target_id ?? "-"}</TableCell>
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
    </div>
  );
}

