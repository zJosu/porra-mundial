import type { Metadata, Viewport } from "next";
import { Geist, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Porra World Cup 2026",
  description: "Pool Manager para el Mundial de Fútbol 2026 · USA · Canadá · México",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  // No maximumScale → usuario puede hacer zoom a más; sin user-scalable=no → no bloqueamos
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === (process.env.ADMIN_EMAIL ?? '')

  return (
    <html lang="es" className={`${geist.variable} ${bebasNeue.variable} h-full antialiased`}>
      <body className="h-full bg-gray-50 text-gray-900 font-sans">
        {user ? (
          <div className="flex h-full">
            <SideNav userEmail={user.email} isAdmin={isAdmin} />
            <main className="flex-1 min-h-0 pb-16 md:pb-0 overflow-y-auto">
              {children}
            </main>
          </div>
        ) : (
          <main className="min-h-full">{children}</main>
        )}
        {user && <BottomNav userEmail={user.email} isAdmin={isAdmin} />}
      </body>
    </html>
  );
}
