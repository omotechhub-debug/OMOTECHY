import { randomUUID } from "crypto";
import connectDB from "@/lib/mongodb";
import AIAssistantSession from "@/lib/models/AIAssistantSession";
import AIAssistantAuditLog from "@/lib/models/AIAssistantAuditLog";

export type AIActionId =
  | "accept_pending_orders"
  | "repair_invalid_phones"
  | "reconcile_mpesa"
  | "generate_weekly_report"
  | "daily_summary";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface AssistantSession {
  id: string;
  userId: string;
  userRole: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

type ActionResult = {
  ok: boolean;
  actionId: AIActionId;
  message: string;
  details?: Record<string, unknown>;
};

const MAX_MESSAGES = 20;

function toSession(doc: any): AssistantSession {
  return {
    id: doc.sessionId,
    userId: doc.userId,
    userRole: doc.userRole,
    createdAt: new Date(doc.createdAt).getTime(),
    updatedAt: new Date(doc.updatedAt || doc.lastUsedAt || Date.now()).getTime(),
    messages: (doc.messages || []).map((message: any) => ({
      role: message.role,
      content: message.content,
      createdAt: new Date(message.createdAt || Date.now()).getTime(),
    })),
  };
}

export async function getOrCreateSession(
  sessionId: string | undefined,
  userId: string,
  userRole: string
): Promise<AssistantSession> {
  await connectDB();

  if (sessionId) {
    const existing = await AIAssistantSession.findOne({ sessionId, userId }).lean();
    if (existing) {
      return toSession(existing);
    }
  }

  const id = sessionId || randomUUID();
  const created = await AIAssistantSession.create({
    sessionId: id,
    userId,
    userRole,
    messages: [],
    lastUsedAt: new Date(),
  });
  return toSession(created.toObject());
}

export async function pushSessionMessage(session: AssistantSession, role: ChatRole, content: string) {
  await connectDB();

  const nextMessage = { role, content, createdAt: new Date() };
  const current = await AIAssistantSession.findOne({ sessionId: session.id, userId: session.userId });
  if (!current) {
    return;
  }

  const updatedMessages = [...(current.messages || []), nextMessage].slice(-MAX_MESSAGES);
  current.messages = updatedMessages as any;
  current.lastUsedAt = new Date();
  await current.save();

  session.messages = updatedMessages.map((message: any) => ({
    role: message.role,
    content: message.content,
    createdAt: new Date(message.createdAt).getTime(),
  }));
  session.updatedAt = Date.now();
}

export function detectActionIntent(message: string): AIActionId | null {
  const lower = message.toLowerCase();
  if (lower.includes("accept all pending orders") || lower.includes("accept pending orders")) {
    return "accept_pending_orders";
  }
  if (lower.includes("repair invalid customer phone") || lower.includes("fix phone")) {
    return "repair_invalid_phones";
  }
  if (lower.includes("reconcile") && lower.includes("mpesa")) {
    return "reconcile_mpesa";
  }
  if (lower.includes("weekly report") || lower.includes("executive report")) {
    return "generate_weekly_report";
  }
  if (lower.includes("daily summary")) {
    return "daily_summary";
  }
  return null;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function executeAction(params: {
  actionId: AIActionId;
  baseUrl: string;
  token: string;
  userId: string;
  userRole: string;
  sessionId?: string;
}): Promise<ActionResult> {
  const writeAudit = async (result: ActionResult) => {
    await connectDB();
    await AIAssistantAuditLog.create({
      userId: params.userId,
      userRole: params.userRole,
      sessionId: params.sessionId,
      actionId: result.actionId,
      status: result.ok ? "success" : "failed",
      message: result.message,
      details: result.details || null,
    });
  };

  const headers = {
    Authorization: `Bearer ${params.token}`,
    "Content-Type": "application/json",
  };

  switch (params.actionId) {
    case "accept_pending_orders": {
      const result = await fetchJson(`${params.baseUrl}/api/admin/orders/accept-pending`, {
        method: "POST",
        headers,
      });
      if (!result.ok) {
        const payload = { ok: false, actionId: params.actionId, message: result.data?.error || "Failed to accept pending orders." } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: `Accepted ${result.data.modifiedCount || 0} pending orders.`,
        details: result.data,
      } as ActionResult;
      await writeAudit(payload);
      return payload;
    }
    case "repair_invalid_phones": {
      const result = await fetchJson(`${params.baseUrl}/api/admin/repair-order-phones`, {
        method: "POST",
        headers,
      });
      if (!result.ok) {
        const payload = { ok: false, actionId: params.actionId, message: result.data?.error || "Failed to repair order phones." } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: `Phone repair completed. Updated ${result.data.ordersUpdated || 0} orders.`,
        details: result.data,
      } as ActionResult;
      await writeAudit(payload);
      return payload;
    }
    case "reconcile_mpesa": {
      const tx = await fetchJson(`${params.baseUrl}/api/admin/mpesa-transactions?filter=unconnected`, {
        headers,
      });
      if (!tx.ok) {
        const payload = { ok: false, actionId: params.actionId, message: tx.data?.error || "Failed to fetch unmatched M-Pesa transactions." } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const transactions = tx.data?.transactions || [];
      const orders = tx.data?.pendingOrders || [];
      if (!transactions.length || !orders.length) {
        const payload = {
          ok: true,
          actionId: params.actionId,
          message: "No reconciliation candidates found. Either no unmatched transactions or no pending orders.",
          details: { transactions: transactions.length, pendingOrders: orders.length },
        } as ActionResult;
        await writeAudit(payload);
        return payload;
      }

      let connected = 0;
      for (const transaction of transactions.slice(0, 10)) {
        const candidate = orders.find((order: any) => Math.abs((order.totalAmount || 0) - (transaction.amountPaid || 0)) < 1);
        if (!candidate) continue;
        const connect = await fetchJson(`${params.baseUrl}/api/admin/mpesa-transactions/connect`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            transactionId: transaction.transactionId,
            orderId: candidate._id,
          }),
        });
        if (connect.ok) connected += 1;
      }
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: `Reconciliation completed. Connected ${connected} transactions by amount match.`,
        details: { scanned: Math.min(transactions.length, 10), connected },
      } as ActionResult;
      await writeAudit(payload);
      return payload;
    }
    case "generate_weekly_report": {
      const reports = await fetchJson(`${params.baseUrl}/api/admin/reports?range=7`, {
        headers,
      });
      if (!reports.ok) {
        const payload = { ok: false, actionId: params.actionId, message: reports.data?.error || "Failed to generate weekly report." } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const metrics = reports.data?.financialMetrics || {};
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: "Weekly executive report generated.",
        details: {
          revenue: metrics.totalRevenue || 0,
          expenses: metrics.totalExpenses || 0,
          profit: metrics.netProfit || 0,
          margin: metrics.profitMargin || 0,
        },
      } as ActionResult;
      await writeAudit(payload);
      return payload;
    }
    case "daily_summary": {
      const orders = await fetchJson(`${params.baseUrl}/api/orders`, { headers });
      const expenses = await fetchJson(`${params.baseUrl}/api/expenses`, { headers });
      if (!orders.ok || !expenses.ok) {
        const payload = { ok: false, actionId: params.actionId, message: "Failed to fetch daily summary data." } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const today = new Date().toISOString().slice(0, 10);
      const orderList = orders.data?.orders || [];
      const expenseList = expenses.data?.expenses || [];
      const todayOrders = orderList.filter((o: any) => (o.createdAt || "").slice(0, 10) === today);
      const revenue = todayOrders
        .filter((o: any) => (o.paymentStatus || "").toLowerCase() === "paid")
        .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
      const pending = todayOrders.filter((o: any) => (o.status || "").toLowerCase() === "pending").length;
      const todayExpense = expenseList
        .filter((e: any) => ((e.date || e.createdAt || "") as string).slice(0, 10) === today)
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: "Daily summary generated.",
        details: { revenue, pendingOrders: pending, expenses: todayExpense, profit: revenue - todayExpense },
      } as ActionResult;
      await writeAudit(payload);
      return payload;
    }
    default:
      const payload = { ok: false, actionId: params.actionId, message: "Unsupported action." } as ActionResult;
      await writeAudit(payload);
      return payload;
  }
}

export async function generateAssistantReply(params: {
  message: string;
  contextMessages: ChatMessage[];
  actionResult?: ActionResult;
}): Promise<{ reply: string; suggestedActions: AIActionId[] }> {
  const prompt = params.message.toLowerCase();

  if (params.actionResult) {
    const details = params.actionResult.details ? ` Details: ${JSON.stringify(params.actionResult.details)}` : "";
    return {
      reply: `${params.actionResult.ok ? "Action completed." : "Action failed."} ${params.actionResult.message}${details}`,
      suggestedActions: ["daily_summary", "generate_weekly_report"],
    };
  }

  if (prompt.includes("payment") || prompt.includes("mpesa")) {
    return {
      reply:
        "Payment risk is elevated around failed callbacks and unmatched collections. Run M-Pesa reconciliation, then trigger phone-repair cleanup before retrying failed payment prompts.",
      suggestedActions: ["reconcile_mpesa", "repair_invalid_phones", "daily_summary"],
    };
  }
  if (prompt.includes("station")) {
    return {
      reply:
        "Station performance should be compared by revenue, pending orders, and expense ratio. Prioritize stations with high pending orders and low conversion first.",
      suggestedActions: ["daily_summary", "generate_weekly_report"],
    };
  }
  if (prompt.includes("summary") || prompt.includes("report")) {
    return {
      reply:
        "I can generate an executive summary now and then build a weekly report pack for leadership with revenue, costs, risk alerts, and action recommendations.",
      suggestedActions: ["daily_summary", "generate_weekly_report"],
    };
  }

  return {
    reply:
      "I am tracking orders, payments, M-Pesa reconciliation, customers, reports, inventory demand, and station performance. Ask for a specific operation or run an automation action directly.",
    suggestedActions: ["daily_summary", "accept_pending_orders", "reconcile_mpesa"],
  };
}
