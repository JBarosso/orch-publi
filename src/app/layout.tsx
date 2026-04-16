import type { Metadata } from "next";
import { Lato, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const lato = Lato({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brief Builder — E-merch",
  description: "Outil interne de création de briefs e-commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${lato.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex h-screen overflow-hidden">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
