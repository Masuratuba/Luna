import { NextResponse } from "next/server";
import { getLunaHealth } from "../../../lib/luna/diagnostics";

export async function GET() {
  const health = getLunaHealth();
  return NextResponse.json({ service: "luna", version: "0.1.0", ...health }, { status: health.status === "ok" ? 200 : 503 });
}
