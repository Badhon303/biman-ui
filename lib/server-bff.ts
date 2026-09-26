import { NextRequest, NextResponse } from "next/server";

type Tokens = { accessToken: string; refreshToken: string };
type LoginResult = Tokens & {
  mustChangePassword: boolean;
  user: { id: string; email: string; role: string; organization: string };
};

const accessCookie = "biman_access";
const refreshCookie = "biman_refresh";
const apiBaseUrl = (process.env.API_BASE_URL ?? "http://localhost:3001/api").replace(/\/$/, "");
const appOrigin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin : null;
const secureCookie = process.env.NODE_ENV === "production";

function tokenMaxAge(token: string, fallback: number) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (typeof payload.exp === "number") return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  } catch {}
  return fallback;
}

export function setAuthCookies(response: NextResponse, tokens: Tokens) {
  response.cookies.set(accessCookie, tokens.accessToken, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: tokenMaxAge(tokens.accessToken, 15 * 60),
  });
  response.cookies.set(refreshCookie, tokens.refreshToken, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: tokenMaxAge(tokens.refreshToken, 30 * 24 * 60 * 60),
  });
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of [accessCookie, refreshCookie]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }
}

export function requireSameOrigin(request: NextRequest) {
  const expectedOrigin = appOrigin ?? new URL(request.url).origin;
  if (request.headers.get("origin") === expectedOrigin) return null;
  return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
}

function apiUrl(path: string, search = "") {
  return `${apiBaseUrl}/${path.split("/").map(encodeURIComponent).join("/")}${search}`;
}

async function refreshTokens(refreshToken: string): Promise<Tokens | null> {
  try {
    const response = await fetch(apiUrl("auth/refresh"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Tokens;
    return data.accessToken && data.refreshToken ? data : null;
  } catch {
    return null;
  }
}

function responseHeaders(source: Headers) {
  const headers = new Headers();
  for (const name of ["content-type", "content-length", "content-disposition", "cache-control", "etag", "accept-ranges"]) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-content-type-options", "nosniff");
  return headers;
}

export async function proxyApiRequest(request: NextRequest, pathSegments: string[]) {
  const method = request.method;
  if (!["GET", "HEAD"].includes(method)) {
    const rejected = requireSameOrigin(request);
    if (rejected) return rejected;
  }

  if (pathSegments.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\\\"))) {
    return NextResponse.json({ message: "Invalid API path." }, { status: 400 });
  }
  const path = pathSegments.join("/");
  const search = new URL(request.url).search;
  const contentType = request.headers.get("content-type");
  const body = ["GET", "HEAD"].includes(method) ? undefined : await request.arrayBuffer();
  const send = (accessToken: string) =>
    fetch(apiUrl(path, search), {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(contentType ? { "content-type": contentType } : {}),
        ...(request.headers.get("accept") ? { accept: request.headers.get("accept")! } : {}),
      },
      ...(body ? { body } : {}),
      cache: "no-store",
    });

  let accessToken = request.cookies.get(accessCookie)?.value;
  let refreshToken = request.cookies.get(refreshCookie)?.value;
  let rotated: Tokens | null = null;
  if (!accessToken) {
    if (!refreshToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    rotated = await refreshTokens(refreshToken);
    if (!rotated) {
      const response = NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }
    accessToken = rotated.accessToken;
    refreshToken = rotated.refreshToken;
  }

  let upstream: Response;
  try {
    upstream = await send(accessToken);
  } catch {
    return NextResponse.json({ message: "API unavailable." }, { status: 502 });
  }

  if (upstream.status === 401 && refreshToken) {
    rotated = await refreshTokens(refreshToken);
    if (rotated) {
      try {
        upstream = await send(rotated.accessToken);
      } catch {
        return NextResponse.json({ message: "API unavailable." }, { status: 502 });
      }
    }
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders(upstream.headers),
  });
  if (path === "users/me/password" && method === "PATCH" && upstream.ok) clearAuthCookies(response);
  else if (rotated && upstream.status !== 401) setAuthCookies(response, rotated);
  else if (upstream.status === 401) clearAuthCookies(response);
  return response;
}

export async function loginWithApi(email: string, password: string) {
  const response = await fetch(apiUrl("auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const data = await response.json();
  return { response, data } as { response: Response; data: LoginResult & Record<string, unknown> };
}

export async function getCurrentUser(accessToken: string) {
  const response = await fetch(apiUrl("users/me"), {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return response.ok ? response.json() : null;
}

export async function logoutFromApi(accessToken: string | undefined, refreshToken: string | undefined) {
  if (!refreshToken) return;
  let currentTokens: Tokens | null = null;
  if (!accessToken) currentTokens = await refreshTokens(refreshToken);
  const sendLogout = (access: string, refresh: string) =>
    fetch(apiUrl("auth/logout"), {
      method: "POST",
      headers: { authorization: `Bearer ${access}`, "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: "no-store",
    });

  try {
    if (currentTokens) {
      await sendLogout(currentTokens.accessToken, currentTokens.refreshToken);
      return;
    }
    if (!accessToken) return;
    const result = await sendLogout(accessToken, refreshToken);
    if (result.status === 401) {
      currentTokens = await refreshTokens(refreshToken);
      if (currentTokens) await sendLogout(currentTokens.accessToken, currentTokens.refreshToken);
    }
  } catch {}
}
