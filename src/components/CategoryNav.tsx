import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type UiCategory = { id: string; name: string; icon: string };

const CategoryNav = () => {
  const [categories, setCategories] = useState<UiCategory[]>([]);

  useEffect(() => {
    api
      .listCategories()
      .then((rows) => {
        const top = rows.filter((c) => c.parentId == null);
        setCategories(top.map((c) => ({ id: c.id, name: c.name, icon: "📦" })));
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          to={`/products?category=${cat.id}`}
          className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-secondary transition-colors group"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
};

export default CategoryNav;
