// Browser-compatible logger for renderer process
// This replaces the electron logger which can't be used in the browser

const log = {
  info: (...args: unknown[]) => console.log('[info]', ...args),
  warn: (...args: unknown[]) => console.warn('[warn]', ...args),
  error: (...args: unknown[]) => console.error('[error]', ...args),
  debug: (...args: unknown[]) => console.debug('[debug]', ...args),
  trace: (...args: unknown[]) => console.trace('[trace]', ...args),
};

export { log };
export default log;
