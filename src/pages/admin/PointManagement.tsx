import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Pencil, Coins } from "lucide-react";
import { toast } from "sonner";

type PointRule = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  points: number;
  enabled: boolean;
  tenant_id: number | null;
  created_at: string;
  updated_at: string;
};

export default function PointManagement() {
  const [list, setList] = useState<PointRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PointRule | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    points: 0,
    enabled: true,
  });
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const rules = await api.adminGetPointRules();
      // 只显示购买和签到两种规则
      const filteredRules = (rules || []).filter(rule => 
        rule.code === 'purchase' || rule.code === 'sign_in'
      );
      setList(filteredRules);
    } catch (err) {
      console.error("加载积分规则失败:", err);
      toast.error("加载积分规则失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openEdit = (rule: PointRule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      description: rule.description || "",
      points: rule.points,
      enabled: rule.enabled,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("请填写规则名称");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.adminUpdatePointRule(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          points: form.points,
          enabled: form.enabled,
        });
        toast.success("更新成功");
      }
      await refresh();
      setEditing(null);
    } catch (err) {
      console.error("保存失败:", err);
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: PointRule) => {
    try {
      await api.adminUpdatePointRule(rule.id, {
        enabled: !rule.enabled,
      });
      await refresh();
      toast.success(rule.enabled ? "已禁用" : "已启用");
    } catch (err) {
      console.error("切换状态失败:", err);
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  function handleDelete(rule: PointRule): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <Badge variant="secondary">{list.length} 条规则</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">积分规则</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则代码</TableHead>
                  <TableHead>规则名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="text-center">积分</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono text-sm">{rule.code}</TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {rule.description || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={rule.points >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {rule.points >= 0 ? "+" : ""}{rule.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? "启用" : "禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(rule)}
                        >
                          {rule.enabled ? "禁用" : "启用"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      暂无积分规则
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={() => { setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑积分规则</DialogTitle>
            <DialogDescription>
              配置积分获取规则，仅可修改名称、描述和积分值。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">规则代码</Label>
              <Input
                value={editing?.code || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">规则代码不可修改</p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">规则名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例如：每日签到"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">描述</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="规则的详细说明（可选）"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">积分值 *</Label>
              <Input
                type="number"
                value={form.points}
                onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) || 0 }))}
                placeholder="正数加积分"
              />
              <p className="text-xs text-muted-foreground mt-1">正数表示获得积分</p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">启用状态</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={form.enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, enabled: true }))}
                >
                  启用
                </Button>
                <Button
                  type="button"
                  variant={!form.enabled ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, enabled: false }))}
                >
                  禁用
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); }}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}