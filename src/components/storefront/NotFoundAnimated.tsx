"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

const NotFoundCanvas = dynamic(() => import("./NotFoundCanvas"), {
  ssr: false,
  loading: () => (
    <div className="sarjan-not-found-canvas sarjan-not-found-canvas--loading" />
  ),
});

export function NotFoundAnimated() {
  const reduceMotion = useReducedMotion();

  const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

  const fade = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.65, ease: easeOut },
      };

  const stagger = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section className="sarjan-not-found">
      <NotFoundCanvas />
      <div className="sarjan-not-found-overlay" />
      <div className="container sarjan-not-found-content">
        <motion.p className="sarjan-not-found-eyebrow" {...fade}>
          Sarjan Textiles
        </motion.p>
        <motion.h1
          className="sarjan-not-found-code"
          {...fade}
          transition={{ delay: 0.08, duration: 0.7, ease: easeOut }}
        >
          404
        </motion.h1>
        <motion.h2
          className="sarjan-not-found-title"
          {...stagger}
          transition={{ delay: 0.16, duration: 0.6 }}
        >
          This page is off the loom
        </motion.h2>
        <motion.p
          className="sarjan-not-found-copy"
          {...stagger}
          transition={{ delay: 0.24, duration: 0.6 }}
        >
          The URL may be wrong, expired, or moved. Head back to the catalog or
          sign in to your account.
        </motion.p>
        <motion.div
          className="sarjan-not-found-actions"
          {...stagger}
          transition={{ delay: 0.32, duration: 0.6 }}
        >
          <Link href="/" className={withBtnIcon("tf-btn btn-fill radius-4")}>
            <TfButtonIcon icon="icon-arrLeft">Back to home</TfButtonIcon>
          </Link>
          <Link
            href="/categories"
            className={withBtnIcon(
              "tf-btn btn-fill radius-4 sarjan-not-found-btn-outline",
            )}
          >
            <TfButtonIcon icon="icon-arrowUpRight">Browse catalog</TfButtonIcon>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
