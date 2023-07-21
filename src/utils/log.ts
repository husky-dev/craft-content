/* eslint-disable no-console */
export const log = {
  debug: (...args: unknown[]) => console.log('[-]:', ...args),
  info: (...args: unknown[]) => console.log('[+]:', ...args),
  err: (...args: unknown[]) => console.log('[x]:', ...args),
};
