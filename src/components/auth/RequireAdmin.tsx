import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getMe, type Me } from "@/lib/auth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [resolved, setResolved] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const existing = getMe();
    if (existing) {
      setOk(existing.role === "admin");
      setResolved(true);
      if (existing.role !== "admin") navigate("/", { replace: true });
      return;
    }

    api
      .me()
      .then((me: Me) => {
        setOk(me.role === "admin");
        setResolved(true);
        if (me.role !== "admin") navigate("/", { replace: true });
      })
      .catch(() => {
        setOk(false);
        setResolved(true);
        navigate("/login", { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!resolved) return null;
  return ok ? <>{children}</> : null;
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [resolved, setResolved] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((me: any) => {
        // 这里需要根据后端返回的权限信息判断
        // 暂时使用 role === "admin" 作为判断
        setOk(me.role === "admin");
        setResolved(true);
        if (me.role !== "admin") navigate("/admin", { replace: true });
      })
      .catch(() => {
        setOk(false);
        setResolved(true);
        navigate("/login", { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!resolved) return null;
  return ok ? <>{children}</> : null;
}

export function RequireTenantAdmin({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [resolved, setResolved] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((me: any) => {
        // 这里需要根据后端返回的权限信息判断
        // 暂时使用 role === "admin" 作为判断
        setOk(me.role === "admin" && me.tenantId);
        setResolved(true);
        if (me.role !== "admin") navigate("/", { replace: true });
        else if (!me.tenantId) navigate("/admin", { replace: true });
      })
      .catch(() => {
        setOk(false);
        setResolved(true);
        navigate("/login", { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!resolved) return null;
  return ok ? <>{children}</> : null;
}

