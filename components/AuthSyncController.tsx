"use client";

import { useLayoutEffect } from "react";
import { initDefaultCollectionScope } from "@/lib/collectionBootstrap";
import { initializeAuthSync } from "@/lib/authSyncStore";

export function AuthSyncController() {
  useLayoutEffect(() => {
    initDefaultCollectionScope();
    initializeAuthSync();
  }, []);

  return null;
}
