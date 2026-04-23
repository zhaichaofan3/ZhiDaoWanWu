import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";

const SITE_NAME = "智达万物";

type TitleRule = {
  path: string;
  title: string;
};

const TITLE_RULES: TitleRule[] = [
  // Admin (more specific first)
  { path: "/admin/users/:id", title: "用户详情" },
  { path: "/admin/users", title: "用户管理" },
  { path: "/admin/products", title: "商品管理" },
  { path: "/admin/orders", title: "订单管理" },
  { path: "/admin/complaints", title: "投诉管理" },
  { path: "/admin/evaluations", title: "评价管理" },
  { path: "/admin/favorites", title: "收藏管理" },
  { path: "/admin/logs", title: "日志管理" },
  { path: "/admin/categories", title: "分类管理" },
  { path: "/admin/dicts", title: "字典管理" },
  { path: "/admin/ai", title: "AI 中心" },
  { path: "/admin/announcements", title: "公告管理" },
  { path: "/admin/banners", title: "轮播图管理" },
  { path: "/admin", title: "管理后台" },

  // Public
  { path: "/product/:id", title: "商品详情" },
  { path: "/order/:id/evaluate", title: "订单评价" },
  { path: "/order/:id", title: "订单详情" },
  { path: "/chat/:id", title: "聊天" },
  { path: "/products", title: "商品列表" },
  { path: "/login", title: "登录" },
  { path: "/forgot-password", title: "找回密码" },
  { path: "/register", title: "注册" },
  { path: "/announcements", title: "公告" },
  { path: "/publish", title: "发布商品" },
  { path: "/profile", title: "个人资料" },
  { path: "/my-products", title: "我的商品" },
  { path: "/favorites", title: "我的收藏" },
  { path: "/addresses", title: "收货地址" },
  { path: "/change-password", title: "修改密码" },
  { path: "/change-phone", title: "更换手机号" },
  { path: "/messages", title: "消息" },
  { path: "/orders", title: "我的订单" },
  { path: "/test-new-features", title: "新功能测试" },
  { path: "/", title: "首页" },
];

function getTitleForPathname(pathname: string): string | null {
  for (const rule of TITLE_RULES) {
    const matched = matchPath({ path: rule.path, end: true }, pathname);
    if (matched) return rule.title;
  }
  return null;
}

export default function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageTitle = getTitleForPathname(pathname) ?? "页面不存在";
    document.title = `${pageTitle} - ${SITE_NAME}`;
  }, [pathname]);

  return null;
}

