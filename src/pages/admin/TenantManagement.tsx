import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Search, RefreshCw, X } from "lucide-react";

const TenantManagementPage = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    short_name: "",
    description: "",
    status: "active",
    logo: "",
    logo_dark: ""
  });

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await api.adminListTenants({
        keyword,
        status: status === "all" ? "" : status,
        page,
        limit
      });
      setTenants(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error("获取租户列表失败:", error);
      toast.error("获取租户列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, limit, keyword, status]);

  const handleCreate = async () => {
    try {
      const { status, ...createData } = formData;
      await api.adminCreateTenant(createData);
      toast.success("租户创建成功");
      setDrawerOpen(false);
      setFormData({
        code: "",
        name: "",
        short_name: "",
        description: "",
        status: "active",
        logo: "",
        logo_dark: ""
      });
      fetchTenants();
    } catch (error) {
      console.error("创建租户失败:", error);
      toast.error("创建租户失败");
    }
  };

  const handleEdit = async () => {
    try {
      await api.adminUpdateTenant(currentTenant.id, formData);
      toast.success("租户更新成功");
      setDrawerOpen(false);
      setCurrentTenant(null);
      fetchTenants();
    } catch (error) {
      console.error("更新租户失败:", error);
      toast.error("更新租户失败");
    }
  };

  const handleDelete = async (tenantId: number) => {
    if (window.confirm("确定要删除这个租户吗？") === true) {
      try {
        await api.adminDeleteTenant(tenantId);
        toast.success("租户删除成功");
        fetchTenants();
      } catch (error) {
        console.error("删除租户失败:", error);
        toast.error("删除租户失败");
      }
    }
  };

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setFormData({
      code: "",
      name: "",
      short_name: "",
      description: "",
      status: "active",
      logo: "",
      logo_dark: ""
    });
    setDrawerOpen(true);
  };

  const handleEditClick = (tenant: any) => {
    setCurrentTenant(tenant);
    setFormData({
      code: tenant.code,
      name: tenant.name,
      short_name: tenant.short_name || "",
      description: tenant.description || "",
      status: tenant.status,
      logo: tenant.logo || "",
      logo_dark: tenant.logo_dark || ""
    });
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">租户管理</h1>
          <p className="text-muted-foreground">管理系统中的学校租户</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreateDrawer}>
              <Plus className="h-4 w-4" />
              新建租户
            </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>租户列表</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索租户名称或编码"
                className="pl-8"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="inactive">非活跃</SelectItem>
                <SelectItem value="suspended">暂停</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={fetchTenants}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>租户编码</TableHead>
                  <TableHead>学校</TableHead>
                  <TableHead>学校简称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>{tenant.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tenant.logo ? (
                          <img src={resolveAssetUrl(tenant.logo)} alt="Logo" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {tenant.name?.charAt(0) || "?"}
                          </div>
                        )}
                        <span className="font-medium">{tenant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{tenant.short_name || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-800' : tenant.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {tenant.status === 'active' ? '活跃' : tenant.status === 'inactive' ? '非活跃' : '暂停'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(tenant)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(tenant.id)}>
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
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            共 {total} 条记录
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              上一页
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * limit >= total}
            >
              下一页
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Sheet
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) {
            setCurrentTenant(null);
          }
        }}
      >
        <SheetContent side="right" className="w-[95vw] sm:max-w-2xl p-0">
          <SheetHeader className="p-6 pb-3">
            <SheetTitle>{drawerMode === "create" ? "新建租户" : "编辑租户"}</SheetTitle>
            <SheetDescription>
              {drawerMode === "create" ? "请填写租户信息，创建新的学校租户" : "编辑租户信息"}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-160px)] px-6 pb-6">
            <div className="space-y-5">
              {formData.logo && (
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <img src={resolveAssetUrl(formData.logo)} alt="Logo" className="w-16 h-16 object-cover rounded" />
                  <div>
                    <h3 className="text-lg font-semibold">{formData.name || "学校名称"}</h3>
                    <p className="text-sm text-muted-foreground">{formData.short_name || "学校简称"}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">租户编码</label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="例如：demo"
                    disabled={drawerMode === "edit"}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">学校名称</label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：示例大学"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">学校简称</label>
                  <Input
                    id="short_name"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    placeholder="例如：Demo"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">描述</label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="学校描述"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">学校Logo（浅色模式）</label>
                    <div className="space-y-3">
                      {formData.logo ? (
                        <div className="flex items-center space-x-3 p-3 border border-border rounded-lg bg-muted/30">
                          <div className="relative">
                            <img src={resolveAssetUrl(formData.logo)} alt="Logo" className="h-14 w-auto max-w-24 object-contain rounded-md shadow-sm" />
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border"
                              onClick={() => setFormData({ ...formData, logo: "" })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">已上传Logo</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              点击图标删除
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const result = await api.ossUploadFile(file, "tenants");
                                  setFormData({ ...formData, logo: result.path || result.url });
                                  toast.success("Logo上传成功");
                                } catch (error) {
                                  console.error("Logo上传失败:", error);
                                  toast.error("Logo上传失败");
                                }
                              }
                            }}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label htmlFor="logo-upload" className="cursor-pointer block">
                            <div className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors">
                              上传Logo
                            </div>

                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">学校Logo（深色模式）</label>
                    <div className="space-y-3">
                      {formData.logo_dark ? (
                        <div className="flex items-center space-x-3 p-3 border border-border rounded-lg bg-muted/30">
                          <div className="relative">
                            <div className="h-14 bg-gray-800 rounded-md p-2 flex items-center justify-center">
                              <img src={resolveAssetUrl(formData.logo_dark)} alt="Logo Dark" className="h-10 w-auto max-w-20 object-contain" />
                            </div>
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border"
                              onClick={() => setFormData({ ...formData, logo_dark: "" })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">已上传深色Logo</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              点击图标删除
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const result = await api.ossUploadFile(file, "tenants");
                                  setFormData({ ...formData, logo_dark: result.path || result.url });
                                  toast.success("深色Logo上传成功");
                                } catch (error) {
                                  console.error("深色Logo上传失败:", error);
                                  toast.error("深色Logo上传失败");
                                }
                              }
                            }}
                            className="hidden"
                            id="logo-dark-upload"
                          />
                          <label htmlFor="logo-dark-upload" className="cursor-pointer block">
                            <div className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors">
                              上传深色Logo
                            </div>

                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {drawerMode === "edit" && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">状态</label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">活跃</SelectItem>
                        <SelectItem value="inactive">非活跃</SelectItem>
                        <SelectItem value="suspended">暂停</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={drawerMode === "create" ? handleCreate : handleEdit}>
                    保存
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TenantManagementPage;