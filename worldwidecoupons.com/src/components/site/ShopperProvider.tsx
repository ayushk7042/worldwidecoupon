"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { account } from "@/lib/endpoints";
import { clearToken, readToken, writeToken } from "@/lib/session";
import type { Shopper } from "@/lib/types";

interface ShopperState {
  shopper: Shopper | null;
  loading: boolean;
  /** Ids of saved coupons, so every card can render its state without a call. */
  savedIds: Set<string>;
  favouriteIds: Set<string>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, newsletter: boolean) => Promise<void>;
  logout: () => Promise<void>;
  toggleSaved: (couponId: string) => Promise<boolean>;
  toggleFavourite: (storeId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const ShopperContext = createContext<ShopperState | null>(null);

export function ShopperProvider({ children }: { children: ReactNode }) {
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());

  const loadCollections = useCallback(async () => {
    const token = readToken("shopper");

    const [saved, favourites] = await Promise.allSettled([
      account.saved(token),
      account.favourites(token),
    ]);

    if (saved.status === "fulfilled") {
      setSavedIds(new Set(saved.value.map((coupon) => coupon._id)));
    }
    if (favourites.status === "fulfilled") {
      setFavouriteIds(new Set(favourites.value.map((store) => store._id)));
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const me = await account.me(readToken("shopper"));
      setShopper(me);
      await loadCollections();
    } catch {
      // A 401 here just means "signed out", which is the common case.
      setShopper(null);
      setSavedIds(new Set());
      setFavouriteIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [loadCollections]);

  useEffect(() => {
    // Skip the round trip entirely for the majority who are not signed in.
    if (!readToken("shopper")) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await account.login(email, password);
      writeToken("shopper", result.token);
      setShopper(result.user);
      await loadCollections();
    },
    [loadCollections]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, newsletter: boolean) => {
      const result = await account.register({ name, email, password, newsletter });
      writeToken("shopper", result.token);
      setShopper(result.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await account.logout().catch(() => undefined);
    clearToken("shopper");
    setShopper(null);
    setSavedIds(new Set());
    setFavouriteIds(new Set());
  }, []);

  const toggleSaved = useCallback(async (couponId: string) => {
    const result = await account.toggleSaved(couponId, readToken("shopper"));

    setSavedIds((current) => {
      const next = new Set(current);
      if (result.saved) next.add(couponId);
      else next.delete(couponId);
      return next;
    });

    return result.saved;
  }, []);

  const toggleFavourite = useCallback(async (storeId: string) => {
    const result = await account.toggleFavourite(storeId, readToken("shopper"));

    setFavouriteIds((current) => {
      const next = new Set(current);
      if (result.following) next.add(storeId);
      else next.delete(storeId);
      return next;
    });

    return result.following;
  }, []);

  const value = useMemo<ShopperState>(
    () => ({
      shopper,
      loading,
      savedIds,
      favouriteIds,
      login,
      register,
      logout,
      toggleSaved,
      toggleFavourite,
      refresh,
    }),
    [shopper, loading, savedIds, favouriteIds, login, register, logout, toggleSaved, toggleFavourite, refresh]
  );

  return <ShopperContext.Provider value={value}>{children}</ShopperContext.Provider>;
}

export function useShopper(): ShopperState {
  const context = useContext(ShopperContext);
  if (!context) {
    throw new Error("useShopper must be used inside <ShopperProvider>");
  }
  return context;
}
