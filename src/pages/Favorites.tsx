import Header from "@/features/public/components/Header";
import Footer from "@/features/public/components/Footer";
import ProductCard from "@/features/public/components/ProductCard";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getMe } from "@/lib/auth";
import type { Product } from "@/types";

const Favorites = () => {
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFavorites = async () => {
      const me = getMe();
      if (!me) {
        setFavProducts([]);
        return;
      }
      setLoading(true);
      try {
        const [favorites, products] = await Promise.all([api.listFavorites(me.id), api.listProducts()]);
        const favSet = new Set(favorites.map((f) => String(f.product_id)));
        const mapped: Product[] = products
          .filter((p: any) => favSet.has(String(p.id)))
          .map((p: any) => ({
            id: String(p.id),
            title: p.title,
            description: p.description || "",
            price: Number(p.price || 0),
            originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
            condition: p.condition || "轻微使用",
            images: p.images || (p.image_url ? [p.image_url] : []),
            category: p.category || "其他",
            categoryId: p.category_id || "",
            seller: {
              id: String(p.owner_id || ""),
              nickname: p.owner_name || "未知卖家",
              avatar: "",
            },
            status: p.status === "approved" ? "已上架" : "已下架",
            views: p.views || 0,
            favorites: p.favorites || 0,
            campus: p.campus || "",
            createdAt: p.created_at || "",
            isFavorited: true,
          }));
        setFavProducts(mapped);
      } catch {
        setFavProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-4 md:py-6">
          <h1 className="text-xl font-bold text-foreground mb-4">我的收藏</h1>
          <p className="text-sm text-muted-foreground mb-4">共 {favProducts.length} 件收藏商品</p>
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">加载中...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {favProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          {favProducts.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              还没有收藏商品，去逛逛吧~ 💝
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Favorites;
