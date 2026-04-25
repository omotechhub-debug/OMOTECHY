import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { executeAction, type AIActionId } from "@/lib/ai/admin-assistant";

const ALLOWED_ROLES = new Set(["superadmin", "admin", "manager"]);

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded || !ALLOWED_ROLES.has(decoded.role)) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const actionId = String(body?.actionId || "") as AIActionId;
    if (!actionId) {
      return NextResponse.json({ success: false, error: "actionId is required" }, { status: 400 });
    }

    const result = await executeAction({
      actionId,
      baseUrl: new URL(request.url).origin,
      token,
      userId: decoded.userId,
      userRole: decoded.role,
      sessionId: body?.sessionId ? String(body.sessionId) : undefined,
    });

    return NextResponse.json({
      success: result.ok,
      result,
    });
  } catch (error: any) {
    console.error("admin ai action error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
