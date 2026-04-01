import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";

type CategoryRow = {
  id: string;
  name: string;
  parentId: string | null;
  sort: number;
  enabled: boolean;
};

export default function CategoryManagement() {
  const [list, setList] = useState<CategoryRow[]>([]);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  const refresh = async () => {
    const rows = await api.adminListCategories();
    setList(rows as CategoryRow[]);
  };

  useEffect(() => {
    refresh().catch(() => setList([]));
  }, []);

  const topLevel = useMemo(() => list.filter((x) => x.parentId == null), [list]);
  const parentNameMap = useMemo(
    () => new Map(list.map((x) => [x.id, x.name])),
    [list]
  );

  const openCreate = (pid: string | null = null) => {
    setEditing(null);
    setIsNew(true);
    setName("");
    setParentId(pid);
  };

  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    setIsNew(false);
    setName(row.name);
    setParentId(row.parentId);
  };

  const save = async () => {
    if (!name.trim()) return;
    if (isNew) {
      await api.adminCreateCategory({ name: name.trim(), parentId });
    } else if (editing) {
      await api.adminUpdateCategory(editing.id, { name: name.trim() });
    }
    await refresh();
    setEditing(null);
    setIsNew(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{list.length} 个分类</Badge>
        <Button size="sm" className="gap-1" onClick={() => openCreate(null)}>
          <Plus className="h-4 w-4" /> 新增一级分类
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>层级</TableHead>
                <TableHead>父级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.parentId ? "二级" : "一级"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.parentId ? parentNameMap.get(row.parentId) || "-" : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.enabled ? "default" : "secondary"}>
                      {row.enabled ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!row.parentId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreate(row.id)}
                        >
                          新增子类
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          await api.adminDeleteCategory(row.id);
                          await refresh();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isNew || !!editing} onOpenChange={() => { setIsNew(false); setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "新增分类" : "编辑分类"}</DialogTitle>
            <DialogDescription>
              {isNew
                ? parentId
                  ? `将在 ${topLevel.find((x) => x.id === parentId)?.name || "一级分类"} 下新增子分类`
                  : "创建一级分类"
                : "修改分类名称"}
            </DialogDescription>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="分类名称" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsNew(false); setEditing(null); }}>
              取消
            </Button>
            <Button onClick={save} disabled={!name.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

