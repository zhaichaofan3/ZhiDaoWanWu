import { Route } from "react-router-dom";
import {
  AnnouncementsPage,
  AddressesPage,
  ChangePasswordPage,
  ChangePhonePage,
  ChatPage,
  FavoritesPage,
  ForgotPasswordPage,
  IndexPage,
  LoginPage,
  MessagesPage,
  MyProductsPage,
  NotFoundPage,
  OrderDetailPage,
  OrderEvaluatePage,
  OrdersPage,
  ProductDetailPage,
  ProductsPage,
  ProfilePage,
  PublishProductPage,
  RegisterPage,
  TestNewFeaturesPage,
} from "@/features/public/pages";

export const publicRoutes = (
  <>
    <Route path="/" element={<IndexPage />} />
    <Route path="/products" element={<ProductsPage />} />
    <Route path="/product/:id" element={<ProductDetailPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/announcements" element={<AnnouncementsPage />} />
    <Route path="/publish" element={<PublishProductPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/my-products" element={<MyProductsPage />} />
    <Route path="/favorites" element={<FavoritesPage />} />
    <Route path="/addresses" element={<AddressesPage />} />
    <Route path="/change-password" element={<ChangePasswordPage />} />
    <Route path="/change-phone" element={<ChangePhonePage />} />
    <Route path="/messages" element={<MessagesPage />} />
    <Route path="/chat/:id" element={<ChatPage />} />
    <Route path="/orders" element={<OrdersPage />} />
    <Route path="/order/:id" element={<OrderDetailPage />} />
    <Route path="/order/:id/evaluate" element={<OrderEvaluatePage />} />
    <Route path="/test-new-features" element={<TestNewFeaturesPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </>
);
