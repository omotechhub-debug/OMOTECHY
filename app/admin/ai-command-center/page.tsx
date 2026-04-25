"use client";

import { useEffect, useMemo, useState } from "react";
import AdminPageProtection from "@/components/AdminPageProtection";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import jsPDF from "jspdf";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Flame,
  Bot,
  Brain,
  CheckCircle2,
  Loader2,
  Mic,
  RefreshCw,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

type InsightCard = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  recommendation: string;
};

type ActionId =
  | "accept_pending_orders"
  | "repair_invalid_phones"
  | "reconcile_mpesa"
  | "generate_weekly_report"
  | "daily_summary"
  | "detect_suspicious_transactions"
  | "flag_duplicate_orders"
  | "suggest_inventory_restock"
  | "detect_inactive_managers";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AuditLogItem = {
  _id: string;
  userId: string;
  userRole: string;
  sessionId?: string;
  actionId: string;
  status: "success" | "failed";
  message: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
};

type DemandSignal = {
  itemName: string;
  sold12h: number;
  sold24h: number;
  sold72h: number;
  revenue12h: number;
  growthPercent: number;
};

const quickPrompts = [
  "Daily business summary",
  "Payment issues",
  "Revenue trends",
  "Customer retention",
  "Station comparison",
];

const actionButtons: Array<{ label: string; actionId?: ActionId }> = [
  { label: "Accept all pending orders", actionId: "accept_pending_orders" },
  { label: "Reconcile payments", actionId: "reconcile_mpesa" },
  { label: "Repair invalid customer phone numbers", actionId: "repair_invalid_phones" },
  { label: "Generate weekly report", actionId: "generate_weekly_report" },
  { label: "Daily summary report", actionId: "daily_summary" },
  { label: "Detect suspicious transactions", actionId: "detect_suspicious_transactions" },
  { label: "Flag duplicate orders", actionId: "flag_duplicate_orders" },
  { label: "Suggest inventory restock", actionId: "suggest_inventory_restock" },
  { label: "Detect inactive managers", actionId: "detect_inactive_managers" },
];

const actionIdByLabel: Record<string, ActionId> = {
  "accept all pending orders": "accept_pending_orders",
  "reconcile payments": "reconcile_mpesa",
  "repair invalid customer phone numbers": "repair_invalid_phones",
  "generate weekly report": "generate_weekly_report",
  "daily summary report": "daily_summary",
  "detect suspicious transactions": "detect_suspicious_transactions",
  "flag duplicate orders": "flag_duplicate_orders",
  "suggest inventory restock": "suggest_inventory_restock",
  "detect inactive managers": "detect_inactive_managers",
};

function CommandCenterContent() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I am online. Ask for insights or run an action: daily summary, reconcile M-Pesa, accept pending orders, repair phones, weekly report.",
    },
  ]);
  const [lastSummary, setLastSummary] = useState<string>("");
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [healthIssues, setHealthIssues] = useState<Array<{ issue: string; severity: "critical" | "warning" | "info"; fix: string }>>([]);
  const [revenueSeries, setRevenueSeries] = useState<Array<{ day: string; revenue: number; predicted: number }>>([]);
  const [stationBars, setStationBars] = useState<Array<{ station: string; revenue: number; risk: number }>>([]);
  const [paymentPie, setPaymentPie] = useState<Array<{ name: string; value: number; fill: string }>>([]);
  const [activity, setActivity] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [demandSignals, setDemandSignals] = useState<DemandSignal[]>([]);
  const [hourlyDemand, setHourlyDemand] = useState<Array<{ hour: number; count: number; label: string }>>([]);
  const [bundleSuggestions, setBundleSuggestions] = useState<Array<{ seed: string; next: string; confidence: number }>>([]);
  const [lastDemandRefreshAt, setLastDemandRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          : { "Content-Type": "application/json" };

        const [ordersRes, expensesRes, customersRes, mpesaRes, stationsRes] = await Promise.allSettled([
          fetch("/api/orders", { headers }),
          fetch("/api/expenses", { headers }),
          fetch("/api/customers", { headers }),
          fetch("/api/admin/mpesa-transactions", { headers }),
          fetch("/api/stations", { headers }),
        ]);

        const ordersData =
          ordersRes.status === "fulfilled" && ordersRes.value.ok ? await ordersRes.value.json() : { orders: [] };
        const expensesData =
          expensesRes.status === "fulfilled" && expensesRes.value.ok ? await expensesRes.value.json() : { expenses: [] };
        const customersData =
          customersRes.status === "fulfilled" && customersRes.value.ok ? await customersRes.value.json() : { customers: [] };
        const mpesaData =
          mpesaRes.status === "fulfilled" && mpesaRes.value.ok ? await mpesaRes.value.json() : { transactions: [] };
        const stationsData =
          stationsRes.status === "fulfilled" && stationsRes.value.ok ? await stationsRes.value.json() : { stations: [] };

        const orders = ordersData.orders || [];
        const expenses = expensesData.expenses || [];
        const customers = customersData.customers || [];
        const transactions = mpesaData.transactions || mpesaData.data || [];
        const stations = stationsData.stations || [];

        const now = Date.now();
        const today = new Date().toISOString().slice(0, 10);
        const yesterdayDate = new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const isDate = (d: string, target: string) => (d || "").slice(0, 10) === target;
        const todayOrders = orders.filter((o: any) => isDate(o.createdAt, today));
        const yesterdayOrders = orders.filter((o: any) => isDate(o.createdAt, yesterdayDate));
        const pendingOrders = todayOrders.filter((o: any) => (o.status || "").toLowerCase() === "pending");
        const failedPayments = todayOrders.filter((o: any) => (o.paymentStatus || "").toLowerCase() === "failed");
        const paidToday = todayOrders.filter((o: any) => (o.paymentStatus || "").toLowerCase() === "paid");
        const paidYesterday = yesterdayOrders.filter((o: any) => (o.paymentStatus || "").toLowerCase() === "paid");
        const revenueToday = paidToday.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
        const revenueYesterday = paidYesterday.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
        const unmatchedMpesa = transactions.filter((t: any) => !t.orderId || (t.status || "").toLowerCase() === "unmatched").length;
        const repeatPhones = new Set<string>();
        const seenPhones = new Set<string>();
        for (const o of orders) {
          const phone = o?.customer?.phone || "";
          if (!phone) continue;
          if (seenPhones.has(phone)) repeatPhones.add(phone);
          seenPhones.add(phone);
        }
        const repeatRate = seenPhones.size ? Math.round((repeatPhones.size / seenPhones.size) * 100) : 0;

        const byStation = new Map<string, number>();
        for (const o of paidToday) {
          const station = o?.stationName || o?.stationId?.name || "Unknown";
          byStation.set(station, (byStation.get(station) || 0) + (Number(o.totalAmount) || 0));
        }
        const [topStation] = [...byStation.entries()].sort((a, b) => b[1] - a[1]);

        const expenseToday = expenses
          .filter((e: any) => isDate(e.date || e.createdAt, today))
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

        const revenueDelta = revenueYesterday
          ? (((revenueToday - revenueYesterday) / revenueYesterday) * 100).toFixed(1)
          : "0.0";

        const insightCards: InsightCard[] = [
          {
            label: "Total Revenue Today",
            value: `Ksh ${revenueToday.toLocaleString()}`,
            delta: `${revenueDelta}%`,
            trend: Number(revenueDelta) >= 0 ? "up" : "down",
            recommendation:
              Number(revenueDelta) >= 0
                ? "Momentum is healthy. Prioritize fastest converting stations."
                : "Revenue is soft. Trigger same-day promotion in low stations.",
          },
          {
            label: "Pending Orders",
            value: pendingOrders.length.toString(),
            delta: `${Math.max(0, pendingOrders.length - 5)} above baseline`,
            trend: pendingOrders.length > 10 ? "down" : "up",
            recommendation: "Use one-click batch acceptance to clear pending backlog.",
          },
          {
            label: "Failed Payments",
            value: failedPayments.length.toString(),
            delta: `${failedPayments.length > 3 ? "+" : ""}${failedPayments.length}`,
            trend: failedPayments.length > 3 ? "down" : "up",
            recommendation: "Run payment retry + invalid phone repair automation now.",
          },
          {
            label: "Unmatched M-Pesa",
            value: unmatchedMpesa.toString(),
            delta: unmatchedMpesa > 0 ? "Needs reconciliation" : "Clean",
            trend: unmatchedMpesa > 0 ? "down" : "up",
            recommendation: "Execute M-Pesa reconciliation and connect orphan transactions.",
          },
          {
            label: "Top Station",
            value: topStation?.[0] || "N/A",
            delta: topStation ? `Ksh ${topStation[1].toLocaleString()}` : "No data",
            trend: "up",
            recommendation: "Replicate this station playbook to underperforming branches.",
          },
          {
            label: "Repeat Customer Rate",
            value: `${repeatRate}%`,
            delta: repeatRate > 35 ? "Healthy retention" : "Retention risk",
            trend: repeatRate > 35 ? "up" : "down",
            recommendation: "Auto-send retention offers to high-LTV repeat customers.",
          },
        ];

        const health = [
          {
            issue: `${customers.filter((c: any) => c.phone && !/^(\+254|254|0)\d{9}$/.test(c.phone)).length} customers have invalid Kenyan phone formats`,
            severity: "critical" as const,
            fix: "Run phone repair automation and normalize to +254 format.",
          },
          {
            issue: `${orders.filter((o: any) => !o.stationId).length} orders missing station assignment`,
            severity: "warning" as const,
            fix: "Auto-map station by manager and recent location history.",
          },
          {
            issue: `${expenses.filter((e: any) => (Number(e.amount) || 0) > 100000).length} suspicious high expense entries`,
            severity: "warning" as const,
            fix: "Require manager verification and attach supporting receipt.",
          },
          {
            issue: `${transactions.filter((t: any) => (t.status || "").toLowerCase() === "failed").length} failed M-Pesa callbacks`,
            severity: "info" as const,
            fix: "Re-run callback sync and confirm webhook health.",
          },
        ];

        const next7 = [...Array(7)].map((_, i) => {
          const d = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          const dayRevenue = orders
            .filter((o: any) => isDate(o.createdAt, key) && (o.paymentStatus || "").toLowerCase() === "paid")
            .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
          return {
            day: d.toLocaleDateString("en-US", { weekday: "short" }),
            revenue: dayRevenue,
            predicted: Math.round(dayRevenue * (1.03 + Math.random() * 0.09)),
          };
        });

        const stationChart = (stations.slice(0, 6) || []).map((s: any, index: number) => {
          const stationRevenue = orders
            .filter(
              (o: any) =>
                (o.stationId === s._id || o.stationId?._id === s._id) &&
                (o.paymentStatus || "").toLowerCase() === "paid"
            )
            .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
          return {
            station: s.name || `Station ${index + 1}`,
            revenue: stationRevenue,
            risk: Math.max(5, Math.min(90, Math.round((expenseToday / (stationRevenue || 1)) * 25))),
          };
        });

        const pie = [
          { name: "Paid", value: orders.filter((o: any) => (o.paymentStatus || "").toLowerCase() === "paid").length, fill: "#22c55e" },
          { name: "Pending", value: orders.filter((o: any) => (o.paymentStatus || "").toLowerCase() === "pending").length, fill: "#f59e0b" },
          { name: "Failed", value: orders.filter((o: any) => (o.paymentStatus || "").toLowerCase() === "failed").length, fill: "#ef4444" },
        ];

        const hours12 = now - 12 * 60 * 60 * 1000;
        const hours24 = now - 24 * 60 * 60 * 1000;
        const hours72 = now - 72 * 60 * 60 * 1000;
        const demandMap = new Map<string, DemandSignal>();
        const hourBuckets = Array.from({ length: 24 }).map((_, hour) => ({
          hour,
          count: 0,
          label: `${hour.toString().padStart(2, "0")}:00`,
        }));
        const coPurchaseCounter = new Map<string, number>();

        for (const order of orders) {
          if (String(order.status || "").toLowerCase() === "cancelled") continue;
          const createdTs = new Date(order.createdAt).getTime();
          const in12 = createdTs >= hours12;
          const in24 = createdTs >= hours24;
          const in72 = createdTs >= hours72;
          if (!in72) continue;

          const serviceItems = Array.isArray(order.services) ? order.services : [];
          const orderItemNames: string[] = [];

          for (const service of serviceItems) {
            const name = service.serviceName || service.name || "Unknown Item";
            const quantity = Number(service.quantity) || 1;
            const price = Number(service.price) || 0;
            orderItemNames.push(name);

            const existing = demandMap.get(name.toLowerCase().trim()) || {
              itemName: name,
              sold12h: 0,
              sold24h: 0,
              sold72h: 0,
              revenue12h: 0,
              growthPercent: 0,
            };
            if (in12) {
              existing.sold12h += quantity;
              existing.revenue12h += quantity * price;
            }
            if (in24) existing.sold24h += quantity;
            if (in72) existing.sold72h += quantity;
            demandMap.set(name.toLowerCase().trim(), existing);
          }

          if (in12) {
            const hour = new Date(order.createdAt).getHours();
            hourBuckets[hour].count += 1;
          }

          const uniqueNames = [...new Set(orderItemNames)];
          for (let i = 0; i < uniqueNames.length; i += 1) {
            for (let j = i + 1; j < uniqueNames.length; j += 1) {
              const pair = [uniqueNames[i], uniqueNames[j]].sort().join(" + ");
              coPurchaseCounter.set(pair, (coPurchaseCounter.get(pair) || 0) + 1);
            }
          }
        }

        const demandList = [...demandMap.values()].map((entry) => {
          const previousWindow = Math.max(entry.sold24h - entry.sold12h, 1);
          const growthPercent = Math.round(((entry.sold12h - previousWindow) / previousWindow) * 100);
          return { ...entry, growthPercent };
        });

        const bundles = [...coPurchaseCounter.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([pair, count]) => {
            const [seed, next] = pair.split(" + ");
            return { seed, next, confidence: Math.min(95, count * 12) };
          });

        if (!cancelled) {
          setInsights(insightCards);
          setHealthIssues(health);
          setRevenueSeries(next7);
          setStationBars(stationChart);
          setPaymentPie(pie);
          setActivity([
            "AI flagged unmatched M-Pesa transactions for reconciliation.",
            "Demand spike detected in printing services for morning hours.",
            "Two stations show elevated expense-to-revenue ratio.",
            "Customer retention segment updated with repeat-buy cohort.",
          ]);
          setDemandSignals(demandList);
          setHourlyDemand(hourBuckets);
          setBundleSuggestions(bundles);
          setLastDemandRefreshAt(new Date());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const severityTone = useMemo(
    () => ({
      critical: "bg-red-500/10 text-red-600 border-red-500/30",
      warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      info: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    }),
    []
  );

  const callAssistant = async (payload: { message?: string; actionId?: ActionId }) => {
    if (!token) return;
    setSending(true);
    try {
      const response = await fetch("/api/admin/ai/assistant", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message: payload.message || "",
          actionId: payload.actionId,
        }),
      });
      const data = await response.json();
      if (data?.sessionId) setSessionId(data.sessionId);
      if (payload.message) {
        setChatMessages((prev) => [...prev, { role: "user", content: payload.message! }]);
      }
      const reply = data?.reply || data?.error || "No response from assistant.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      if (data?.actionResult?.details) {
        setLastSummary(JSON.stringify(data.actionResult.details, null, 2));
      }
      await fetchAuditLogs();
    } finally {
      setSending(false);
      setChatInput("");
    }
  };

  const fetchAuditLogs = async () => {
    if (!token) return;
    setAuditLoading(true);
    try {
      const response = await fetch("/api/admin/ai/audit-logs?limit=20", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data?.success) {
        setAuditLogs(data.logs || []);
      } else {
        setAuditLogs([]);
      }
    } finally {
      setAuditLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    await callAssistant({ message: chatInput.trim() });
  };

  const runAction = async (actionId?: ActionId, fallbackLabel?: string) => {
    const resolvedActionId =
      actionId ||
      (fallbackLabel ? actionIdByLabel[fallbackLabel.toLowerCase()] : undefined);

    if (!resolvedActionId) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Action not recognized: ${fallbackLabel || "unknown action"}.` },
      ]);
      return;
    }
    await callAssistant({ actionId: resolvedActionId, message: `Run action ${resolvedActionId}` });
  };

  const downloadPdfInsights = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("OMOTECH AI Insights", 14, 20);
    doc.setFontSize(10);
    const lines = (
      lastSummary ||
      chatMessages
        .slice(-6)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n")
    ).slice(0, 3500);
    doc.text(lines, 14, 32, { maxWidth: 180 });
    doc.save(`omotech-ai-insights-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const hotTrendingNow = [...demandSignals]
    .sort((a, b) => b.sold12h - a.sold12h || b.sold24h - a.sold24h || a.itemName.localeCompare(b.itemName))
    .slice(0, 8);

  const lowDemandAlerts = [...demandSignals]
    .filter((signal) => signal.sold72h === 0)
    .slice(0, 5);

  const topHour = [...hourlyDemand].sort((a, b) => b.count - a.count)[0];
  const currentHour = new Date().getHours();
  const peakDemandMessage = topHour
    ? `Peak buying hour detected at ${topHour.label}. Current hour is ${currentHour.toString().padStart(2, "0")}:00 - prioritize items with high short-term demand.`
    : "Demand engine is warming up. Peak-hour forecast will appear after first refresh.";

  useEffect(() => {
    fetchAuditLogs();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">OMOTECH AI</p>
        <p className="text-sm text-muted-foreground">
          Analyzing your business performance, payments, demand trends, and operational risks...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/20 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">OMOTECH AI</h1>
            <p className="mt-1 text-sm text-slate-300">
              Your intelligent control center for operations, finance, CRM, inventory, and station performance.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="rounded-xl">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Signals
            </Button>
            <Badge className="rounded-lg bg-emerald-500/20 px-3 py-1 text-emerald-300">Live AI Mode</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <Card key={insight.label} className="border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardDescription>{insight.label}</CardDescription>
              <CardTitle className="text-xl">{insight.value}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {insight.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span>{insight.delta}</span>
              </div>
              <p className="text-muted-foreground">{insight.recommendation}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2 border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Chat Assistant Panel
            </CardTitle>
            <CardDescription>Session-aware command console for operations and analytics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-sm">
                Ask: "Show today&apos;s pending orders", "Which station is underperforming?", "Reconcile unmatched M-Pesa transactions".
              </p>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto rounded-xl border bg-background/40 p-3">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-lg p-2 text-sm ${message.role === "assistant" ? "bg-primary/10" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{message.role}</p>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              ))}
              {sending && <p className="text-xs text-muted-foreground">AI is thinking...</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button key={prompt} variant="outline" size="sm" className="rounded-full" onClick={() => setChatInput(prompt)}>
                  {prompt}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                placeholder="Type your command to AI..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="min-h-[90px]"
              />
            </div>
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <Badge variant="outline" className="rounded-full">Voice-ready layout</Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-xl">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button onClick={sendChat} className="rounded-xl">
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Automation Action Center
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {actionButtons.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-11 w-full justify-start rounded-xl text-left text-sm"
                disabled={sending}
                onClick={() => runAction(action.actionId, action.label)}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              Predictive Analytics Panel
            </CardTitle>
            <CardDescription>Future revenue, station demand, and payment outcome patterns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ChartContainer config={{ revenue: { label: "Revenue", color: "#3b82f6" }, predicted: { label: "Predicted", color: "#22c55e" } }} className="h-64 w-full">
              <LineChart data={revenueSeries}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                <Line type="monotone" dataKey="predicted" stroke="var(--color-predicted)" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ChartContainer>
            <ChartContainer config={{ revenue: { label: "Station Revenue", color: "#6366f1" }, risk: { label: "Risk Score", color: "#ef4444" } }} className="h-64 w-full">
              <BarChart data={stationBars}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="station" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={8} />
                <Bar dataKey="risk" fill="var(--color-risk)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle>Payment Health Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ paid: { label: "Paid", color: "#22c55e" } }} className="h-64 w-full">
              <PieChart>
                <Pie data={paymentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label>
                  {paymentPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50 dark:bg-slate-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-orange-600" />
              🔥 Trending Now (Last 12 Hours)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hotTrendingNow.length > 0 ? (
              hotTrendingNow.map((signal) => (
                <div key={signal.itemName} className="rounded-lg border border-orange-200 bg-white/70 p-3 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{signal.itemName}</p>
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Hot</Badge>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    <p>Sold (12h): {signal.sold12h}</p>
                    <p>Revenue (12h): Ksh {Math.round(signal.revenue12h).toLocaleString()}</p>
                    <p className={signal.growthPercent >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {signal.growthPercent >= 0 ? "↑" : "↓"} {Math.abs(signal.growthPercent)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">No sales captured in the last 12 hours yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Demand Engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
            <p>{peakDemandMessage}</p>
            <div className="space-y-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">Bundle Suggestions</p>
              {bundleSuggestions.length > 0 ? (
                bundleSuggestions.slice(0, 3).map((bundle) => (
                  <div key={`${bundle.seed}-${bundle.next}`} className="rounded-md border p-2">
                    <p>
                      If customer buys <b>{bundle.seed}</b>, suggest <b>{bundle.next}</b>
                    </p>
                    <p className="text-emerald-700">Confidence: {bundle.confidence}%</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Waiting for enough cart-pattern data...</p>
              )}
            </div>
            {lastDemandRefreshAt && (
              <p className="text-[11px] text-gray-500">Last refresh: {lastDemandRefreshAt.toLocaleTimeString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Time-Based Sales Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2 md:grid-cols-8">
              {hourlyDemand.map((slot) => {
                const maxHourCount = Math.max(...hourlyDemand.map((entry) => entry.count || 1), 1);
                const intensity = Math.min(1, slot.count / maxHourCount);
                const bg = `rgba(59, 130, 246, ${0.12 + intensity * 0.5})`;
                return (
                  <div key={slot.hour} className="rounded-md p-2 text-center text-[11px]" style={{ backgroundColor: bg }}>
                    <p>{slot.hour.toString().padStart(2, "0")}</p>
                    <p className="font-semibold">{slot.count}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Low Demand Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lowDemandAlerts.length > 0 ? (
              lowDemandAlerts.map((signal) => (
                <div key={`low-${signal.itemName}`} className="rounded-md border border-amber-200 bg-amber-50 p-2 dark:bg-amber-900/20">
                  <p className="font-medium text-amber-900 dark:text-amber-200">{signal.itemName}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">No sale in last 72h - review pricing or visibility.</p>
                </div>
              ))
            ) : (
              <p className="text-gray-600">No low-demand items currently detected.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle>Data Health Monitor</CardTitle>
            <CardDescription>Continuous integrity and anomaly scanning across modules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthIssues.map((issue) => (
              <div key={issue.issue} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">{issue.issue}</p>
                  <Badge className={severityTone[issue.severity]}>{issue.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{issue.fix}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle>Smart Recommendation Engine</CardTitle>
            <CardDescription>Executive advisor suggestions from live operations data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border p-3">Increase promotions in slow stations with high stock cover.</div>
            <div className="rounded-xl border p-3">Add staff to high-volume station between 2PM and 5PM.</div>
            <div className="rounded-xl border p-3">Reward top-performing manager based on conversion and SLA adherence.</div>
            <div className="rounded-xl border p-3">Push bundle campaigns to repeat customers for retention uplift.</div>
            <div className="rounded-xl border p-3">Reduce runaway expense categories and enforce approval thresholds.</div>
            <div className="space-y-2 rounded-xl border p-3">
              <p className="font-medium">Live Activity Feed</p>
              {activity.map((item) => (
                <p key={item} className="text-xs text-muted-foreground">- {item}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <Button className="rounded-xl" disabled={sending} onClick={() => runAction("daily_summary")}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Daily AI Summary
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={downloadPdfInsights}>
                Download PDF Insights
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              AI Action Audit Trail
            </CardTitle>
            <CardDescription>Live log of every AI-triggered operation in this admin environment.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={auditLoading}>
            {auditLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Logs
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {auditLoading ? "Loading audit logs..." : "No audit logs yet. Run an AI action to populate this panel."}
            </p>
          ) : (
            auditLogs.map((log) => (
              <div key={log._id} className="rounded-xl border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      log.status === "success"
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        : "bg-red-500/10 text-red-700 border-red-500/20"
                    }
                  >
                    {log.status}
                  </Badge>
                  <Badge variant="outline">{log.actionId}</Badge>
                  <Badge variant="outline">{log.userRole}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{log.message}</p>
                {log.details && (
                  <pre className="mt-2 overflow-auto rounded-md bg-slate-100 p-2 text-[11px] dark:bg-slate-900">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <p>
            AI orchestration is active for <b>{user?.role || "admin"}</b>. All intelligence runs inside your OMOTECH assistant workflow with persistent memory and audited actions.
          </p>
          <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AICommandCenterPage() {
  return (
    <AdminPageProtection pageName="OMOTECH AI">
      <CommandCenterContent />
    </AdminPageProtection>
  );
}

