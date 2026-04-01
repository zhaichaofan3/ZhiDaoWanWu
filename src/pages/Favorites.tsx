import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { mockProducts } from "@/data/mock";
import { getFavoriteIds } from "@/lib/favorites";

const Favorites = () => {
  const favIds = getFavoriteIds();
  const favProducts = mockProducts
    .filter((p) => favIds.includes(p.id))
    .map((p) => ({ ...p, isFavorited: true }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-4 md:py-6">
          <h1 className="text-xl font-bold text-foreground mb-4">我的收藏</h1>
          <p className="text-sm text-muted-foreground mb-4">共 {favProducts.length} 件收藏商品</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {favProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
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
