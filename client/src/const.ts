export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { Capacitor } from "@capacitor/core";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const ANDROID_API_BASE_URL =
  import.meta.env.VITE_ANDROID_API_BASE_URL || "http://10.0.2.2:5000/api";

const getApiBaseUrl = () => {
  if (Capacitor.isNativePlatform() && API_BASE_URL.startsWith("/")) {
    return ANDROID_API_BASE_URL;
  }

  return API_BASE_URL;
};

const getApiOriginUrl = () => {
  const apiBaseUrl = getApiBaseUrl();

  if (apiBaseUrl.startsWith("/")) {
    return "/";
  }

  return apiBaseUrl.replace(/\/api\/?$/, "");
};

export const getApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};

export const getTrpcUrl = () => getApiUrl("/trpc");

export const getSocketUrl = () => getApiOriginUrl();

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!oauthPortalUrl || !appId) {
    return "/login";
  }

  if (typeof window === "undefined") {
    return "/login";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  let url: URL;
  try {
    url = new URL("/app-auth", oauthPortalUrl);
  } catch {
    return "/login";
  }

  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
