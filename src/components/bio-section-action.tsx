import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

export const bioSectionActionClassName =
  "flex shrink-0 items-center gap-1 font-bold uppercase text-[#fafafa] transition hover:opacity-70 cursor-pointer";

export const bioSectionActionStyle = {
  fontSize: "var(--text-bio-label)",
  lineHeight: "var(--text-bio-label-line)",
  letterSpacing: "var(--text-bio-label-tracking)",
} as const;

export function BioSectionActionLink({
  href,
  children,
  ...rest
}: ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={bioSectionActionClassName}
      style={bioSectionActionStyle}
      {...rest}
    >
      {children}
      <ChevronRight className="size-3.5" />
    </Link>
  );
}
