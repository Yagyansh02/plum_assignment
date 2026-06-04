import type { Decision } from "@/types";
import { DECISION_CONFIG } from "@/utils/constants";

interface DecisionBadgeProps {
  decision: Decision;
  size?: "sm" | "md" | "lg";
}

export default function DecisionBadge({
  decision,
  size = "md",
}: DecisionBadgeProps) {
  const config = DECISION_CONFIG[decision];

  const sizeClasses = {
    sm: "text-xs px-2.5 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2 font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${config.colorClass} ${config.bgClass} ${config.borderClass}`}
    >
      <span className="text-base leading-none">{config.icon}</span>
      {config.label}
    </span>
  );
}
