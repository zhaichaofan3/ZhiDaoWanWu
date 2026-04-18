import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { ChevronDown, ChevronLeft, ChevronRight, Check, AlertCircle, CheckCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Role {
  id: number;
  code: string;
  name: string;
  name_en: string;
  description: string;
  tenant_id?: number;
  type: string;
  sort: number;
  status: string;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  description: string;
  sort: number;
  status: string;
}

const RoleManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.adminGetRoles();
      setRoles(response.list);
      // 默认选择第一个角色
      if (response.list.length > 0 && !selectedRole) {
        handleRoleSelect(response.list[0]);
      }
    } catch (err) {
      setError("加载角色失败");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await api.adminGetPermissions();
      setPermissions(response);
      // 初始化所有模块为展开状态
      const initialExpanded = response.reduce((acc, perm) => {
        acc[perm.module] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setExpandedModules(initialExpanded);
    } catch (err) {
      setError("加载权限失败");
    }
  };

  const loadRolePermissions = async (roleId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.adminGetRolePermissions(roleId);
      setSelectedPermissions(response.map((p: any) => p.id));
    } catch (err) {
      setError("加载角色权限失败");
    } finally {
      setIsLoading(false);
    }
  };

  const updateRolePermissions = async () => {
    if (!selectedRole) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await api.adminUpdateRolePermissions(selectedRole.id, selectedPermissions);
      setSuccess("权限更新成功");
      // 3秒后清除成功消息
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("更新权限失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    loadRolePermissions(role.id);
  };

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleModule = (module: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  // 按模块分组权限
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  // 模块名称映射
  const moduleNames: Record<string, string> = {
    system: "系统管理",
    tenant: "租户管理",
    product: "商品管理",
    order: "订单管理",
    stats: "数据统计",
    content: "内容管理",
    feedback: "评价投诉",
    ai: "AI中心"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">角色管理</h1>
          <p className="text-muted-foreground mt-1">管理系统角色及其权限配置</p>
        </div>
        <Button onClick={loadRoles} disabled={isLoading}>
          {isLoading ? "刷新中..." : "刷新角色"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="transition-all duration-300 ease-in-out">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 transition-all duration-300 ease-in-out">
          <CheckCircle className="h-4 w-4 mr-2" />
          <AlertTitle>成功</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 角色列表 */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">角色列表</CardTitle>
              <CardDescription>选择一个角色进行权限配置</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-1">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse bg-muted rounded-md p-3">
                          <div className="h-4 bg-muted-foreground/30 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : roles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无角色数据
                    </div>
                  ) : (
                    roles.map((role) => (
                      <Button
                        key={role.id}
                        variant={selectedRole?.id === role.id ? "secondary" : "ghost"}
                        className={`w-full justify-start transition-all duration-200 hover:bg-muted/50 ${selectedRole?.id === role.id ? 'border-l-4 border-primary' : ''}`}
                        onClick={() => handleRoleSelect(role)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{role.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            {role.type === 'system' ? '系统' : '租户'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {role.description || '无描述'}
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 权限配置 */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {selectedRole ? `${selectedRole.name} - 权限配置` : "请选择一个角色"}
              </CardTitle>
              <CardDescription>
                {selectedRole ? `配置 ${selectedRole.name} 的权限` : "从左侧选择一个角色开始配置"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRole ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                      <Collapsible 
                        key={module} 
                        open={expandedModules[module]}
                        onOpenChange={(open) => toggleModule(module)}
                      >
                        <div className="bg-muted/30 rounded-lg overflow-hidden border border-muted">
                          <CollapsibleTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="w-full justify-between text-left font-medium"
                            >
                              <span>{moduleNames[module] || module}</span>
                              {expandedModules[module] ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="p-4 border-t border-muted">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {modulePermissions.map((permission) => (
                                <div 
                                  key={permission.id} 
                                  className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted/50 transition-colors"
                                >
                                  <Checkbox
                                    id={`perm-${permission.id}`}
                                    checked={selectedPermissions.includes(permission.id)}
                                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                                    className="data-[state=checked]:bg-primary"
                                  />
                                  <div className="flex-1">
                                    <Label 
                                      htmlFor={`perm-${permission.id}`} 
                                      className="font-medium cursor-pointer"
                                    >
                                      {permission.name}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {permission.description || '无描述'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-muted flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      已选择 {selectedPermissions.length} 个权限
                    </div>
                    <Button
                      onClick={updateRolePermissions}
                      disabled={isLoading}
                      className="transition-all duration-200"
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
                          保存权限
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
                  <div className="bg-muted p-4 rounded-full">
                    <ChevronLeft className="h-8 w-8" />
                  </div>
                  <p className="text-lg font-medium">请从左侧选择一个角色</p>
                  <p className="text-sm text-center max-w-md">
                    选择角色后，您可以在此配置该角色的权限
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;