import { addDays } from "date-fns";

const PUBLIC_BOOKING_TOKEN_TTL_DAYS = 7;

type PublicTokenWindowInput = {
  endsAt: Date;
  updatedAt: Date;
};

export function createPublicBookingToken() {
  return crypto.randomUUID();
}

export function getPublicBookingTokenExpiresAt(input: PublicTokenWindowInput) {
  const anchor = input.updatedAt > input.endsAt ? input.updatedAt : input.endsAt;
  return addDays(anchor, PUBLIC_BOOKING_TOKEN_TTL_DAYS);
}

export function isPublicBookingTokenExpired(input: PublicTokenWindowInput, now = new Date()) {
  return now > getPublicBookingTokenExpiresAt(input);
}
