import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import {
  detectActionIntent,
  executeAction,
  generateAssistantReply,
  getOrCreateSession,
  pushSessionMessage,
  type AIActionId,
} from "@/lib/ai/admin-assistant";

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
    const message = String(body?.message || "").trim();
    const sessionId = body?.sessionId ? String(body.sessionId) : undefined;
    const forceAction = body?.actionId ? (String(body.actionId) as AIActionId) : null;
    if (!message && !forceAction) {
      return NextResponse.json({ success: false, error: "Message or actionId is required" }, { status: 400 });
    }

    const session = await getOrCreateSession(sessionId, decoded.userId, decoded.role);
    if (message) {
      await pushSessionMessage(session, "user", message);
    }

    const actionId = forceAction || detectActionIntent(message);
    let actionResult;
    if (actionId) {
      actionResult = await executeAction({
        actionId,
        baseUrl: new URL(request.url).origin,
        token,
        userId: decoded.userId,
        userRole: decoded.role,
        sessionId: session.id,
      });
    }

    const replyPayload = await generateAssistantReply({
      message: message || `Run action ${actionId}`,
      contextMessages: session.messages,
      actionResult,
      baseUrl: new URL(request.url).origin,
      token,
    });

    await pushSessionMessage(session, "assistant", replyPayload.reply);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      reply: replyPayload.reply,
      actionResult: actionResult || null,
      suggestedActions: replyPayload.suggestedActions,
      memory: session.messages.slice(-8),
    });
  } catch (error: any) {
    console.error("admin ai assistant error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
