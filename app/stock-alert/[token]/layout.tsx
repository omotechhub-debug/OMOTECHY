import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock alert | OMOTECH HUB",
  robots: { index: false, follow: false },
};

export default function StockAlertLayout({ children }: { children: ReactNode }) {
  return children;
}
