"use client";

export type ShareImageResult = "shared" | "downloaded" | "link-shared" | "failed";

type ShareImageOptions = {
  title?: string;
  text?: string;
  fallbackUrl?: string;
};

function canShareFiles(file: File) {
  if (!navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Share a generated image via Web Share API, with download/link fallbacks for Safari limits. */
export async function shareImageBlob(blob: Blob, filename: string, options: ShareImageOptions = {}): Promise<ShareImageResult> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });

  if (canShareFiles(file)) {
    try {
      await navigator.share({
        files: [file],
        title: options.title,
        text: options.text
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "failed";
      }
    }
  }

  try {
    downloadBlob(blob, filename);
  } catch {
    return "failed";
  }

  if (options.fallbackUrl && navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.fallbackUrl
      });
      return "link-shared";
    } catch {
      // Download already happened; that is enough.
    }
  }

  return "downloaded";
}
