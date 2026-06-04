"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { adjudicateDocuments } from "@/services/api";
import type { AdjudicationResponse, SubmitState } from "@/types";

interface UseClaimSubmitReturn {
  state: SubmitState;
  result: AdjudicationResponse | null;
  error: string | null;
  submit: (files: File[]) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook that manages the full lifecycle of a claim submission:
 * idle → uploading → processing → success | error
 */
export function useClaimSubmit(): UseClaimSubmitReturn {
  const { userId, getToken } = useAuth();
  const [state, setState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<AdjudicationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (files: File[]) => {
      if (!userId) {
        setError("You must be signed in to submit a claim.");
        setState("error");
        return;
      }
      if (files.length === 0) {
        setError("Please upload at least one document.");
        setState("error");
        return;
      }

      try {
        setState("uploading");
        setError(null);
        setResult(null);

        const token = await getToken();
        if (!token) {
          throw new Error("Authentication token unavailable. Please sign in again.");
        }

        setState("processing");
        const response = await adjudicateDocuments(files, userId, token);

        setResult(response);
        setState("success");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        setState("error");
      }
    },
    [userId, getToken]
  );

  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, submit, reset };
}
