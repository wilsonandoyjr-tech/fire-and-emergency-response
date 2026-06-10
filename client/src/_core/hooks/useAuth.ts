import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: "fire" | "medical" | "pulis" | "admin" | "user";
};

const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user") ?? localStorage.getItem("manus-runtime-user-info");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthUser | null;
    if (!parsed) return null;

    return {
      ...parsed,
      role: String(parsed.role).toLowerCase() as AuthUser["role"],
    };
  } catch {
    return null;
  }
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("manus-runtime-user-info");
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const storedUser = getStoredUser();
    const queryUser = meQuery.data
      ? {
          ...meQuery.data,
          role: String(meQuery.data.role).toLowerCase() as AuthUser["role"],
        }
      : null;
    const user = queryUser ?? storedUser;

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));
    }

    return {
      user,
      loading: (!user && meQuery.isLoading) || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(user),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
