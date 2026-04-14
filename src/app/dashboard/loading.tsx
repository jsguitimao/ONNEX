function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/70 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div className="w-full max-w-2xl space-y-4">
          <Block className="h-6 w-32" />
          <Block className="h-12 w-80 max-w-full" />
          <Block className="h-5 w-full" />
          <Block className="h-5 w-2/3" />
        </div>
        <div className="flex gap-3">
          <Block className="h-10 w-36" />
          <Block className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-3xl border p-5">
            <div className="flex items-center gap-4">
              <Block className="size-11 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Block className="h-4 w-28" />
                <Block className="h-7 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-3xl border p-6">
            <Block className="mb-5 size-11 rounded-2xl" />
            <Block className="mb-3 h-6 w-2/3" />
            <Block className="h-4 w-full" />
            <Block className="mt-2 h-4 w-5/6" />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border p-6">
        <Block className="mb-4 h-7 w-48" />
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <Block className="h-5 w-36" />
                  <Block className="h-4 w-48" />
                </div>
                <div className="space-y-2">
                  <Block className="ml-auto h-4 w-24" />
                  <Block className="ml-auto h-4 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
