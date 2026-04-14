import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { getAppUrl } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import "./globals.css";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontHeading = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
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
    <html lang="pt-PT" className={cn("h-full antialiased", fontSans.variable, fontHeading.variable)}>
      <body className="min-h-full bg-background text-foreground">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
