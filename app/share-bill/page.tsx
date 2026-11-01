import type { Metadata } from "next";
import { getCities } from "@/lib/data";
import ShareBillView from "@/components/ShareBillView";

export const metadata: Metadata = {
  title: "Share your bill",
  description:
    "Anonymously share what a hospital quoted and what you finally paid, so the next family knows what to expect. No login, no upload.",
};

export default function ShareBillPage() {
  // Server component: only the six city names cross to the client. The
  // procedure list and the 2,684-row hospital index are fetched from
  // public/data/search when the screen that needs them is shown, which keeps
  // out/share-bill.html small.
  return <ShareBillView cities={getCities()} />;
}
