import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PublishProduct from "./pages/PublishProduct";
import Profile from "./pages/Profile";
import MyProducts from "./pages/MyProducts";
import Favorites from "./pages/Favorites";
import Addresses from "./pages/Addresses";
import ChangePassword from "./pages/ChangePassword";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import AdminLayout from "./components/AdminLayout";
import RequireAdmin from "./components/auth/RequireAdmin";
import Dashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import ProductAudit from "./pages/admin/ProductAudit";
import AnnouncementManagement from "./pages/admin/AnnouncementManagement";
import BannerManagement from "./pages/admin/BannerManagement";
import CategoryManagement from "./pages/admin/CategoryManagement";
import OrderManagement from "./pages/admin/OrderManagement";
import ComplaintManagement from "./pages/admin/ComplaintManagement";
import EvaluationManagement from "./pages/admin/EvaluationManagement";
import FavoriteManagement from "./pages/admin/FavoriteManagement";
import LogManagement from "./pages/admin/LogManagement";
import NotFound from "./pages/NotFound";
import TestNewFeatures from "./pages/TestNewFeatures";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/publish" element={<PublishProduct />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-products" element={<MyProducts />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/addresses" element={<Addresses />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/test-new-features" element={<TestNewFeatures />} />
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="products" element={<ProductAudit />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="complaints" element={<ComplaintManagement />} />
            <Route path="evaluations" element={<EvaluationManagement />} />
            <Route path="favorites" element={<FavoriteManagement />} />
            <Route path="logs" element={<LogManagement />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="announcements" element={<AnnouncementManagement />} />
            <Route path="banners" element={<BannerManagement />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
