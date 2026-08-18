"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Shield, Send } from "lucide-react";

type StockItem = {
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  category: string;
  unit: string;
  status: "out_of_stock" | "low_stock";
};

export default function StockAlertPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [outCount, setOutCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/stock-alert/${token}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "This link is invalid or has expired");
      }
      setPhoneMasked(data.phoneMasked || "");
      setVerified(Boolean(data.verified));
      if (data.verified) {
        setItems(data.items || []);
      } else {
        setOutCount(data.outCount || 0);
        setLowCount(data.lowCount || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open stock alert");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sendOtp = async () => {
    setSending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/stock-alert/${token}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send OTP");
      }
      setMessage(`OTP sent to ${data.phoneMasked || phoneMasked}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    setVerifying(true);
    setError("");
    try {
      const response = await fetch(`/api/stock-alert/${token}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", otp }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Incorrect OTP");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setVerifying(false);
    }
  };

  const outItems = useMemo(() => items.filter((item) => item.status === "out_of_stock"), [items]);
  const lowItems = useMemo(() => items.filter((item) => item.status === "low_stock"), [items]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-semibold text-blue-700">OMOTECH HUB COMPUTERS</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Morning stock alert</h1>
          <p className="text-slate-600 mt-1">Protected list. An OTP is sent only to the saved superadmin number.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking secure link...
          </div>
        ) : error && !verified ? (
          <Card>
            <CardHeader>
              <CardTitle>Link not available</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : !verified ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Enter OTP to view the list
              </CardTitle>
              <CardDescription>
                Out of stock: {outCount} · Low stock: {lowCount}
                {phoneMasked ? ` · OTP goes to ${phoneMasked}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={sendOtp} disabled={sending} variant="outline">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send OTP
              </Button>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <Button onClick={verifyOtp} disabled={verifying || otp.length !== 6}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Unlock list
                </Button>
              </div>
              {message && <p className="text-sm text-emerald-700">{message}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-slate-600">
                {outItems.length} out of stock · {lowItems.length} low stock
              </p>
              <Button asChild>
                <a href={`/api/stock-alert/${token}/download`}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </a>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Out of stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outItems.length === 0 && <p className="text-sm text-slate-500">None</p>}
                {outItems.map((item) => (
                  <div key={`${item.sku}-${item.name}`} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.sku || "No SKU"} · {item.category}</p>
                    </div>
                    <Badge variant="destructive">0 {item.unit}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Almost out of stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowItems.length === 0 && <p className="text-sm text-slate-500">None</p>}
                {lowItems.map((item) => (
                  <div key={`${item.sku}-${item.name}`} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.sku || "No SKU"} · min {item.minStock} {item.unit}</p>
                    </div>
                    <Badge variant="secondary">{item.stock} {item.unit}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
