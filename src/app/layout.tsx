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

import { SyncProvider } from "@/context/SyncContext";
import { FloatingNavbar } from "@/components/FloatingNavbar";
import { ThemeProvider } from "@/components/ThemeProvider";
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
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthGuard>
            <SyncProvider>
              <SyncManager />
              <NavigationBar />
              <div className="pb-32">
                {children}
              </div>
              <FloatingNavbar />
              
              <footer className="w-full flex justify-center pb-40 pt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 mt-auto">
                <ThemeToggle />
              </footer>
            </SyncProvider>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
