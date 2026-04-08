import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge as StatusBadge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Pencil, Trash2 } from "lucide-react";

type DictType = "campus" | "condition";

type DictItemRow = {
  id: string;
  dict_type: string;
  value: string;
  label: string;
  sort: number;
  enabled: boolean;
};

const dictTypeOptions: Array<{ id: DictType; label: string; desc: string }> = [
  { id: "campus", label: "校区", desc: "交易校区选项" },
  { id: "condition", label: "成色", desc: "商品新旧程度选项" },
];

export default function DictManagement() {
  const [type, setType] = useState<DictType>("campus");
  const [list, setList] = useState<DictItemRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<DictItemRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ value: "", label: "", enabled: true });

  const activeMeta = useMemo(() => dictTypeOptions.find((x) => x.id === type), [type]);

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = (await api.adminListDictItems(type)) as DictItemRow[];
      setList(rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh().catch(() => setList([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const openCreate = () => {
    setIsNew(true);
    setEditing(null);
    setForm({ value: "", label: "", enabled: true });
  };

  const openEdit = (row: DictItemRow) => {
    setIsNew(false);
    setEditing(row);
    setForm({ value: row.value, label: row.label, enabled: row.enabled });
  };

  const save = async () => {
    if (!form.value.trim() || !form.label.trim()) return;
    if (isNew) {
      await api.adminCreateDictItem(type, {
        value: form.value.trim(),
        label: form.label.trim(),
        enabled: form.enabled,
      });
    } else if (editing) {
      await api.adminUpdateDictItem(type, editing.id, {
        value: form.value.trim(),
        label: form.label.trim(),
        enabled: form.enabled,
      });
    }
    await refresh();
    setIsNew(false);
    setEditing(null);
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= list.length) return;
    const arr = [...list];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    await api.adminSortDictItems(type, arr.map((x) => x.id));
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{list.length} 项</Badge>
          <div className="w-56">
            <Select value={type} onValueChange={(v) => setType(v as DictType)}>
              <SelectTrigger>
                <SelectValue placeholder="选择字典类型" />
              </SelectTrigger>
              <SelectContent>
                {dictTypeOptions.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{activeMeta?.desc}</span>
        </div>
        <Button size="sm" className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" /> 新增选项
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">字典管理</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">排序</TableHead>
                  <TableHead>展示</TableHead>
                  <TableHead>值（写入数据库）</TableHead>
                  <TableHead className="w-20">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{row.sort ?? idx + 1}</TableCell>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-muted-foreground">{row.value}</TableCell>
                    <TableCell>
                      <StatusBadge variant={row.enabled ? "default" : "secondary"}>
                        {row.enabled ? "启用" : "禁用"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => move(idx, 1)}
                          disabled={idx === list.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await api.adminUpdateDictItem(type, row.id, { enabled: !row.enabled });
                            await refresh();
                          }}
                        >
                          {row.enabled ? "禁用" : "启用"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await api.adminDeleteDictItem(type, row.id);
                            await refresh();
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isNew || !!editing} onOpenChange={() => { setIsNew(false); setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "新增字典项" : "编辑字典项"}</DialogTitle>
            <DialogDescription>
              {activeMeta?.label} 的选项会影响发布页与管理端商品抽屉的下拉列表。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">展示文本（label）</label>
              <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">值（value）</label>
              <Input
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="建议与 label 相同；改动会影响历史商品字段匹配"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">是否启用</label>
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
            <Button variant="outline" onClick={() => { setIsNew(false); setEditing(null); }}>
              取消
            </Button>
            <Button onClick={save} disabled={!form.value.trim() || !form.label.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

