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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthGuard>
          <SyncProvider>
            <SyncManager />
            <NavigationBar />
            <div className="pb-32">
              {children}
            </div>
            <FloatingNavbar />
          </SyncProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
