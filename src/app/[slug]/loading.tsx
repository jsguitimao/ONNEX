function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export default function PublicPageLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Block className="h-[30vh] w-full rounded-none" />

      <section className="mx-auto max-w-3xl px-5 pt-10 text-center sm:pt-14">
        <Block className="mx-auto h-10 w-64 max-w-full" />
        <Block className="mx-auto mt-4 h-4 w-80 max-w-full" />
        <div className="mt-6 flex justify-center gap-3">
          <Block className="size-11 rounded-full" />
          <Block className="size-11 rounded-full" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <Block className="mx-auto mb-6 h-7 w-56" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Block key={index} className="aspect-[1/1.15] w-full" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-xl px-5 py-12 sm:py-16">
        <Block className="mx-auto mb-6 h-7 w-48" />
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-5">
          <Block className="h-11 w-full" />
          <Block className="h-11 w-full" />
          <Block className="h-11 w-full" />
          <Block className="h-24 w-full" />
          <Block className="h-12 w-full rounded-xl" />
        </div>
      </section>
    </main>
  );
}
