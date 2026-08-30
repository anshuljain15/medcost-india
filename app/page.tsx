import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20">
      <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
        Bangalore pricing pilot
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
        Know what a procedure should cost, before you walk into a hospital.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
        MedCost India is a directory of 2,684 network hospitals across six Indian metros, with a
        transparent, source-cited procedure-pricing layer being built for Bangalore first —
        government reference rates, market estimates, and hospital-level ranges, never a single
        made-up number.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/hospitals"
          className="rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Browse hospitals
        </Link>
        <Link
          href="/methodology"
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          How we source this
        </Link>
      </div>
    </div>
  );
}
