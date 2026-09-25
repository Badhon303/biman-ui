import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getCurrentUser, loginWithApi, requireSameOrigin, setAuthCookies } from "@/lib/server-bff";

export async function POST(request: NextRequest) {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;

  let credentials: { email?: string; password?: string };
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid login request." }, { status: 400 });
  }
  if (!credentials.email || !credentials.password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  try {
    const { response: upstream, data } = await loginWithApi(credentials.email, credentials.password);
    if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });

    const profile = data.mustChangePassword ? null : await getCurrentUser(data.accessToken);
    const response = NextResponse.json({
      user: profile ?? data.user,
      mustChangePassword: data.mustChangePassword,
    });
    setAuthCookies(response, data);
    return response;
  } catch {
    const response = NextResponse.json({ message: "API unavailable." }, { status: 502 });
    clearAuthCookies(response);
    return response;
  }
}
