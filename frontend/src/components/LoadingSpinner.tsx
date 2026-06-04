"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { SubmitState } from "@/types";

// 👇 Tell Next.js to only load the Lottie Player in the browser, never on the server.
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

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
  }, [state, steps.length]);

  const currentStep = steps[stepIndex] ?? "Processing...";

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      
      {/* ── Lottie Animation ─────────────────────────────────────── */}
      <div className="relative flex items-center justify-center h-42 w-42">
        <Player
          autoplay
          loop
          src="/spinner.json"
          style={{ height: "100%", width: "100%" }}
        />
      </div>

      {/* ── Step text ────────────────────────────────────────────── */}
      <div className="text-center mt-2">
        <p className="text-sm font-medium text-white/90 transition-all duration-500">
          {currentStep}
        </p>
        <p className="mt-1 text-xs text-white/40">
          This may take 10–30 seconds
        </p>
      </div>

      {/* ── Progress dots ────────────────────────────────────────── */}
      <div className="flex gap-1.5 mt-2">
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