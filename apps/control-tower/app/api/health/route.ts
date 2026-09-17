import { NextResponse } from "next/server";
import { isPostgresConfigured } from "@/lib/dashboard";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "business-os-control-tower",
    database: isPostgresConfigured() ? "configured" : "demo",
  });
}
