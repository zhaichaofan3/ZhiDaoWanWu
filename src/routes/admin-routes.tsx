import { Route } from "react-router-dom";
import {
  AdminLayout,
  AnnouncementManagementPage,
  AiCenterPage,
  BannerManagementPage,
  CategoryManagementPage,
  DictManagementPage,
  ComplaintManagementPage,
  DashboardPage,
  EvaluationManagementPage,
  FavoriteManagementPage,
  LogManagementPage,
  OrderManagementPage,
  ProductManagementPage,
  RequireAdmin,
  UserDetailPage,
  UserManagementPage,
} from "@/features/admin/pages";

export const adminRoutes = (
  <Route
    path="/admin/*"
    element={
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    }
  >
    <Route index element={<DashboardPage />} />
    <Route path="users" element={<UserManagementPage />} />
    <Route path="users/:id" element={<UserDetailPage />} />
    <Route path="products" element={<ProductManagementPage />} />
    <Route path="orders" element={<OrderManagementPage />} />
    <Route path="complaints" element={<ComplaintManagementPage />} />
    <Route path="evaluations" element={<EvaluationManagementPage />} />
    <Route path="favorites" element={<FavoriteManagementPage />} />
    <Route path="logs" element={<LogManagementPage />} />
    <Route path="categories" element={<CategoryManagementPage />} />
    <Route path="dicts" element={<DictManagementPage />} />
    <Route path="ai" element={<AiCenterPage />} />
    <Route path="announcements" element={<AnnouncementManagementPage />} />
    <Route path="banners" element={<BannerManagementPage />} />
  </Route>
);
