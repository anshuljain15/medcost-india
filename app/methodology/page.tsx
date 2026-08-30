export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Methodology &amp; sources
      </h1>
      <p className="mt-4">
        This site never publishes a single point price for a hospital. Every number is a range,
        tagged with its source and the date it was observed, so you can judge how much to trust
        it.
      </p>

      <h2 className="mt-8 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Hospital directory
      </h2>
      <p className="mt-2">
        The 2,684-hospital directory (Bangalore, Delhi, Mumbai, Pune, Chennai, Hyderabad) is
        adapted from Bajaj Allianz&apos;s public network-hospital locator, which lists
        cashless-network hospitals along with bed counts, ICU capacity, and network status.
      </p>

      <h2 className="mt-8 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Pricing (in progress)
      </h2>
      <p className="mt-2">The pricing layer, starting with Bangalore, will combine:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <strong>Government reference rates</strong> — CGHS, Ayushman Bharat PM-JAY, and
          Karnataka&apos;s AB-ArK/SAST package rates. These are reimbursement rates, not market
          prices, but they are official and consistent.
        </li>
        <li>
          <strong>Market estimate ranges</strong> — city-level cost ranges from healthcare-cost
          aggregators, shown as a triangulated range, not a single figure.
        </li>
        <li>
          <strong>Hospital-specific data</strong> — where publicly available, including
          Karnataka&apos;s statutory KPME rate filings.
        </li>
        <li>
          <strong>User-contributed bills</strong> — redacted, structured, and clearly marked as
          self-reported.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-medium text-zinc-900 dark:text-zinc-50">Corrections</h2>
      <p className="mt-2">
        If you run a hospital listed here and believe something is inaccurate or out of date, we
        want to fix it quickly. A correction channel will be linked from every hospital page once
        the pricing layer ships.
      </p>
    </div>
  );
}
