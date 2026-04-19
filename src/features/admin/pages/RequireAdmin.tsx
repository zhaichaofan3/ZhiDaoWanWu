import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getMe, getToken } from "@/lib/auth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = getToken();
  const user = getMe();

  if (!token) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}