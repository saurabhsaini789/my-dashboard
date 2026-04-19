import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { NavigationBar } from "@/components/NavigationBar";
import { FloatingNavbar } from "@/components/FloatingNavbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Personal OS and Productivity Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <Providers>
          <NavigationBar />
          <div className="pb-24 md:pb-32 bg-zinc-50 dark:bg-zinc-950">
            {children}
          </div>
          <FloatingNavbar />
        </Providers>
      </body>
    </html>
  );
}
