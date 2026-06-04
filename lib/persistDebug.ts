const enabled = process.env.NODE_ENV !== "production";

export function persistDebug(label: string, detail?: Record<string, unknown>) {
  if (!enabled) return;
  if (detail) {
    console.info(`[stickermate:${label}]`, detail);
  } else {
    console.info(`[stickermate:${label}]`);
  }
}
