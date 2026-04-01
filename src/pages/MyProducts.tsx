import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { mockProducts } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Edit, ArrowUpDown, Trash2, Eye, Heart, Plus } from "lucide-react";

const statusColorMap: Record<string, string> = {
  "审核中": "bg-warning/10 text-warning border-warning/20",
  "已上架": "bg-success/10 text-success border-success/20",
  "已下架": "bg-muted text-muted-foreground",
  "已驳回": "bg-destructive/10 text-destructive border-destructive/20",
  "已售出": "bg-primary/10 text-primary border-primary/20",
};

const MyProducts = () => {
  // Mock: user's own products
  const myProducts = mockProducts.slice(0, 5).map((p, i) => ({
    ...p,
    status: (["已上架", "审核中", "已下架", "已驳回", "已售出"] as const)[i % 5],
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container max-w-3xl py-4 md:py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-foreground">我的发布</h1>
            <Link to="/publish">
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> 发布闲置</Button>
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {["全部", "已上架", "审核中", "已下架", "已驳回", "已售出"].map((s) => (
              <Button key={s} variant={s === "全部" ? "default" : "outline"} size="sm" className="shrink-0 h-7 text-xs">
                {s}
              </Button>
            ))}
          </div>

          {/* Product List */}
          <div className="space-y-3">
            {myProducts.map((product) => (
              <div key={product.id} className="rounded-lg border border-border bg-card p-4 flex gap-4">
                <Link to={`/product/${product.id}`} className="shrink-0">
                  <img src={product.images[0]} alt="" className="h-20 w-20 rounded-md object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="text-sm font-medium text-foreground line-clamp-1 hover:text-primary">
                        {product.title}
                      </h3>
                    </Link>
                    <Badge variant="outline" className={`shrink-0 text-xs ${statusColorMap[product.status]}`}>
                      {product.status}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-destructive mt-1">¥{product.price}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{product.views}</span>
                    <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{product.favorites}</span>
                    <span>{product.createdAt}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="编辑">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="上/下架">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="删除">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyProducts;
