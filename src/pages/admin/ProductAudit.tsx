import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Search, Check, X, Eye } from "lucide-react";
import { api } from "@/lib/api";

type AuditStatus = "审核中" | "已上架" | "已驳回" | "已下架";

interface AuditProduct {
  id: number;
  title: string;
  price: number;
  category: string;
  seller: string;
  sellerId: number | null;
  status: AuditStatus;
  image: string;
  description: string;
  createdAt: string;
}

const ProductAudit = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditStatus | "全部">("全部");
  const [products, setProducts] = useState<AuditProduct[]>([]);
  const [viewProduct, setViewProduct] = useState<AuditProduct | null>(null);
  const [rejectProduct, setRejectProduct] = useState<AuditProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const mapStatus = (status: string): AuditStatus => {
    if (status === "approved") return "已上架";
    if (status === "rejected") return "已驳回";
    if (status === "down") return "已下架";
    return "审核中";
  };

  const refresh = async () => {
    const list = await api.adminListProducts();
    const mapped: AuditProduct[] = list.map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category || "-",
      seller: p.seller_name || "Unknown",
      sellerId: p.seller_id,
      status: mapStatus(p.status),
      image: p.image_url || "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=200&h=200&fit=crop",
      description: p.description || "",
      createdAt: (p.created_at || "").slice(0, 10),
    }));
    setProducts(mapped);
  };

  useEffect(() => {
    refresh().catch(() => setProducts([]));
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch = p.title.includes(search) || p.seller.includes(search);
    const matchStatus = statusFilter === "全部" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleApprove = async (id: number) => {
    await api.adminAuditProduct(id, "approve");
    await refresh();
  };

  const handleReject = async () => {
    if (!rejectProduct) return;
    await api.adminAuditProduct(rejectProduct.id, "reject", rejectReason);
    await refresh();
    setRejectProduct(null);
    setRejectReason("");
  };

  const handleForceDown = async (id: number) => {
    await api.adminAuditProduct(id, "down");
    await refresh();
  };

  const statusFilters: Array<AuditStatus | "全部"> = ["全部", "审核中", "已上架", "已驳回", "已下架"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索商品或卖家..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>卖家</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <img src={product.image} alt="" className="h-10 w-10 rounded-md object-cover" />
                      <span className="text-sm font-medium truncate max-w-[180px]">{product.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{product.category}</TableCell>
                  <TableCell className="text-sm font-medium text-primary">¥{product.price}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{product.seller}</TableCell>
                  <TableCell>
                    <Badge variant={
                      product.status === "已上架" ? "default" :
                      product.status === "审核中" ? "secondary" :
                      product.status === "已驳回" ? "destructive" : "outline"
                    }>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{product.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewProduct(product)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {product.status === "审核中" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="通过" onClick={() => handleApprove(product.id)}>
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="驳回" onClick={() => setRejectProduct(product)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {product.status === "已上架" && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleForceDown(product.id)}>
                          强制下架
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>商品详情</DialogTitle>
            <DialogDescription>查看商品的完整信息</DialogDescription>
          </DialogHeader>
          {viewProduct && (
            <div className="space-y-4">
              <img src={viewProduct.image} alt="" className="w-full h-48 object-cover rounded-lg" />
              <div>
                <h3 className="font-semibold text-foreground">{viewProduct.title}</h3>
                <p className="text-xl font-bold text-primary mt-1">¥{viewProduct.price}</p>
              </div>
              <p className="text-sm text-muted-foreground">{viewProduct.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">分类：</span>{viewProduct.category}</div>
                <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">卖家：</span>{viewProduct.seller}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewProduct(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectProduct} onOpenChange={() => { setRejectProduct(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回商品</DialogTitle>
            <DialogDescription>请填写驳回原因，将通知卖家</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="请输入驳回原因..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectProduct(null); setRejectReason(""); }}>取消</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>确认驳回</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductAudit;
