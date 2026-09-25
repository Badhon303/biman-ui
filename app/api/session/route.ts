import { NextRequest, NextResponse } from "next/server";
import { proxyApiRequest } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  if (!request.cookies.get("biman_access")?.value && !request.cookies.get("biman_refresh")?.value) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return proxyApiRequest(request, ["users", "me"]);
}
