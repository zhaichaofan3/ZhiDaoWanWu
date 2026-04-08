import { Link } from "react-router-dom";
import { Heart, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types";
import { resolveAssetUrl } from "@/lib/assets";

interface ProductCardProps {
  product: Product;
}

const conditionColorMap: Record<string, string> = {
  "全新": "bg-success text-success-foreground",
  "几乎全新": "bg-primary text-primary-foreground",
  "轻微使用": "bg-warning text-warning-foreground",
  "明显使用": "bg-muted text-muted-foreground",
};

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="rounded-lg border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={resolveAssetUrl(product.images[0])}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <Badge className={`absolute top-2 left-2 text-xs ${conditionColorMap[product.condition] || ""}`}>
            {product.condition}
          </Badge>
          {product.isFavorited && (
            <div className="absolute top-2 right-2">
              <Heart className="h-5 w-5 fill-destructive text-destructive" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-2">
            {product.title}
          </h3>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-destructive">¥{product.price}</span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">¥{product.originalPrice}</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <img src={resolveAssetUrl(product.seller.avatar)} alt="" className="h-4 w-4 rounded-full" />
              <span className="truncate max-w-[80px]">{product.seller.nickname}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <Eye className="h-3 w-3" />{product.views}
              </span>
              <span className="flex items-center gap-0.5">
                <Heart className="h-3 w-3" />{product.favorites}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
