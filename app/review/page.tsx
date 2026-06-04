"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers3 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Card } from "@/components/ui/Primitives";
import { QuickAlbumReview } from "@/features/stickers/QuickAlbumReview";
import { useI18n } from "@/hooks/useI18n";
import { stickers } from "@/lib/stickers";
import { useCollectionStore } from "@/stores/useCollectionStore";

export default function ReviewPage() {
  const { t } = useI18n();
  const reviewCurrentIndex = useCollectionStore((state) => state.reviewCurrentIndex);
  const reviewCompleted = useCollectionStore((state) => state.reviewCompleted);
  const resetReview = useCollectionStore((state) => state.resetReview);
  const hasProgress = reviewCurrentIndex > 0 || reviewCompleted;
  const [started, setStarted] = useState(!hasProgress);
  const [restartOpen, setRestartOpen] = useState(false);

  if (started) {
    return <QuickAlbumReview />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="shadow-lift">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pitch text-white">
            <Layers3 size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-ink dark:text-white">{t("review.restartGateTitle")}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600 dark:text-neutral-400">
              {t("review.restartGateBody", {
                current: Math.min(reviewCurrentIndex + 1, stickers.length),
                total: stickers.length
              })}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            tone="primary"
            className="w-full"
            onClick={() => setStarted(true)}
          >
            {t("onboarding.reviewContinue")}
          </Button>
          <Button className="w-full" onClick={() => setRestartOpen(true)}>
            {t("review.restartConfirmAction")}
          </Button>
        </div>
        <Link
          href="/fill"
          className="mt-3 inline-flex min-h-10 items-center text-sm font-black text-pitch"
        >
          {t("common.back")}
        </Link>
      </Card>

      <ConfirmDialog
        open={restartOpen}
        title={t("review.restartTitle")}
        body={t("review.restartBody")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("review.restartConfirmAction")}
        onCancel={() => setRestartOpen(false)}
        onConfirm={() => {
          resetReview();
          setRestartOpen(false);
          setStarted(true);
        }}
      />
    </div>
  );
}
