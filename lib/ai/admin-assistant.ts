import { randomUUID } from "crypto";
import connectDB from "@/lib/mongodb";
import AIAssistantSession from "@/lib/models/AIAssistantSession";
import AIAssistantAuditLog from "@/lib/models/AIAssistantAuditLog";

export type AIActionId =
  | "accept_pending_orders"
  | "repair_invalid_phones"
  | "reconcile_mpesa"
  | "generate_weekly_report"
  | "daily_summary"
  | "detect_suspicious_transactions"
  | "flag_duplicate_orders"
  | "suggest_inventory_restock"
  | "detect_inactive_managers";

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
  if (lower.includes("suspicious transaction")) {
    return "detect_suspicious_transactions";
  }
  if (lower.includes("duplicate order")) {
    return "flag_duplicate_orders";
  }
  if (lower.includes("restock")) {
    return "suggest_inventory_restock";
  }
  if (lower.includes("inactive manager")) {
    return "detect_inactive_managers";
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
    case "detect_suspicious_transactions": {
      const tx = await fetchJson(`${params.baseUrl}/api/admin/mpesa-transactions?filter=all`, { headers });
      if (!tx.ok) {
        const payload = {
          ok: false,
          actionId: params.actionId,
          message: tx.data?.error || "Could not analyze transactions for suspicious patterns.",
        } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const transactions = tx.data?.transactions || [];
      const amounts = transactions.map((t: any) => Number(t.amountPaid) || 0).filter((n: number) => n > 0).sort((a: number, b: number) => a - b);
      const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;
      const suspicious = transactions.filter((t: any) => {
        const amount = Number(t.amountPaid) || 0;
        return amount > Math.max(median * 4, 50000) || String(t.confirmationStatus || "").toLowerCase() === "rejected";
      });
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: `Suspicious transaction scan completed. ${suspicious.length} flagged.`,
        details: {
          medianAmount: median,
          totalScanned: transactions.length,
          flagged: suspicious.slice(0, 20).map((t: any) => ({
            transactionId: t.transactionId,
            customerName: t.customerName,
            amountPaid: t.amountPaid,
            confirmationStatus: t.confirmationStatus,
          })),
        },
      } as ActionResult;
      await writeAudit(payload);
      return payload;
    }
    case "flag_duplicate_orders": {
      const orders = await fetchJson(`${params.baseUrl}/api/orders`, { headers });
      if (!orders.ok) {
        const payload = { ok: false, actionId: params.actionId, message: "Could not scan orders for duplicates." } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const list = orders.data?.orders || [];
      const grouped = new Map<string, any[]>();
      for (const order of list) {
        const phone = order?.customer?.phone || "unknown";
        const total = Number(order?.totalAmount) || 0;
        const day = String(order?.createdAt || "").slice(0, 10);
        const key = `${phone}|${total}|${day}`;
        grouped.set(key, [...(grouped.get(key) || []), order]);
      }
      const duplicates = [...grouped.values()]
        .filter((items) => items.length > 1)
        .flat()
        .slice(0, 50)
        .map((order) => ({
          orderNumber: order.orderNumber,
          customer: order?.customer?.name,
          phone: order?.customer?.phone,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
        }));
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: `Duplicate order scan completed. ${duplicates.length} potential duplicates found.`,
        details: { duplicates },
      } as ActionResult;
      await writeAudit(payload);
      return payload;
    }
    case "suggest_inventory_restock": {
      const inventory = await fetchJson(`${params.baseUrl}/api/inventory?limit=1000`, { headers });
      if (!inventory.ok) {
        const payload = { ok: false, actionId: params.actionId, message: "Could not analyze inventory for restock suggestions." } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const items = inventory.data?.data || [];
      const restock = items
        .filter((item: any) => {
          const stock = Number(item.stock) || 0;
          const minStock = Number(item.minStock) || 0;
          return stock <= minStock || (minStock > 0 && stock / minStock < 0.5);
        })
        .slice(0, 30)
        .map((item: any) => ({
          name: item.name,
          sku: item.sku,
          stock: item.stock,
          minStock: item.minStock,
        }));
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: `Restock analysis complete. ${restock.length} items need attention.`,
        details: { restock },
      } as ActionResult;
      await writeAudit(payload);
      return payload;
    }
    case "detect_inactive_managers": {
      const users = await fetchJson(`${params.baseUrl}/api/users`, { headers });
      if (!users.ok) {
        const payload = { ok: false, actionId: params.actionId, message: "Could not analyze manager activity." } as ActionResult;
        await writeAudit(payload);
        return payload;
      }
      const list = users.data?.users || users.data?.data || [];
      const inactiveManagers = list
        .filter((u: any) => u.role === "manager")
        .filter((u: any) => !u.isActive || !u.stationId)
        .slice(0, 30)
        .map((u: any) => ({
          name: u.name,
          email: u.email,
          isActive: u.isActive,
          stationId: u.stationId || null,
        }));
      const payload = {
        ok: true,
        actionId: params.actionId,
        message: `Manager activity scan complete. ${inactiveManagers.length} managers need attention.`,
        details: { inactiveManagers },
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
  baseUrl?: string;
  token?: string;
}): Promise<{ reply: string; suggestedActions: AIActionId[] }> {
  const prompt = params.message.toLowerCase();
  const withEvidence = (message: string, evidence: string[]) =>
    `${message}\n\nEvidence:\n- ${evidence.join("\n- ")}`;
  const formatActionDetails = (actionResult: ActionResult) => {
    const details: any = actionResult.details || {};
    if (actionResult.actionId === "suggest_inventory_restock") {
      const restock = Array.isArray(details.restock) ? details.restock : [];
      if (!restock.length) return "No items currently require restock.";
      const preview = restock.slice(0, 12);
      const lines = preview.map(
        (item: any, index: number) =>
          `${index + 1}. ${item.name} (${item.sku}) — stock: ${item.stock}, min: ${item.minStock}`
      );
      const remainder = restock.length > preview.length ? `\n...and ${restock.length - preview.length} more items.` : "";
      return `Top restock priorities:\n${lines.join("\n")}${remainder}`;
    }
    if (actionResult.actionId === "detect_inactive_managers") {
      const managers = Array.isArray(details.inactiveManagers) ? details.inactiveManagers : [];
      if (!managers.length) return "No inactive managers detected.";
      return `Inactive managers:\n${managers
        .slice(0, 12)
        .map((m: any, i: number) => `${i + 1}. ${m.name} (${m.email}) — active=${m.isActive}, station=${m.stationId || "none"}`)
        .join("\n")}`;
    }
    if (actionResult.actionId === "detect_suspicious_transactions") {
      const flagged = Array.isArray(details.flagged) ? details.flagged : [];
      if (!flagged.length) return "No suspicious transactions were flagged.";
      return `Suspicious transactions:\n${flagged
        .slice(0, 12)
        .map(
          (t: any, i: number) =>
            `${i + 1}. ${t.transactionId} — ${t.customerName || "unknown"} — Ksh ${Number(t.amountPaid || 0).toLocaleString()} (${t.confirmationStatus || "n/a"})`
        )
        .join("\n")}`;
    }
    if (actionResult.actionId === "flag_duplicate_orders") {
      const duplicates = Array.isArray(details.duplicates) ? details.duplicates : [];
      if (!duplicates.length) return "No duplicate orders were detected.";
      return `Potential duplicate orders:\n${duplicates
        .slice(0, 12)
        .map(
          (o: any, i: number) =>
            `${i + 1}. ${o.orderNumber} — ${o.customer || "unknown"} (${o.phone || "n/a"}) — Ksh ${Number(o.totalAmount || 0).toLocaleString()}`
        )
        .join("\n")}`;
    }
    if (actionResult.actionId === "daily_summary") {
      return `Daily summary:\n- Revenue: Ksh ${Number(details.revenue || 0).toLocaleString()}\n- Pending orders: ${details.pendingOrders || 0}\n- Expenses: Ksh ${Number(details.expenses || 0).toLocaleString()}\n- Profit: Ksh ${Number(details.profit || 0).toLocaleString()}`;
    }
    return "";
  };

  if (params.actionResult) {
    const detailsText = formatActionDetails(params.actionResult);
    return {
      reply: withEvidence(
        `${params.actionResult.ok ? "Action completed." : "Action failed."} ${params.actionResult.message}${detailsText ? `\n\n${detailsText}` : ""}`,
        [
          `action=${params.actionResult.actionId}`,
          `status=${params.actionResult.ok ? "success" : "failed"}`,
          `source=internal-action-engine`,
        ]
      ),
      suggestedActions: ["daily_summary", "generate_weekly_report"],
    };
  }

  const headers = params.token
    ? {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
      }
    : undefined;

  if (params.baseUrl && headers) {
    if (prompt.includes("customer retention")) {
      const ordersRes = await fetchJson(`${params.baseUrl}/api/orders`, { headers });
      if (ordersRes.ok) {
        const orders = ordersRes.data?.orders || [];
        const phoneOrderCount = new Map<string, number>();
        for (const order of orders) {
          const phone = order?.customer?.phone;
          if (!phone) continue;
          phoneOrderCount.set(phone, (phoneOrderCount.get(phone) || 0) + 1);
        }
        const totalCustomers = phoneOrderCount.size;
        const repeatCustomers = [...phoneOrderCount.values()].filter((count) => count > 1).length;
        const retentionRate = totalCustomers ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : "0.0";
        return {
          reply: withEvidence(
            `Customer retention analysis: ${repeatCustomers} repeat customers out of ${totalCustomers} total (${retentionRate}% retention). Recommendation: target one-time customers with a return-offer campaign.`,
            [
              `dataset=orders`,
              `orders_analyzed=${orders.length}`,
              `unique_customers=${totalCustomers}`,
              `repeat_customers=${repeatCustomers}`,
              `retention_rate=${retentionRate}%`,
              `timeframe=all available orders`,
            ]
          ),
          suggestedActions: ["daily_summary", "generate_weekly_report"],
        };
      }
    }

    if (prompt.includes("station comparison")) {
      const ordersRes = await fetchJson(`${params.baseUrl}/api/orders`, { headers });
      const expensesRes = await fetchJson(`${params.baseUrl}/api/expenses`, { headers });
      if (ordersRes.ok) {
        const orders = ordersRes.data?.orders || [];
        const expenses = expensesRes.ok ? expensesRes.data?.expenses || [] : [];
        const stationStats = new Map<string, { revenue: number; pending: number; expenses: number }>();

        for (const order of orders) {
          const station = order?.station?.name || "Unknown";
          const current = stationStats.get(station) || { revenue: 0, pending: 0, expenses: 0 };
          if (String(order.paymentStatus || "").toLowerCase() === "paid") {
            current.revenue += Number(order.totalAmount) || 0;
          }
          if (String(order.status || "").toLowerCase() === "pending") {
            current.pending += 1;
          }
          stationStats.set(station, current);
        }

        for (const expense of expenses) {
          const station = expense?.stationName || expense?.station?.name || "Unknown";
          const current = stationStats.get(station) || { revenue: 0, pending: 0, expenses: 0 };
          current.expenses += Number(expense.amount) || 0;
          stationStats.set(station, current);
        }

        const ranked = [...stationStats.entries()]
          .map(([station, stats]) => ({
            station,
            ...stats,
            profit: stats.revenue - stats.expenses,
          }))
          .sort((a, b) => b.profit - a.profit);

        const best = ranked[0];
        const weakest = ranked[ranked.length - 1];
        if (best && weakest) {
          return {
            reply: withEvidence(
              `Station comparison: Top station is ${best.station} (revenue Ksh ${Math.round(best.revenue).toLocaleString()}, pending ${best.pending}). Lowest station is ${weakest.station} (revenue Ksh ${Math.round(weakest.revenue).toLocaleString()}, pending ${weakest.pending}). Prioritize backlog cleanup and promo activation for ${weakest.station}.`,
              [
                `dataset=orders,expenses`,
                `orders_analyzed=${orders.length}`,
                `expenses_analyzed=${expenses.length}`,
                `stations_compared=${ranked.length}`,
                `metric=profit(revenue-expenses),pending`,
                `timeframe=all available records`,
              ]
            ),
            suggestedActions: ["daily_summary", "generate_weekly_report", "accept_pending_orders"],
          };
        }
      }
    }

    if (prompt.includes("payment issues") || prompt.includes("payments failing")) {
      const ordersRes = await fetchJson(`${params.baseUrl}/api/orders`, { headers });
      const mpesaRes = await fetchJson(`${params.baseUrl}/api/admin/mpesa-transactions?filter=unconnected`, { headers });
      if (ordersRes.ok) {
        const orders = ordersRes.data?.orders || [];
        const failed = orders.filter((o: any) => String(o.paymentStatus || "").toLowerCase() === "failed").length;
        const pending = orders.filter((o: any) => String(o.paymentStatus || "").toLowerCase() === "pending").length;
        const unmatched = mpesaRes.ok ? (mpesaRes.data?.transactions || []).length : 0;
        return {
          reply: withEvidence(
            `Payment issue scan: failed=${failed}, pending=${pending}, unmatched M-Pesa=${unmatched}. Recommended sequence: reconcile M-Pesa first, then retry failed prompts, then repair invalid phones.`,
            [
              `dataset=orders,mpesa_unconnected`,
              `orders_analyzed=${orders.length}`,
              `failed_payments=${failed}`,
              `pending_payments=${pending}`,
              `unmatched_mpesa=${unmatched}`,
              `timeframe=current snapshot`,
            ]
          ),
          suggestedActions: ["reconcile_mpesa", "repair_invalid_phones", "detect_suspicious_transactions"],
        };
      }
    }
  }

  if (prompt.includes("payment") || prompt.includes("mpesa")) {
    return {
      reply: withEvidence(
        "Payment risk is elevated around failed callbacks and unmatched collections. Run M-Pesa reconciliation, then trigger phone-repair cleanup before retrying failed payment prompts.",
        ["dataset=heuristic_fallback", "timeframe=not specified by user", "confidence=medium"]
      ),
      suggestedActions: ["reconcile_mpesa", "repair_invalid_phones", "daily_summary"],
    };
  }
  if (prompt.includes("station")) {
    return {
      reply: withEvidence(
        "Station performance should be compared by revenue, pending orders, and expense ratio. Prioritize stations with high pending orders and low conversion first.",
        ["dataset=heuristic_fallback", "timeframe=not specified by user", "confidence=medium"]
      ),
      suggestedActions: ["daily_summary", "generate_weekly_report"],
    };
  }
  if (prompt.includes("summary") || prompt.includes("report")) {
    return {
      reply: withEvidence(
        "I can generate an executive summary now and then build a weekly report pack for leadership with revenue, costs, risk alerts, and action recommendations.",
        ["dataset=heuristic_fallback", "timeframe=not specified by user", "confidence=medium"]
      ),
      suggestedActions: ["daily_summary", "generate_weekly_report"],
    };
  }

  return {
    reply: withEvidence(
      "I am tracking orders, payments, M-Pesa reconciliation, customers, reports, inventory demand, and station performance. Ask for a specific operation or run an automation action directly.",
      ["dataset=heuristic_fallback", "timeframe=current session context", "confidence=baseline"]
    ),
    suggestedActions: ["daily_summary", "accept_pending_orders", "reconcile_mpesa"],
  };
}
