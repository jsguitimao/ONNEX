import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "card" | "photo";

type Props = {
  active: boolean;
  variant?: Variant;
};

/**
 * Affordance for selectable card-like items across the bio surface.
 * - `card` variant: assumes a white card background (gray ghost border)
 * - `photo` variant: assumes a photo background underneath (white ghost border + backdrop)
 * Selected state is identical in both: filled blue accent + white check.
 */
export function BioSelectionTick({ active, variant = "card" }: Props) {
  const isPhoto = variant === "photo";

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-colors duration-150",
        isPhoto ? "size-6" : "size-5",
        active
          ? "bg-[var(--bio-accent)] text-[var(--bio-accent-foreground)]"
          : isPhoto
            ? "border-[1.5px] border-white/85 bg-black/35 backdrop-blur-sm"
            : "border-[1.5px] border-[#d4d4d8] bg-transparent",
      )}
    >
      <Check
        className={cn(
          "transition-all duration-150 ease-out",
          isPhoto ? "size-3.5" : "size-3",
          active ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
        strokeWidth={3}
      />
    </span>
  );
}
