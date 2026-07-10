"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PublicBusinessPayload } from "@/lib/business";

const BookingSheetDialog = dynamic(
  () => import("@/components/booking-sheet-dialog").then((mod) => mod.BookingSheetDialog),
  { ssr: false },
);

type BookingSheetContextValue = {
  open: (serviceId?: string) => void;
  close: () => void;
};

const BookingSheetContext = createContext<BookingSheetContextValue | null>(null);

// Safe version for shared renderers that may be mounted outside booking pages.
export function useBookingSheetOptional(): BookingSheetContextValue | null {
  return useContext(BookingSheetContext);
}

type ProviderProps = {
  business: PublicBusinessPayload;
  mockMode?: boolean;
  children: ReactNode;
};

export function BookingSheetProvider({ business, mockMode, children }: ProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialServiceId, setInitialServiceId] = useState<string | undefined>();

  const open = useCallback((serviceId?: string) => {
    setInitialServiceId(serviceId);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <BookingSheetContext.Provider value={value}>
      {children}
      {isOpen ? (
        <BookingSheetDialog
          business={business}
          mockMode={mockMode}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          initialServiceId={initialServiceId}
        />
      ) : null}
    </BookingSheetContext.Provider>
  );
}
