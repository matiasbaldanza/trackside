/**
 * The schedule, before it has arrived.
 *
 * Deliberately a skeleton of the right shape rather than a spinner. The
 * schedule's geometry is fixed -- a header, two rows of filters, a heading and
 * a grid -- so the placeholder can occupy the space the real thing will,
 * and nothing moves when it does. A spinner would be replaced by content of
 * an unrelated size, which is a layout shift with extra steps.
 *
 * `animate-pulse` is a Tailwind animation, and the global stylesheet reduces
 * every animation to nothing under `prefers-reduced-motion`. A pulsing page is
 * a poor experience for someone who asked for less motion, and the skeleton
 * still communicates without it.
 */
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-surface ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-[110rem] px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the programme.
      </p>

      <div className="border-b border-line pb-6">
        <Block className="h-8 w-64" />
        <Block className="mt-3 h-4 w-80" />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex gap-2">
          <Block className="h-8 w-28" />
          <Block className="h-8 w-28" />
        </div>
        <div className="flex gap-2">
          <Block className="h-8 w-24" />
          <Block className="h-8 w-36" />
          <Block className="h-8 w-28" />
          <Block className="h-8 w-28" />
        </div>
      </div>

      <Block className="mt-8 h-6 w-56" />

      <div className="mt-4 flex flex-col gap-2 lg:grid lg:grid-cols-4 lg:gap-2">
        {Array.from({ length: 12 }, (_, index) => (
          <Block key={index} className="h-24" />
        ))}
      </div>
    </main>
  );
}
