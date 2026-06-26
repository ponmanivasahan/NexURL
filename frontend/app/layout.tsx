import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NexURL — Modern URL Shortener",
  description:
    "Shorten, share, and track your links with NexURL. Lightning-fast redirects, detailed analytics, custom aliases, and a developer-friendly API.",
  keywords: ["url shortener", "link shortener", "analytics", "short links"],
  openGraph: {
    title: "NexURL — Modern URL Shortener",
    description: "Shorten, share, and track your links with powerful analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
