"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth } from "@/lib/endpoints";
import { clearToken, readToken, writeToken } from "@/lib/session";
import type { AdminPermission, AdminUser } from "@/lib/types";

interface AdminState {
  admin: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: AdminPermission) => boolean;
  refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const stored = readToken("admin");
    setToken(stored);

    if (!stored) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      setAdmin(await auth.me(stored));
    } catch {
      // An expired token is indistinguishable from none at this point.
      clearToken("admin");
      setToken(null);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The login page is the one admin route that must render signed out.
  useEffect(() => {
    if (loading) return;
    if (!admin && pathname !== "/admin/login") {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, admin, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await auth.login(email, password);
    writeToken("admin", result.token);
    setToken(result.token);
    setAdmin(result.admin);
  }, []);

  const logout = useCallback(async () => {
    await auth.logout().catch(() => undefined);
    clearToken("admin");
    setToken(null);
    setAdmin(null);
    router.replace("/admin/login");
  }, [router]);

  const can = useCallback(
    (permission: AdminPermission) => {
      if (!admin) return false;
      if (admin.role === "superadmin") return true;
      if (admin.role === "viewer") return false;
      return Boolean(admin.permissions?.[permission]);
    },
    [admin]
  );

  const value = useMemo<AdminState>(
    () => ({ admin, token, loading, login, logout, can, refresh }),
    [admin, token, loading, login, logout, can, refresh]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminState {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside <AdminProvider>");
  return context;
}
