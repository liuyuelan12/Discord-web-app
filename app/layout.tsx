import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EParticle Discord 管理平台",
  description: "EParticle Discord 自动化管理平台 - 支持消息爬取、自动发帖、对话模拟等功能",
  keywords: ["Discord", "自动化", "机器人", "消息爬取", "自动发帖", "对话模拟"],
  authors: [{ name: "EParticle" }],
  icons: {
    icon: '/discord-logo.png',
    shortcut: '/discord-logo.png',
    apple: '/discord-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/discord-logo.png" type="image/png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
