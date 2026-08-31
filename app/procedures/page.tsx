import { getAllProcedures } from "@/lib/data";
import ProcedureGrid from "@/components/ProcedureGrid";

export default function ProceduresPage() {
  const procedures = getAllProcedures();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ink-900">Procedures priced in Bangalore</h1>
      <p className="mt-2 max-w-2xl text-ink-700">
        {procedures.length} procedures with a market price range, sourced from HexaHealth and
        checked against the CGHS government reference rate where a confident match exists.
      </p>
      <ProcedureGrid procedures={procedures} />
    </div>
  );
}
