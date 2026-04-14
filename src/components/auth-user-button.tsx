import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";

export function AuthUserButton() {
  return (
    <>
      <ClerkLoaded>
        <UserButton />
      </ClerkLoaded>
      <ClerkLoading>
        <div
          aria-hidden="true"
          className="size-10 rounded-full border border-border/70 bg-muted/50"
        />
      </ClerkLoading>
    </>
  );
}
