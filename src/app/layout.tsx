import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ApiProvider } from "@/lib/ApiProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next.js + Frappe Boilerplate",
  description: "Boilerplate Next.js + Frappe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ApiProvider khởi tạo axios + QueryClient — Frappe dùng cookie session */}
        <ApiProvider>
          {children}
        </ApiProvider>
      </body>
    </html>
  );
}
