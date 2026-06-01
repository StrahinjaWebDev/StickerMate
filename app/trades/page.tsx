import { Handshake } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function TradesPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-lift dark:border-white/10 dark:bg-neutral-900 sm:p-5">
        <h1 className="text-3xl font-black text-ink dark:text-white">Trades</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          Trading lists and sharing can plug into this page later.
        </p>
      </section>
      <EmptyState
        icon={Handshake}
        title="Trade mode is ready"
        body="The page is prepared for future wishlists, friend comparisons, and shareable duplicate lists."
      />
    </div>
  );
}
