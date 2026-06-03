"use client";

import { useEffect } from "react";
import { initializeAuthSync } from "@/lib/authSyncStore";

export function AuthSyncController() {
  useEffect(() => {
    initializeAuthSync();
  }, []);

  return null;
}
