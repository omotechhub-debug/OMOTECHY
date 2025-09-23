import type React from "react"
import type { Metadata } from "next"
import { Inter, Poppins, Playfair_Display, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { WhatsAppWidget } from "@/components/whatsapp-widget"
import { AuthProvider } from "@/contexts/AuthContext"
import { CartProvider } from "@/contexts/CartContext"
import { Toaster } from "@/components/ui/sonner"
import { PWASetup } from "@/components/pwa-setup"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "OMOTECH HUB | Electronics, Gas & Printing Services",
  description:
    "Professional electronics repair, gas refilling, and custom printing services. Quality technology solutions and expert service for all your needs.",
      generator: 'v0.dev',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
    statusBarStyle: 'default',
    title: 'OMOTECH HUB'
  }
}

export function generateViewport() {
  return {
    themeColor: '#6366f1',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} ${playfair.variable} ${spaceGrotesk.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <CartProvider>
              {children}
              <WhatsAppWidget />
              <Toaster />
              <PWASetup />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
