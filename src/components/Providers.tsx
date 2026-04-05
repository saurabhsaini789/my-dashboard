'use client';

import { useEffect, useState, useRef } from "react";
import { MsalProvider } from "@azure/msal-react";
import { getMsalInstance, loginRequest } from "@/lib/msalConfig";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SyncProvider } from "@/context/SyncContext";
import { EventType } from "@azure/msal-browser";

export function Providers({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const msalInstance = getMsalInstance();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeMsal = async () => {
      try {
        console.log("MSAL: Initializing instance...");
        await msalInstance.initialize();
        
        // Handle redirect promise (important for both redirect and catching popup response)
        const result = await msalInstance.handleRedirectPromise();
        console.log("MSAL: Redirect promise handled.", result);

        if (result && result.account) {
          msalInstance.setActiveAccount(result.account);
        } else {
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
            msalInstance.setActiveAccount(accounts[0]);
          }
        }

        // Add event callback for future login/logout events
        msalInstance.addEventCallback((event) => {
          if ((event.eventType === EventType.LOGIN_SUCCESS || event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) && event.payload) {
            const payload = event.payload as any;
            const account = payload.account;
            if (account) {
              msalInstance.setActiveAccount(account);
            }
          }
        });

        console.log("MSAL: Initialization complete.");
      } catch (err) {
        console.error("MSAL: Initialization failed:", err);
      } finally {
        setInitialized(true);
      }
    };

    initializeMsal();
  }, [msalInstance]);

  if (!initialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] z-[9999]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="ml-4 text-white/50 text-xs font-mono tracking-widest uppercase">Initializing Secure OS...</span>
      </div>
    );
  }

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <MsalProvider instance={msalInstance}>
        <SyncProvider>
          {children}
        </SyncProvider>
      </MsalProvider>
    </ThemeProvider>
  );
}
