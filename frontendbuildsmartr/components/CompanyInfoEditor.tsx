"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CompanyInfoEditorProps {
  initialValue?: string | null;
}

export default function CompanyInfoEditor({ initialValue }: CompanyInfoEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(initialValue || "");
  const [savedValue, setSavedValue] = useState(initialValue || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/user/company-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyInfo }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setSavedValue(companyInfo);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save company info");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCompanyInfo(savedValue);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {!isEditing ? (
        <>
          {savedValue ? (
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="text-foreground whitespace-pre-wrap">{savedValue}</p>
            </div>
          ) : (
            <div className="bg-muted/20 rounded-lg p-4 border-2 border-dashed border-muted-foreground/30">
              <p className="text-muted-foreground text-center">
                No company information added yet. Click "Edit" to add details about your company.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="bg-accent/10 hover:bg-accent/20 text-accent border-accent/30"
            >
              <EditIcon className="w-4 h-4 mr-2" />
              {savedValue ? "Edit" : "Add Company Info"}
            </Button>
            {success && (
              <span className="text-sm text-green-400">✓ Saved successfully</span>
            )}
          </div>
        </>
      ) : (
        <>
          <textarea
            value={companyInfo}
            onChange={(e) => setCompanyInfo(e.target.value)}
            placeholder="Tell us about your company...&#10;&#10;Example:&#10;We are a steel fabrication company servicing British Columbia. Our prices are competitive and we specialize in custom metal work for commercial and residential projects."
            className="w-full h-40 p-4 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="bg-accent hover:bg-accent/90 text-background"
            >
              {isSaving ? (
                <>
                  <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
