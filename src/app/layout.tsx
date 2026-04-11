import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
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
    default: "Bukly",
    template: "%s | Bukly",
  },
  description:
    "Plataforma de agendamentos para negócios de serviços com página pública por profissional, agenda, equipa e clientes.",
  metadataBase: new URL("https://bukly.vercel.app"),
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
