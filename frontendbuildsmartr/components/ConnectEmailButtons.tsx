"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";

// Google Logo SVG Component
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

interface ConnectEmailButtonsProps {
  gmailEmail?: string | null;
  outlookEmail?: string | null;
}

export default function ConnectEmailButtons({ gmailEmail, outlookEmail }: ConnectEmailButtonsProps) {
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  // Handle OAuth callback - process URL parameters after redirect
  useEffect(() => {
    const processOAuthCallback = async () => {
      // Prevent double processing
      if (hasProcessedRef.current) return;

      // Check for Gmail OAuth callback
      const gmailConnected = searchParams.get("gmail_connected");
      const gmailEmailParam = searchParams.get("gmail_email");
      const gmailCreds = searchParams.get("gmail_creds");

      if (gmailConnected === "true" && gmailEmailParam && gmailCreds) {
        hasProcessedRef.current = true; // Mark as processed immediately
        setIsProcessing(true);
        setError(null);

        try {
          // Decode the base64 credentials
          const credsJson = atob(gmailCreds);
          const credentials = JSON.parse(credsJson);

          console.log("Processing Gmail OAuth callback for:", gmailEmailParam);

          // Save credentials to backend
          const response = await fetch("/api/user/connect/gmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gmail_email: gmailEmailParam,
              gmail_token: credentials,
            }),
          });

          if (response.ok) {
            console.log("Gmail connected successfully!");
            // Use window.location.href to do a clean redirect (clears URL params)
            window.location.href = "/account";
          } else {
            const data = await response.json();
            setError(data.error || "Failed to save Gmail credentials");
            console.error("Failed to save Gmail credentials:", data);
            hasProcessedRef.current = false; // Allow retry on error
          }
        } catch (err) {
          console.error("Error processing Gmail OAuth:", err);
          setError("Failed to process Gmail authentication");
          hasProcessedRef.current = false; // Allow retry on error
        } finally {
          setIsProcessing(false);
        }
        return; // Exit early after processing Gmail
      }

      // Check for Outlook OAuth callback
      const outlookConnected = searchParams.get("outlook_connected");
      const outlookEmailParam = searchParams.get("outlook_email");
      const outlookCreds = searchParams.get("outlook_creds");

      if (outlookConnected === "true" && outlookEmailParam && outlookCreds) {
        hasProcessedRef.current = true;
        setIsProcessing(true);
        setError(null);

        try {
          const credsJson = atob(outlookCreds);
          const credentials = JSON.parse(credsJson);

          console.log("Processing Outlook OAuth callback for:", outlookEmailParam);

          const response = await fetch("/api/user/connect/outlook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outlook_email: outlookEmailParam,
              outlook_token: credentials,
            }),
          });

          if (response.ok) {
            console.log("Outlook connected successfully!");
            window.location.href = "/account";
          } else {
            const data = await response.json();
            setError(data.error || "Failed to save Outlook credentials");
            hasProcessedRef.current = false;
          }
        } catch (err) {
          console.error("Error processing Outlook OAuth:", err);
          setError("Failed to process Outlook authentication");
          hasProcessedRef.current = false;
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // Check for OAuth errors
      const oauthError = searchParams.get("error");
      const errorMessage = searchParams.get("message");
      if (oauthError) {
        setError(errorMessage || oauthError);
      }
    };

    processOAuthCallback();
  }, [searchParams]);

  const handleConnectGmail = () => {
    window.location.href = "/api/email/gmail";
  };

  const handleConnectOutlook = () => {
    window.location.href = "/api/email/outlook";
  };

  const handleDisconnectGmail = async () => {
    try {
      const response = await fetch("/api/email/gmail/disconnect", { method: "POST" });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to disconnect Gmail:", error);
    }
  };

  const handleDisconnectOutlook = async () => {
    try {
      const response = await fetch("/api/email/outlook/disconnect", { method: "POST" });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to disconnect Outlook:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 p-3 bg-accent/20 rounded-lg text-accent">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Connecting your email account...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Gmail Connection - only show if no Outlook connected */}
      {!outlookEmail && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/20 rounded-lg gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Image src="/gmail.svg" alt="Gmail" width={24} height={24} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground">Gmail</p>
              {gmailEmail ? (
                <p className="text-sm text-green-400 truncate">{gmailEmail}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>
          {gmailEmail ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">Connected</span>
              <Button
                onClick={handleDisconnectGmail}
                variant="outline"
                size="sm"
                className="text-red-400 border-red-400/50 hover:bg-red-500/10"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectGmail}
              variant="outline"
              size="sm"
              disabled={isProcessing}
              className="group relative overflow-hidden bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
            >
              <GoogleLogo className="mr-2 w-4 h-4" />
              Connect Gmail
            </Button>
          )}
        </div>
      )}

      {/* Outlook Connection temporarily disabled - Google only for now
      {!gmailEmail && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/20 rounded-lg gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Image src="/outlook.svg" alt="Outlook" width={24} height={24} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground">Outlook</p>
              {outlookEmail ? (
                <p className="text-sm text-blue-400 truncate">{outlookEmail}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>
          {outlookEmail ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">Connected</span>
              <Button
                onClick={handleDisconnectOutlook}
                variant="outline"
                size="sm"
                className="text-red-400 border-red-400/50 hover:bg-red-500/10"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectOutlook}
              variant="outline"
              size="sm"
              className="group relative overflow-hidden bg-white hover:bg-blue-50 text-gray-700 border-gray-200 hover:border-blue-300"
            >
              <Image src="/outlook.svg" alt="Outlook" width={16} height={16} className="mr-2" />
              Connect Outlook
            </Button>
          )}
        </div>
      )}
      */}
    </div>
  );
}
