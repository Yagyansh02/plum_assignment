"use client";

import { useEffect, useState } from "react";
import type { SubmitState } from "@/types";

const STEPS: Record<Exclude<SubmitState, "idle" | "success" | "error">, string[]> = {
  uploading: ["Uploading documents...", "Preparing for analysis..."],
  processing: [
    "Extracting data with Gemini Vision...",
    "Validating document authenticity...",
    "Running adjudication rules...",
    "Calculating benefit amounts...",
    "Generating decision...",
  ],
};

interface LoadingSpinnerProps {
  state: SubmitState;
}

export default function LoadingSpinner({ state }: LoadingSpinnerProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const steps =
    state === "uploading" || state === "processing" ? STEPS[state] : [];

  useEffect(() => {
    setStepIndex(0);
    if (steps.length <= 1) return;

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = steps[stepIndex] ?? "Processing...";

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      {/* Animated logo ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-20 w-20 rounded-full border-2 border-plum-red/20 animate-ping" />
        <div className="absolute h-16 w-16 rounded-full border-2 border-plum-purple/40 animate-spin [animation-duration:2s]" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-plum-950 border border-white/10">
          <span className="text-xl font-black text-plum-red">p</span>
        </div>
      </div>

      {/* Step text */}
      <div className="text-center">
        <p className="text-sm font-medium text-white/90 transition-all duration-500">
          {currentStep}
        </p>
        <p className="mt-1 text-xs text-white/40">
          This may take 10–30 seconds
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === stepIndex
                ? "w-5 bg-plum-red"
                : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
