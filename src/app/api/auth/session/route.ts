import { NextResponse } from "next/server";
import { clearSessionOnResponse, getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("logout") === "1") {
    const response = NextResponse.redirect(new URL("/admin", request.url));
    clearSessionOnResponse(response);
    return response;
  }

  const user = await getSessionUser();
  return NextResponse.json({ authenticated: Boolean(user), user });
}
