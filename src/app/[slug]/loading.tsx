function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/70 ${className}`} />;
}

export default function PublicPageLoading() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <section className="overflow-hidden rounded-[2rem] border bg-card shadow-xl shadow-black/5">
          <div className="px-6 pb-8 pt-10 text-center">
            <Block className="mx-auto size-24 rounded-[1.75rem]" />
            <Block className="mx-auto mt-5 h-6 w-32" />
            <Block className="mx-auto mt-4 h-10 w-72 max-w-full" />
            <Block className="mx-auto mt-3 h-4 w-full max-w-xl" />
            <Block className="mx-auto mt-2 h-4 w-3/4" />
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Block key={index} className="h-9 w-32 rounded-full" />
              ))}
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:p-5">
            <Block className="h-12 w-full" />
            <Block className="h-12 w-full" />
            <Block className="h-12 w-full" />
          </div>
        </section>

        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="rounded-[2rem] border bg-card p-5 shadow-sm">
            <Block className="mb-4 h-6 w-48" />
            <Block className="h-4 w-full" />
            <Block className="mt-2 h-4 w-4/5" />
            <Block className="mt-4 h-24 w-full" />
          </section>
        ))}
      </div>
    </main>
  );
}
