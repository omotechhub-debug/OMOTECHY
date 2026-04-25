import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import AIAssistantAuditLog from "@/lib/models/AIAssistantAuditLog";

const ALLOWED_ROLES = new Set(["superadmin", "admin"]);

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded || !ALLOWED_ROLES.has(decoded.role)) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    await connectDB();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const logs = await AIAssistantAuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    console.error("ai audit logs error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
