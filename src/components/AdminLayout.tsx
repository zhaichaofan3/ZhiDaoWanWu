import { Outlet, Link, useLocation } from "react-router-dom";
import {
  BarChart3, Users, Package, Megaphone, Image, LogOut, Menu, ListTree, ShoppingCart, AlertTriangle, Star, Heart, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { path: "/admin", label: "数据大盘", icon: BarChart3, end: true },
  { path: "/admin/users", label: "用户管理", icon: Users },
  { path: "/admin/products", label: "商品审核", icon: Package },
  { path: "/admin/orders", label: "订单管理", icon: ShoppingCart },
  { path: "/admin/complaints", label: "投诉处理", icon: AlertTriangle },
  { path: "/admin/evaluations", label: "评价管理", icon: Star },
  { path: "/admin/favorites", label: "收藏管理", icon: Heart },
  { path: "/admin/logs", label: "操作日志", icon: FileText },
  { path: "/admin/categories", label: "分类管理", icon: ListTree },
  { path: "/admin/announcements", label: "公告管理", icon: Megaphone },
  { path: "/admin/banners", label: "轮播图管理", icon: Image },
];

const AdminLayout = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-card flex flex-col transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border shrink-0">
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                管
              </div>
              <span className="font-bold text-foreground text-sm">管理后台</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 shrink-0", collapsed && "mx-auto")}
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path, item.end) ? "secondary" : "ghost"}
                  className={cn(
                    "w-full gap-2",
                    collapsed ? "justify-center px-0" : "justify-start",
                    isActive(item.path, item.end) && "font-medium"
                  )}
                  size="sm"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-border p-2">
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className={cn("w-full gap-2", collapsed ? "justify-center px-0" : "justify-start")}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>返回前台</span>}
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-6 shrink-0">
          <h2 className="font-semibold text-foreground">
            {menuItems.find((m) => isActive(m.path, m.end))?.label || "管理后台"}
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
