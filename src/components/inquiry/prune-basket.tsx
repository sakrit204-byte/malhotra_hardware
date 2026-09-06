"use client";

import { useEffect, useRef } from "react";

import { pruneInquiryBasket } from "@/server/actions/inquiry-basket";

/**
 * Tidies the stored basket after the workspace found something stale in it.
 *
 * The page cannot write a cookie while it renders, so it renders what it could
 * resolve and mounts this to make the stored copy agree. It runs at most once,
 * renders nothing, and its absence changes nothing a customer can see: without
 * JavaScript the cookie is tidied by the next action instead.
 */
export function PruneBasket() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void pruneInquiryBasket();
  }, []);

  return null;
}
