import { Configuration, LogLevel, PublicClientApplication, EventType } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.NEXT_PUBLIC_MS_CLIENT_ID as string,
        authority: "https://login.microsoftonline.com/consumers",
        // Using window.location.href to catch the exact current page including basePath
        redirectUri: typeof window !== "undefined" ? window.location.href.split('?')[0].split('#')[0] : "http://localhost:3000/my-dashboard/",
        postLogoutRedirectUri: typeof window !== "undefined" ? window.location.origin + "/my-dashboard/" : "http://localhost:3000/my-dashboard/",
    },
    cache: {
        cacheLocation: "sessionStorage", // More reliable for redirect flows
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        break;
                    case LogLevel.Warning:
                        console.warn(message);
                        break;
                    default:
                        break;
                }
            },
            logLevel: LogLevel.Warning,
        },
        allowRedirectInIframe: true,
    }
};

export const loginRequest = {
    scopes: ["User.Read", "Notes.ReadWrite"]
};

// Singleton instance
let msalInstance: PublicClientApplication | null = null;

export const getMsalInstance = () => {
    if (!msalInstance) {
        msalInstance = new PublicClientApplication(msalConfig);
    }
    return msalInstance;
};
