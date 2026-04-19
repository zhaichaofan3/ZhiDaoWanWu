import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Search, RefreshCw, Users, School, BarChart3 } from "lucide-react";
import { StudentIdInput } from "@/components/SchoolVerificationPrompt";

const TenantAdminPage = () => {
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [userStatus, setUserStatus] = useState("");

  const fetchTenantInfo = async () => {
    try {
      const info = await api.tenantInfo();
      setTenantInfo(info);
    } catch (error) {
      console.error("获取学校信息失败:", error);
      toast.error("获取学校信息失败");
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.tenantUsers({ status: userStatus, keyword: searchKeyword });
      setUsers(response.list || []);
    } catch (error) {
      console.error("获取用户列表失败:", error);
      toast.error("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.tenantStats();
      setStats(response);
    } catch (error) {
      console.error("获取统计数据失败:", error);
    }
  };

  useEffect(() => {
    fetchTenantInfo();
    fetchUsers();
    fetchStats();
  }, [searchKeyword, userStatus]);

  const handleUpdateUserStatus = async (userId: number, status: string) => {
    try {
      await api.tenantUpdateUserStatus(userId, status);
      toast.success("用户状态更新成功");
      fetchUsers();
    } catch (error) {
      console.error("更新用户状态失败:", error);
      toast.error("更新用户状态失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">学校管理</h1>
          <p className="text-muted-foreground">管理本校的用户</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">用户总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">商品总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">订单总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">待审核商品</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingProducts}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>学校信息</CardTitle>
        </CardHeader>
        <CardContent>
          {tenantInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>学校名称</Label>
                  <Input value={tenantInfo.name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>学校简称</Label>
                  <Input value={tenantInfo.short_name || "-"} disabled />
                </div>
                <div className="space-y-2">
                  <Label>租户编码</Label>
                  <Input value={tenantInfo.code} disabled />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Input value={tenantInfo.status === 'active' ? '活跃' : tenantInfo.status === 'inactive' ? '非活跃' : '暂停'} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input value={tenantInfo.description || "-"} disabled />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>用户管理</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户姓名、手机号或学号"
                className="pl-8"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <Select value={userStatus} onValueChange={setUserStatus}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="banned">封禁</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户ID</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.nickname}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>{user.student_id || '-'}</TableCell>
                    <TableCell>
                      <Select value={user.status} onValueChange={(value) => handleUpdateUserStatus(user.id, value)}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="状态" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">活跃</SelectItem>
                          <SelectItem value="banned">封禁</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/admin/users/${user.id}`}>查看</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantAdminPage;
