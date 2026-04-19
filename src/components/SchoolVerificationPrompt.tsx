import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getMe, updateMe } from "@/lib/auth";
import { School, CheckCircle, Building, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StudentIdInputProps {
  onSuccess?: () => void;
}

export function StudentIdInput({ onSuccess }: StudentIdInputProps) {
  const [studentId, setStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!studentId.trim()) {
      toast.error("请输入学号");
      return;
    }
    if (studentId.trim().length < 4 || studentId.trim().length > 20) {
      toast.error("学号长度应为4-20位");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(studentId.trim())) {
      toast.error("学号只能包含字母和数字");
      return;
    }

    setSubmitting(true);
    try {
      await api.setStudentId({ studentId: studentId.trim() });
      
      // 更新本地用户信息
      const user = getMe();
      if (user) {
        updateMe({ ...user, studentId: studentId.trim(), hasStudentId: true });
      }
      
      toast.success("学号登记成功");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "学号登记失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="student-id">学号</Label>
        <Input
          id="student-id"
          placeholder="请输入您的学号"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          disabled={submitting}
        />
      </div>
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting || !studentId.trim()}
      >
        {submitting ? "提交中..." : "确认登记"}
      </Button>
    </div>
  );
}

export function SchoolVerificationPrompt({ onVerified }: { onVerified?: () => void }) {
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [step, setStep] = useState<"school" | "studentId">('school');
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
        
        // 如果用户已经有学校，直接进入学号登记
        const user = getMe();
        if (user?.tenantId) {
          setSelectedTenantId(user.tenantId);
          setStep('studentId');
        }
      } catch (error) {
        console.error("获取学校列表失败:", error);
        toast.error("获取学校列表失败");
      } finally {
        setLoading(false);
      }
    };

    if (showVerifyDialog && step === 'school') {
      fetchTenants();
    }
  }, [showVerifyDialog, step]);

  const handleSchoolSubmit = async () => {
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
      setStep('studentId');
    } catch (error) {
      console.error("学校选择失败:", error);
      toast.error("学校选择失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentIdSuccess = () => {
    setShowVerifyDialog(false);
    onVerified?.();
  };

  return (
    <>
      <Button onClick={() => setShowVerifyDialog(true)} className="gap-2">
        <School className="h-4 w-4" />
        认证
      </Button>
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === 'school' ? (
                <>
                  <Building className="h-5 w-5" />
                  选择学校
                </>
              ) : (
                <>
                  <School className="h-5 w-5" />
                  登记学号
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardDescription>
                {step === 'school' 
                  ? '请选择您所在的学校，这将用于身份验证。' 
                  : '请登记您的学号，登记后才能使用交易功能。'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'school' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-select">学校</Label>
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
                    onClick={handleSchoolSubmit}
                    disabled={submitting || !selectedTenantId}
                  >
                    {submitting ? "提交中..." : "下一步"}
                  </Button>
                </div>
              ) : (
                <StudentIdInput onSuccess={handleStudentIdSuccess} />
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RequireStudentId({ children }: { children: React.ReactNode }) {
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [step, setStep] = useState<"school" | "studentId">('school');
  const [tenants, setTenants] = useState<Array<{ id: number; code: string; name: string; short_name?: string }>>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = getMe();
    if (user && (!user.tenantId || !user.hasStudentId)) {
      setShowVerifyDialog(true);
    }
  }, []);

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      try {
        const tenantList = await api.listTenants();
        setTenants(tenantList);
        
        // 如果用户已经有学校，直接进入学号登记
        const user = getMe();
        if (user?.tenantId) {
          setSelectedTenantId(user.tenantId);
          setStep('studentId');
        }
      } catch (error) {
        console.error("获取学校列表失败:", error);
        toast.error("获取学校列表失败");
      } finally {
        setLoading(false);
      }
    };

    if (showVerifyDialog && step === 'school') {
      fetchTenants();
    }
  }, [showVerifyDialog, step]);

  const handleSchoolSubmit = async () => {
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
      setStep('studentId');
    } catch (error) {
      console.error("学校选择失败:", error);
      toast.error("学校选择失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentIdSuccess = () => {
    setShowVerifyDialog(false);
  };

  return (
    <>
      {children}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === 'school' ? (
                <>
                  <Building className="h-5 w-5" />
                  完成认证
                </>
              ) : (
                <>
                  <School className="h-5 w-5" />
                  完成认证
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardDescription>
                {step === 'school' 
                  ? '需要先选择学校才能使用交易功能，请选择您所在的学校。' 
                  : '需要先登记学号才能使用交易功能，请输入您的学号。'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'school' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-select">学校</Label>
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
                    onClick={handleSchoolSubmit}
                    disabled={submitting || !selectedTenantId}
                  >
                    {submitting ? "提交中..." : "下一步"}
                  </Button>
                </div>
              ) : (
                <StudentIdInput onSuccess={handleStudentIdSuccess} />
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useStudentIdVerification() {
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [step, setStep] = useState<"school" | "studentId">('school');
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
        
        // 如果用户已经有学校，直接进入学号登记
        const user = getMe();
        if (user?.tenantId) {
          setSelectedTenantId(user.tenantId);
          setStep('studentId');
        }
      } catch (error) {
        console.error("获取学校列表失败:", error);
        toast.error("获取学校列表失败");
      } finally {
        setLoading(false);
      }
    };

    if (showVerifyDialog && step === 'school') {
      fetchTenants();
    }
  }, [showVerifyDialog, step]);

  const checkAndPromptVerification = (hasTenant: boolean, hasStudentId: boolean) => {
    if (!hasTenant || !hasStudentId) {
      setShowVerifyDialog(true);
      return false;
    }
    return true;
  };

  const handleSchoolSubmit = async () => {
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
      setStep('studentId');
    } catch (error) {
      console.error("学校选择失败:", error);
      toast.error("学校选择失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentIdSuccess = () => {
    setShowVerifyDialog(false);
  };

  return { 
    showVerifyDialog, 
    setShowVerifyDialog, 
    checkAndPromptVerification,
    step,
    tenants,
    selectedTenantId,
    setSelectedTenantId,
    loading,
    submitting,
    handleSchoolSubmit,
    handleStudentIdSuccess
  };
}
