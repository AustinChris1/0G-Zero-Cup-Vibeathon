import { NextResponse } from "next/server";
import { syncFootball } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let force = false;
  try {
    const body = await req.json();
    force = Boolean(body?.force);
  } catch {
    /* no body is fine */
  }
  const result = await syncFootball({ force });
  return NextResponse.json(result);
}
