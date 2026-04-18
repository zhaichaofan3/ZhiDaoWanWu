import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Ban, RotateCcw, Shield, ShieldCheck, SquareArrowOutUpRight, Building2, Check, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { resolveAssetUrl } from "@/lib/assets";
import { useUtc8Time } from "@/hooks/use-utc8-time";

interface AdminUser {
  id: number;
  nickname: string;
  avatar?: string | null;
  phone: string;
  role: "user" | "admin";
  status: "active" | "banned";
  tenantId?: number | null;
  tenantName?: string | null;
  createdAt: string;
  products: number;
  orders: number;
}

interface Tenant {
  id: number;
  code: string;
  name: string;
  short_name?: string;
}

interface Role {
  id: number;
  code: string;
  name: string;
  tenantId?: number | null;
}

const UserManagement = () => {
  const { formatDateTime } = useUtc8Time();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"role" | "tenant">("role");
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadTenants();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      const list = await api.adminListUsers();
      setUsers(list);
    } catch (err) {
      console.error("加载用户失败:", err);
      setUsers([]);
    }
  };

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

  const filtered = users.filter(
    (u) => u.nickname.includes(search) || u.phone.includes(search)
  );

  const toggleBan = async (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    
    setIsLoading(true);
    try {
      const nextStatus: "active" | "banned" = user.status === "banned" ? "active" : "banned";
      await api.adminSetUserStatus(userId, nextStatus);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)));
      toast.success(nextStatus === "active" ? "用户已解封" : "用户已封禁");
    } catch (error) {
      console.error("切换用户状态失败:", error);
      toast.error("操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = async (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    
    setIsLoading(true);
    try {
      const nextRole: "user" | "admin" = user.role === "admin" ? "user" : "admin";
      await api.adminSetUserRole(userId, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)));
      toast.success(nextRole === "admin" ? "已设为管理员" : "已取消管理员");
    } catch (error) {
      console.error("切换用户角色失败:", error);
      toast.error("操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const openRoleDrawer = async (user: AdminUser) => {
    setCurrentUser(user);
    setDrawerMode("role");
    setDrawerOpen(true);
    setSelectedRoleIds([]);
    setError(null);
    setSuccess(null);

    try {
      const userRolesList = await api.adminGetUserRoles(user.id);
      setUserRoles(userRolesList || []);
      setSelectedRoleIds(userRolesList?.map((r: any) => r.id) || []);
    } catch (error) {
      console.error("获取用户角色失败:", error);
      setUserRoles([]);
      setError("获取用户角色失败");
    }
  };

  const openTenantDrawer = (user: AdminUser) => {
    setCurrentUser(user);
    setDrawerMode("tenant");
    setDrawerOpen(true);
    setSelectedTenantId(user.tenantId || null);
    setError(null);
    setSuccess(null);
  };

  const handleSaveRole = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const currentRoleIds = userRoles.map((r) => r.id);
      
      // 撤销未选中的角色
      for (const roleId of currentRoleIds) {
        if (!selectedRoleIds.includes(roleId)) {
          await api.adminRevokeUserRole(currentUser.id, roleId);
        }
      }

      // 授予新选中的角色
      for (const roleId of selectedRoleIds) {
        if (!currentRoleIds.includes(roleId)) {
          await api.adminGrantUserRole(currentUser.id, roleId);
        }
      }

      setSuccess("角色分配成功");
      // 3秒后关闭抽屉
      setTimeout(() => setDrawerOpen(false), 1500);
    } catch (error) {
      console.error("角色分配失败:", error);
      setError("角色分配失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTenant = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.adminSetUserTenant(currentUser.id, selectedTenantId);
      setSuccess(selectedTenantId ? "学校绑定成功" : "学校解绑成功");
      
      // 更新用户列表中的学校信息
      setUsers((prev) => prev.map((u) => {
        if (u.id === currentUser.id) {
          const tenant = tenants.find((t) => t.id === selectedTenantId);
          return { ...u, tenantId: selectedTenantId, tenantName: tenant?.name || null };
        }
        return u;
      }));
      
      // 3秒后关闭抽屉
      setTimeout(() => setDrawerOpen(false), 1500);
    } catch (error) {
      console.error("学校绑定失败:", error);
      setError("学校绑定失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground mt-1">管理系统用户及其权限</p>
        </div>
        <div className="w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="搜索昵称或手机号..." 
              className="pl-9 w-full"
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>共 {filtered.length} 位用户</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>学校</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发布/订单</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    暂无用户数据
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={resolveAssetUrl(user.avatar)} />
                          <AvatarFallback>{user.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.nickname}</div>
                          <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.phone}</TableCell>
                    <TableCell>
                      {user.tenantName ? (
                        <Badge variant="outline" className="px-2 py-1">
                          {user.tenantName}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">未绑定</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="px-2 py-1">
                        {user.role === "admin" ? "管理员" : "用户"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "outline" : "destructive"} className="px-2 py-1">
                        {user.status === "active" ? "正常" : "已封禁"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.products} / {user.orders}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateTime(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 transition-colors hover:bg-muted"
                          title="详情"
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          <SquareArrowOutUpRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 transition-colors hover:bg-muted"
                          title="分配角色"
                          onClick={() => openRoleDrawer(user)}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 transition-colors hover:bg-muted"
                          title="绑定学校"
                          onClick={() => openTenantDrawer(user)}
                        >
                          <Building2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 transition-colors hover:bg-muted"
                          title={user.role === "admin" ? "取消管理员" : "设为管理员"} 
                          onClick={() => toggleRole(user.id)}
                          disabled={isLoading}
                        >
                          {user.role === "admin" ? <ShieldCheck className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 transition-colors hover:bg-muted"
                          title={user.status === "banned" ? "解封" : "封禁"} 
                          onClick={() => toggleBan(user.id)}
                          disabled={isLoading}
                        >
                          {user.status === "banned" ? <RotateCcw className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) {
            setCurrentUser(null);
            setError(null);
            setSuccess(null);
          }
        }}
      >
        <SheetContent side="right" className="w-[95vw] sm:max-w-xl p-0">
          <SheetHeader className="p-6 pb-3">
            <SheetTitle>{drawerMode === "role" ? "分配角色" : "绑定学校"}</SheetTitle>
            <SheetDescription>
              {currentUser ? `${currentUser.nickname} (${currentUser.phone})` : ""}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-160px)] px-6 pb-6">
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 text-red-800 border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 rounded-md bg-green-50 text-green-800 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{success}</span>
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
    </div>
  );
};

export default UserManagement;
