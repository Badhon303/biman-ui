type ApiErrorBody = { message?: string | string[] };

export async function apiResponse(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api/bff/${path.replace(/^\/+/, "")}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.ok && !['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase()) && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('biman:data-mutation'))
  }
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (Array.isArray(body.message)) message = body.message.join(" ");
      else if (body.message) message = body.message;
    } catch {}
    throw new Error(message);
  }
  return response;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiResponse(path, init);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function bffFileUrl(apiUrl: string | undefined) {
  if (!apiUrl) return undefined;
  return apiUrl.startsWith("/api/") ? `/api/bff/${apiUrl.slice("/api/".length)}` : apiUrl;
}
