function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/70 ${className}`} />;
}

export default function OnboardingLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="w-full max-w-3xl space-y-4">
          <Block className="h-6 w-36" />
          <Block className="h-12 w-96 max-w-full" />
          <Block className="h-5 w-full" />
          <Block className="h-5 w-3/4" />
        </div>
        <div className="flex gap-3">
          <Block className="h-10 w-40" />
          <Block className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Block key={index} className="h-10 w-56 rounded-full" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border p-6">
          <Block className="mb-6 h-7 w-56" />
          <div className="grid gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Block className="h-4 w-32" />
                <Block className="h-11 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border p-6">
          <Block className="mb-6 h-7 w-40" />
          <div className="space-y-4">
            <Block className="h-48 w-full rounded-[2rem]" />
            <Block className="h-28 w-full" />
            <Block className="h-24 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
