import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/lib/models/Order";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const ALLOWED_ROLES = new Set(["superadmin", "admin", "manager"]);

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
    const stationId = url.searchParams.get("stationId");
    const now = Date.now();
    const hours72 = new Date(now - 72 * 60 * 60 * 1000);

    const query: Record<string, any> = {
      createdAt: { $gte: hours72 },
      status: { $ne: "cancelled" },
    };

    if (stationId) {
      query["station.stationId"] = stationId;
    }

    const orders = await Order.find(query)
      .select("createdAt services station")
      .sort({ createdAt: -1 })
      .lean();

    const hours12 = now - 12 * 60 * 60 * 1000;
    const hours24 = now - 24 * 60 * 60 * 1000;
    const map = new Map<
      string,
      {
        itemName: string;
        sold12h: number;
        sold24h: number;
        sold72h: number;
        revenue12h: number;
        growthPercent: number;
      }
    >();
    const hourBuckets = Array.from({ length: 24 }).map((_, hour) => ({
      hour,
      count: 0,
      label: `${hour.toString().padStart(2, "0")}:00`,
    }));
    const coPurchaseCounter = new Map<string, number>();

    for (const order of orders) {
      const createdTs = new Date(order.createdAt).getTime();
      const in12 = createdTs >= hours12;
      const in24 = createdTs >= hours24;
      const in72 = true;

      const serviceItems = Array.isArray(order.services) ? order.services : [];
      const orderItemNames: string[] = [];

      for (const item of serviceItems) {
        const name = item.serviceName || item.name || "Unknown Item";
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const key = name.toLowerCase().trim();
        orderItemNames.push(name);

        const existing = map.get(key) || {
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
        map.set(key, existing);
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

    const signals = [...map.values()]
      .map((signal) => {
        const previousWindow = Math.max(signal.sold24h - signal.sold12h, 1);
        const growthPercent = Math.round(((signal.sold12h - previousWindow) / previousWindow) * 100);
        return { ...signal, growthPercent };
      })
      .sort((a, b) => b.sold12h - a.sold12h || b.sold24h - a.sold24h || a.itemName.localeCompare(b.itemName));

    const bundles = [...coPurchaseCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([pair, count]) => {
        const [seed, next] = pair.split(" + ");
        return { seed, next, confidence: Math.min(95, count * 12) };
      });

    return NextResponse.json({
      success: true,
      signals,
      hourlyDemand: hourBuckets,
      bundleSuggestions: bundles,
      generatedAt: new Date().toISOString(),
      orderCount: orders.length,
    });
  } catch (error: any) {
    console.error("pos-demand GET error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
