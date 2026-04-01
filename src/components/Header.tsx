import { Link, useLocation } from "react-router-dom";
import { Search, Heart, MessageCircle, User, Menu, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 只有登录后才获取未读消息数量
    if (getToken()) {
      api.listNotifications().then((notifications) => {
        // 计算未读消息数量
        const count = notifications.filter(n => !n.is_read).length;
        setUnreadCount(count);
      }).catch(() => {
        setUnreadCount(0);
      });
    }
  }, []);

  const navItems = [
    { path: "/", label: "首页" },
    { path: "/products", label: "商品广场" },
    { path: "/publish", label: "发布闲置", icon: Plus },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            校
          </div>
          <span className="font-bold text-foreground hidden sm:block">校园二手</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索闲置好物..."
              className="pl-9 h-9 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/favorites">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Heart className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/messages">
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <MessageCircle className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <User className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="ml-1">登录</Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 animate-fade-in">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                <Button variant={isActive(item.path) ? "default" : "ghost"} className="w-full justify-start gap-2">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Button>
              </Link>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex gap-2">
              <Link to="/profile" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">个人中心</Button>
              </Link>
              <Link to="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">登录</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
