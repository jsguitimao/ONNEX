import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import { getAppUrl } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import "./globals.css";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BUKBARBEARIA.COM",
    template: "%s | BUKBARBEARIA.COM",
  },
  description:
    "Plataforma de agendamentos para barbearias com página pública, agenda operacional, equipa, CRM e lembretes.",
  metadataBase: new URL(getAppUrl()),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT" className={cn("h-full antialiased", fontSans.variable)}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ClerkProvider>
          {children}
          <CookieBanner />
        </ClerkProvider>
      </body>
    </html>
  );
}
