"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import { attachStreamToVideoPreview, stopMediaStream } from "@/lib/qrCamera";
import { persistDebug } from "@/lib/persistDebug";
import { decodeQrFromVideoFrame } from "@/services/tradeQrService";

export function FriendQrScanner({
  open,
  stream,
  onClose,
  onScan
}: {
  open: boolean;
  stream: MediaStream | null;
  onClose: () => void;
  onScan: (data: string) => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanInFlightRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [previewReady, setPreviewReady] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onClose, onScan]);

  useEffect(() => {
    if (!open) {
      setPreviewReady(false);
      setAttachError(null);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !stream) return;

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    function stopScanLoop() {
      if (scanTimerRef.current !== null) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      scanInFlightRef.current = false;
    }

    function startScanLoop() {
      stopScanLoop();
      scanTimerRef.current = window.setInterval(() => {
        if (cancelled || !videoRef.current || scanInFlightRef.current) return;
        scanInFlightRef.current = true;
        void decodeQrFromVideoFrame(videoRef.current)
          .then((data) => {
            if (!data || cancelled) return;
            stopScanLoop();
            onScanRef.current(data);
          })
          .finally(() => {
            scanInFlightRef.current = false;
          });
      }, 220);
    }

    setPreviewReady(false);
    setAttachError(null);

    void attachStreamToVideoPreview(video, stream)
      .then(() => {
        if (cancelled) return;
        setPreviewReady(true);
        startScanLoop();
      })
      .catch((error) => {
        persistDebug("qr-camera-attach-failed", { error: String(error) });
        if (cancelled) return;
        setAttachError(t("friendQr.cameraUnavailable"));
      });

    return () => {
      cancelled = true;
      stopScanLoop();
      video.srcObject = null;
      setPreviewReady(false);
    };
  }, [open, stream, t]);

  function handleClose() {
    onCloseRef.current();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-qr-scanner-title"
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <p id="friend-qr-scanner-title" className="text-base font-black text-white">
            {t("friendQr.scanCameraLong")}
          </p>
          <p className="mt-1 text-sm font-semibold text-white/80">
            {previewReady ? t("friendQr.scanCameraHint") : t("friendQr.cameraStarting")}
          </p>
        </div>
        <Button className="min-h-10 shrink-0 px-3" onClick={handleClose}>
          <X size={18} />
          {t("common.cancel")}
        </Button>
      </div>

      <div className="relative mx-auto mt-4 h-[min(62vh,520px)] min-h-[280px] w-full max-w-lg shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 z-0 h-full w-full object-cover [transform:translateZ(0)]"
          playsInline
          muted
          autoPlay
          aria-label={t("friendQr.scanCameraLong")}
        />
        <div className="pointer-events-none absolute inset-8 z-10 rounded-lg border-2 border-white/70" aria-hidden="true" />
      </div>

      {attachError ? (
        <div className="mx-auto mt-4 w-full max-w-lg space-y-3">
          <p className="rounded-lg bg-coral/15 p-3 text-sm font-bold text-coral">{attachError}</p>
          <p className="text-center text-sm font-semibold text-white/75">{t("friendQr.cameraFallbackHint")}</p>
        </div>
      ) : (
        <p className="mx-auto mt-4 w-full max-w-lg text-center text-sm font-semibold text-white/75">
          {previewReady ? t("friendQr.scanCameraHint") : t("friendQr.cameraStarting")}
        </p>
      )}
    </div>
  );
}

export function releaseScannerStream(stream: MediaStream | null) {
  stopMediaStream(stream);
}
