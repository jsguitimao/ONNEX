"use client";

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Drawer } from "@base-ui/react/drawer";
import { BioSection } from "@/components/bio-section";
import {
  bioSectionActionClassName,
  bioSectionActionStyle,
} from "@/components/bio-section-action";
import { BioSelectionTick } from "@/components/bio-selection-tick";
import { useBookingSheet } from "@/components/booking-sheet";
import { formatEuro } from "@/lib/formatters";

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

type Props = {
  services: ServiceItem[];
  featured?: number;
  sectionId?: string;
  sectionTitle?: string;
};

export function ServicesCatalog({
  services,
  featured = 5,
  sectionId = "servicos",
  sectionTitle = "Os nossos serviços",
}: Props) {
  const [open, setOpen] = useState(false);
  const bookingSheet = useBookingSheet();
  const featuredServices = services.slice(0, featured);
  const showSeeAll = services.length > featured;

  const handleBookService = (serviceId: string) => {
    setOpen(false);
    bookingSheet.open(serviceId);
  };

  const headerAction = showSeeAll ? (
    <Drawer.Trigger
      className={bioSectionActionClassName}
      style={bioSectionActionStyle}
    >
      VER TODOS
      <ChevronRight className="size-3.5" />
    </Drawer.Trigger>
  ) : null;

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <BioSection id={sectionId} title={sectionTitle} headerAction={headerAction}>
        <ul className="flex flex-col gap-2">
          {featuredServices.map((service) => (
            <li key={service.id}>
              <ServiceCard service={service} onSelect={handleBookService} />
            </li>
          ))}
        </ul>
      </BioSection>

      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Drawer.Popup className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-[var(--bio-card-width)] flex-col overflow-hidden rounded-t-2xl bg-[#09090b] text-[#fafafa] shadow-[0_-12px_40px_rgba(0,0,0,0.6)] transition-transform duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full">
          <DrawerHandle />

          <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
            <Drawer.Title
              className="font-bold text-[#fafafa]"
              style={{ fontSize: "20px", lineHeight: "28px", letterSpacing: "-0.4px" }}
            >
              {sectionTitle}
            </Drawer.Title>
            <Drawer.Close
              aria-label="Fechar"
              className="flex size-9 items-center justify-center rounded-full bg-white/[0.08] text-[#fafafa] transition active:bg-white/[0.14]"
            >
              <X className="size-4" strokeWidth={2.5} />
            </Drawer.Close>
          </header>

          <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
            <ul className="flex flex-col gap-2">
              {services.map((service) => (
                <li key={service.id}>
                  <ServiceCard service={service} onSelect={handleBookService} />
                </li>
              ))}
            </ul>
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ServiceCard({
  service,
  onSelect,
}: {
  service: ServiceItem;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      className="flex h-14 w-full items-center gap-3 rounded-lg bg-[#fafafa] px-4 text-left text-[#0a0a0a] transition duration-150 hover:shadow-[0_0_0_2px_var(--bio-accent-ring),0_0_0_3px_var(--bio-accent)] active:shadow-[0_0_0_2px_var(--bio-accent-ring),0_0_0_3px_var(--bio-accent)]"
    >
      <BioSelectionTick active={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{service.name}</p>
        <p className="text-xs text-[#71717a]">{service.durationMinutes} min</p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums">
        {formatEuro(service.priceCents)}
      </p>
    </button>
  );
}

function DrawerHandle() {
  return (
    <div className="flex justify-center pb-2 pt-3">
      <span aria-hidden className="h-1 w-9 rounded-full bg-white/20" />
    </div>
  );
}
