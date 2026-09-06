import { cn } from "@/lib/cn";

/**
 * Charts drawn rather than plotted.
 *
 * No charting library. These are a handful of rectangles and a baseline, which
 * is all the questions on this dashboard need, and drawing them by hand keeps
 * them in the same language as the rest of the platform: hairlines, lettering
 * and square corners.
 *
 * Every chart is announced as an image with a written summary, and carries the
 * same figures again in a table that only a screen reader reads. A picture of
 * numbers is no use to somebody who cannot see it.
 */

export type Bar = { label: string; value: number; caption?: string; highlight?: boolean };

export function BarSeries({
  bars,
  summary,
  format = (value: number) => String(value),
  height = 132,
  className,
}: {
  bars: Bar[];
  summary: string;
  format?: (value: number) => string;
  height?: number;
  className?: string;
}) {
  const peak = Math.max(1, ...bars.map((bar) => bar.value));

  return (
    <figure className={cn("m-0", className)}>
      {/* The columns stretch to the full height of the row on purpose. A bar is
          sized as a percentage of its column, and a column that shrank to its
          contents would give every bar a height of nothing. */}
      <div
        role="img"
        aria-label={summary}
        className="flex items-stretch gap-1.5"
        style={{ height }}
      >
        {bars.map((bar, index) => {
          // A bar with a value still gets a visible sliver, so a quiet week
          // reads as a quiet week rather than as no data at all.
          const share = bar.value === 0 ? 0 : Math.max(0.04, bar.value / peak);

          return (
            <div
              key={`${bar.label}-${index}`}
              className="flex flex-1 flex-col justify-end"
              title={`${bar.label}: ${format(bar.value)}`}
            >
              <div
                className={cn(
                  "w-full transition-[height] duration-[--duration-settled] ease-[--ease-quiet]",
                  bar.highlight ? "bg-brick" : "bg-ink/75",
                )}
                style={{ height: `${share * 100}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5 border-t border-line pt-2">
        {bars.map((bar, index) => (
          <p
            key={`${bar.label}-label-${index}`}
            className="note flex-1 truncate text-center"
            aria-hidden="true"
          >
            {bar.caption ?? ""}
          </p>
        ))}
      </div>

      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar, index) => (
            <tr key={`${bar.label}-row-${index}`}>
              <th scope="row">{bar.label}</th>
              <td>{format(bar.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * A ranked list where the bar is the row itself.
 *
 * Used for anything where the order matters more than the exact figure: which
 * products are asked about, which categories carry the demand, who is holding
 * the most open work.
 */
export function RankedRows({
  rows,
  summary,
  className,
}: {
  rows: Array<{ key: string; label: React.ReactNode; value: number; note?: string }>;
  summary: string;
  className?: string;
}) {
  const peak = Math.max(1, ...rows.map((row) => row.value));

  if (rows.length === 0) {
    return (
      <p className={cn("text-[0.9375rem] text-ink-muted", className)}>
        Nothing recorded in this period yet.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-0", className)} aria-label={summary}>
      {rows.map((row) => (
        <li key={row.key} className="relative border-t border-line py-2.5">
          {/* The bar sits behind the row as a wash, so the label stays the
              thing being read and the length is felt rather than measured. */}
          <span
            className="absolute inset-y-0 left-0 bg-brass-wash"
            style={{ width: `${Math.max(2, (row.value / peak) * 100)}%` }}
            aria-hidden="true"
          />
          <div className="relative flex items-baseline gap-3 px-2">
            <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink">
              {row.label}
            </span>
            {row.note ? <span className="note shrink-0">{row.note}</span> : null}
            <span className="figure shrink-0 text-ink">{row.value}</span>
          </div>
        </li>
      ))}
      <li className="border-t border-line" />
    </ol>
  );
}

/** A single headline figure with the period it covers and how it has moved. */
export function Figure({
  label,
  value,
  caption,
  delta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  caption?: string;
  delta?: { value: number; suffix?: string };
  tone?: "neutral" | "warn";
}) {
  return (
    <div className="border-t border-ink pt-3">
      <p className="note">{label}</p>
      <p
        className={cn(
          "mt-4 font-display text-[2.75rem] leading-none",
          tone === "warn" && value !== "0" ? "text-brick" : "text-ink",
        )}
      >
        {value}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        {caption ? <p className="text-[0.8125rem] text-ink-muted">{caption}</p> : null}
        {delta ? (
          <p
            className={cn(
              "figure text-[0.75rem]",
              delta.value > 0 && "text-positive",
              delta.value < 0 && "text-brick",
              delta.value === 0 && "text-ink-muted",
            )}
          >
            {delta.value > 0 ? "+" : ""}
            {delta.value}
            {delta.suffix ?? ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A card on the dashboard: a lettered head, a rule, and whatever it holds. */
export function Panel({
  title,
  note,
  action,
  children,
  className,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-ink pt-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="note">{title}</h2>
        {note ? <p className="note">{note}</p> : null}
        {action ? <div className="ms-auto">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
