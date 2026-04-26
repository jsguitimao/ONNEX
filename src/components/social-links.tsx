type SocialLinksProps = {
  phoneDigits: string;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  className?: string;
};

const ICON_BUTTON_CLASS =
  "flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:-translate-y-0.5 hover:border-ring hover:bg-accent";

export function SocialLinks({
  phoneDigits,
  instagramUrl,
  tiktokUrl,
  facebookUrl,
  className,
}: SocialLinksProps) {
  if (!phoneDigits && !instagramUrl && !tiktokUrl && !facebookUrl) return null;

  return (
    <div className={`flex items-center justify-center gap-3 ${className ?? ""}`}>
      {phoneDigits ? (
        <a
          href={`https://wa.me/${phoneDigits}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className={ICON_BUTTON_CLASS}
        >
          <WhatsAppIcon />
        </a>
      ) : null}
      {instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
          className={ICON_BUTTON_CLASS}
        >
          <InstagramIcon />
        </a>
      ) : null}
      {tiktokUrl ? (
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="TikTok"
          className={ICON_BUTTON_CLASS}
        >
          <TikTokIcon />
        </a>
      ) : null}
      {facebookUrl ? (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Facebook"
          className={ICON_BUTTON_CLASS}
        >
          <FacebookIcon />
        </a>
      ) : null}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.2-4.4-3.8-4.5-4-.1-.2-1-1.3-1-2.5 0-1.2.6-1.8.9-2.1.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.1.1.3 0 .5l-.3.4-.4.5c-.1.1-.3.2-.1.5.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l.8-1c.2-.3.5-.2.7-.1l1.7.8c.3.2.5.3.5.5.1.2.1.9-.1 1.6z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.56 9.88V14.9H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.9h-2.33v6.98A10 10 0 0 0 22 12z" />
    </svg>
  );
}
