// ---- FORCE COLORS BEFORE IMPORT ----
if (process.platform === "win32") {
  process.env.FORCE_COLOR = "3";
  process.env.NODE_DISABLE_COLORS = "0";
}

import log from "electron-log";
import { app } from "electron";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

/**
 * Initialize electron-log with file and console logging
 */
export function initializeLogger(): void {
  // --- File logging ---
  log.transports.file.resolvePathFn = () => {
    try {
      return path.join(
        app?.getPath?.("documents") || process.cwd(),
        "natively_debug.log"
      );
    } catch {
      return path.join(process.cwd(), "natively_debug.log");
    }
  };

  log.transports.file.level = isDev ? "debug" : "info";
  log.transports.file.format =
    "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

  // --- Console logging with colors ---
  log.transports.console.level = isDev ? "debug" : "warn";

  // Enable colored output on Windows
  if (process.platform === "win32") {
    log.transports.console.useStyles = true;
  }

  // Format with colors - electron-log will colorize {level} automatically
  log.transports.console.format = "[{h}:{i}:{s}.{ms}] [{level}] {text}";

  setupExceptionHandlers();

  log.info("Logger initialized");
}

/**
 * Handle uncaught exceptions and unhandled rejections
 */
function setupExceptionHandlers(): void {
  process.on("uncaughtException", (err) => {
    log.error(
      "[CRITICAL] Uncaught Exception:",
      err?.stack || err?.message || err
    );
  });

  process.on("unhandledRejection", (reason, promise) => {
    log.error(
      "[CRITICAL] Unhandled Rejection at:",
      promise,
      "reason:",
      reason
    );
  });
}

/**
 * Prevent EIO crashes from stdout/stderr
 */
export function setupProcessErrorHandlers(): void {
  process.stdout?.on?.("error", () => {});
  process.stderr?.on?.("error", () => {});
}

export { log };