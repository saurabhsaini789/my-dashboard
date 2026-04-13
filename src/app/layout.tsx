import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavigationBar } from "@/components/NavigationBar";
import { DataLoader } from "@/components/DataLoader";
import { SyncManager } from "@/components/SyncManager";
import { AuthGuard } from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Dashboard - Saurabh Saini",
  description: "Personal OS and Productivity Dashboard",
};

import { AIAssistant } from "@/components/AIAssistant";
import { Providers } from "@/components/Providers";
import { FloatingNavbar } from "@/components/FloatingNavbar";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <Providers>
          <AuthGuard>
            <SyncManager />
            <NavigationBar />
            <div className="pb-24 md:pb-32">
              {children}
            </div>
            <FloatingNavbar />
            <AIAssistant />
            
            <footer className="w-full flex justify-center pb-40 pt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 mt-auto">
              {/* Note: ThemeToggle needs to be inside Providers if it uses theme context */}
              {/* @ts-ignore */}
              <ThemeToggle />
            </footer>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
