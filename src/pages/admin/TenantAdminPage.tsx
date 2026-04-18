import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Search, Filter, RefreshCw, Users, Mail, BarChart3 } from "lucide-react";

const TenantAdminPage = () => {
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDomainDialog, setShowDomainDialog] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<any>(null);
  const [domainForm, setDomainForm] = useState({
    domain: "",
    description: "",
    status: "active"
  });
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

  const fetchDomains = async () => {
    try {
      const response = await api.tenantDomains();
      setDomains(response.list || []);
    } catch (error) {
      console.error("获取邮箱域名失败:", error);
      toast.error("获取邮箱域名失败");
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
    fetchDomains();
    fetchStats();
  }, [searchKeyword, userStatus]);

  const handleAddDomain = async () => {
    try {
      await api.tenantAddDomain(domainForm);
      toast.success("邮箱域名添加成功");
      setShowDomainDialog(false);
      setDomainForm({
        domain: "",
        description: "",
        status: "active"
      });
      fetchDomains();
    } catch (error) {
      console.error("添加邮箱域名失败:", error);
      toast.error("添加邮箱域名失败");
    }
  };

  const handleUpdateDomain = async () => {
    try {
      await api.tenantUpdateDomain(currentDomain.id, domainForm);
      toast.success("邮箱域名更新成功");
      setShowDomainDialog(false);
      setCurrentDomain(null);
      fetchDomains();
    } catch (error) {
      console.error("更新邮箱域名失败:", error);
      toast.error("更新邮箱域名失败");
    }
  };

  const handleDeleteDomain = async (domainId: number) => {
    if (window.confirm("确定要删除这个邮箱域名吗？") === true) {
      try {
        await api.tenantDeleteDomain(domainId);
        toast.success("邮箱域名删除成功");
        fetchDomains();
      } catch (error) {
        console.error("删除邮箱域名失败:", error);
        toast.error("删除邮箱域名失败");
      }
    }
  };

  const handleEditDomain = (domain: any) => {
    setCurrentDomain(domain);
    setDomainForm({
      domain: domain.domain,
      description: domain.description || "",
      status: domain.status
    });
    setShowDomainDialog(true);
  };

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
          <p className="text-muted-foreground">管理本校的用户和邮箱域名</p>
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
          <CardTitle>邮箱域名管理</CardTitle>
          <Dialog open={showDomainDialog} onOpenChange={setShowDomainDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                添加域名
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{currentDomain ? '编辑域名' : '添加域名'}</DialogTitle>
                <DialogDescription>
                  {currentDomain ? '编辑邮箱域名信息' : '添加新的邮箱域名'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">邮箱后缀</Label>
                  <Input
                    id="domain"
                    value={domainForm.domain}
                    onChange={(e) => setDomainForm({ ...domainForm, domain: e.target.value })}
                    placeholder="例如：demo.edu.cn"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">说明</Label>
                  <Input
                    id="description"
                    value={domainForm.description}
                    onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })}
                    placeholder="域名说明"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">状态</Label>
                  <Select value={domainForm.status} onValueChange={(value) => setDomainForm({ ...domainForm, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="inactive">非活跃</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowDomainDialog(false)}>
                  取消
                </Button>
                <Button onClick={currentDomain ? handleUpdateDomain : handleAddDomain}>
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邮箱后缀</TableHead>
                  <TableHead>说明</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>{domain.domain}</TableCell>
                    <TableCell>{domain.description || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${domain.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {domain.status === 'active' ? '活跃' : '非活跃'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditDomain(domain)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDomain(domain.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>用户管理</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户姓名或手机号"
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
                  <TableHead>邮箱</TableHead>
                  <TableHead>邮箱认证</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.nickname}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${user.email_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.email_verified ? '已认证' : '未认证'}
                      </span>
                    </TableCell>
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
