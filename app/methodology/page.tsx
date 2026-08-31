export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">Methodology &amp; sources</h1>
      <p className="mt-4">
        This site never publishes a single point price for a hospital. Every number is a range,
        tagged with its source and the date it was observed, so you can judge how much to trust
        it. Unlike US price transparency data, Indian hospital pricing isn&apos;t split by
        insurance plan or payer — a procedure has one rate, not a different negotiated rate per
        insurer, so that&apos;s all we show.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">Hospital directory</h2>
      <p className="mt-2">
        The 2,684-hospital directory (Bangalore, Delhi, Mumbai, Pune, Chennai, Hyderabad) is
        adapted from Bajaj Allianz&apos;s public network-hospital locator, which lists
        cashless-network hospitals along with bed counts, ICU capacity, and network status.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">Government reference rates</h2>
      <p className="mt-2">
        The Rate Explorer and every procedure page&apos;s &quot;CGHS reference&quot; figure comes
        directly from the Central Government Health Scheme&apos;s published rate list — Tier I,
        which is Bangalore&apos;s tier, split by NABH accreditation and ward type. These are
        reimbursement rates the government pays, not necessarily what a private hospital charges
        in cash, but they&apos;re an official, consistent benchmark.
      </p>
      <p className="mt-2">
        We only show a CGHS match when we&apos;re confident it refers to the same procedure. A
        generic single word (like &quot;Angioplasty&quot;) that could mean several clinically
        different CGHS line items (coronary, peripheral, or renal) is shown as{" "}
        <em>no match</em> rather than a guess — we&apos;d rather show nothing than show something
        misleading.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">Market price estimates</h2>
      <p className="mt-2">
        City-level ranges and, where available, hospital-by-hospital breakdowns come from
        HexaHealth&apos;s published cost pages. These are editorial market estimates compiled by
        HexaHealth, not confirmed billed amounts — every page links back to the original source.
      </p>
      <p className="mt-2">
        Hospital names from HexaHealth are only linked to a specific entry in our own directory
        when the match is exact after removing formatting noise (branding, punctuation, city
        name). Hospital chains often have several branches in the same city with very different
        prices, so a fuzzy or partial match risks attributing a price to the wrong branch — we
        treat that as worse than not linking at all, and show the hospital name as plain text
        instead.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">What&apos;s next</h2>
      <p className="mt-2">
        Karnataka&apos;s KPME registry publishes statutory, per-establishment rate filings — the
        closest thing to real hospital-specific pricing available in India. We&apos;re evaluating
        whether enough hospitals have actually filed usable rate cards before building it into
        this site.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">Corrections</h2>
      <p className="mt-2">
        If you run a hospital listed here and believe something is inaccurate or out of date, we
        want to fix it quickly. A correction channel will be linked from every hospital page once
        the contribution flow ships.
      </p>
    </div>
  );
}
