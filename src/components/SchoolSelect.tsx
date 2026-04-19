import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getMe, updateMe } from "@/lib/auth";
import { toast } from "sonner";
import { School, Building, CheckCircle } from "lucide-react";

interface SchoolSelectProps {
  onSuccess?: () => void;
}

export function SchoolSelect({ onSuccess }: SchoolSelectProps) {
  const [tenants, setTenants] = useState<Array<{ id: number; code: string; name: string; short_name?: string }>>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      try {
        const tenantList = await api.listTenants();
        setTenants(tenantList);
        
        // 如果用户已经有学校，默认选中
        const user = getMe();
        if (user?.tenantId) {
          setSelectedTenantId(user.tenantId);
        }
      } catch (error) {
        console.error("获取学校列表失败:", error);
        toast.error("获取学校列表失败");
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const handleSubmit = async () => {
    if (!selectedTenantId) {
      toast.error("请选择学校");
      return;
    }

    setSubmitting(true);
    try {
      // 调用后端 API 更新用户的学校信息
      const response = await fetch('/api/users/me/tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ tenantId: selectedTenantId }),
      });

      if (!response.ok) {
        throw new Error('更新学校信息失败');
      }

      // 更新本地用户信息
      const user = getMe();
      if (user) {
        updateMe({ ...user, tenantId: selectedTenantId });
      }

      toast.success("学校选择成功");
      onSuccess?.();
    } catch (error) {
      console.error("学校选择失败:", error);
      toast.error("学校选择失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="school-select">选择学校</Label>
        <Select 
          value={selectedTenantId?.toString() || ""} 
          onValueChange={(value) => setSelectedTenantId(value ? Number(value) : null)}
          disabled={loading || submitting}
        >
          <SelectTrigger id="school-select">
            <SelectValue placeholder="请选择您的学校" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id.toString()}>
                {tenant.name} {tenant.short_name && `(${tenant.short_name})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting || !selectedTenantId}
      >
        {submitting ? "提交中..." : "确认选择"}
      </Button>
    </div>
  );
}

export function SchoolSelectPrompt({ onSelected }: { onSelected?: () => void }) {
  const [showSelectDialog, setShowSelectDialog] = useState(false);

  return (
    <>
      <Button onClick={() => setShowSelectDialog(true)} className="gap-2">
        <Building className="h-4 w-4" />
        选择学校
      </Button>
      <dialog open={showSelectDialog} onClose={() => setShowSelectDialog(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg border border-border p-6 shadow-lg max-w-md w-full">
          <div className="flex items-center gap-2 mb-4">
            <School className="h-5 w-5" />
            <h2 className="text-xl font-semibold">选择学校</h2>
          </div>
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardDescription>
                请选择您所在的学校，这将用于身份验证。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolSelect onSuccess={() => {
                setShowSelectDialog(false);
                onSelected?.();
              }} />
            </CardContent>
          </Card>
        </div>
      </dialog>
    </>
  );
}

export function RequireSchoolSelect({ children }: { children: React.ReactNode }) {
  const [showSelectDialog, setShowSelectDialog] = useState(false);

  return (
    <>
      {children}
      <dialog open={showSelectDialog} onClose={() => setShowSelectDialog(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg border border-border p-6 shadow-lg max-w-md w-full">
          <div className="flex items-center gap-2 mb-4">
            <School className="h-5 w-5" />
            <h2 className="text-xl font-semibold">选择学校</h2>
          </div>
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardDescription>
                需要先选择学校才能使用交易功能，请选择您所在的学校。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolSelect onSuccess={() => setShowSelectDialog(false)} />
            </CardContent>
          </Card>
        </div>
      </dialog>
    </>
  );
}

export function useSchoolSelection() {
  const [showSelectDialog, setShowSelectDialog] = useState(false);

  const checkAndPromptSelection = (hasTenant: boolean) => {
    if (!hasTenant) {
      setShowSelectDialog(true);
      return false;
    }
    return true;
  };

  return { showSelectDialog, setShowSelectDialog, checkAndPromptSelection };
}
