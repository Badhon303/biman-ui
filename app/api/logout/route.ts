import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, logoutFromApi, requireSameOrigin } from "@/lib/server-bff";

export async function POST(request: NextRequest) {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;

  await logoutFromApi(
    request.cookies.get("biman_access")?.value,
    request.cookies.get("biman_refresh")?.value,
  );
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
