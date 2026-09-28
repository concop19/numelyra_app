// Polyfills for React Native Web & Reanimated Web
const g =
  typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
    ? globalThis
    : globalThis;

if (typeof (g as any).setImmediate === 'undefined') {
  (g as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
    setTimeout(fn, 0, ...args);
  (g as any).clearImmediate = (id: any) => clearTimeout(id);
}

// Reanimated 2 worklet globals for web
if (typeof (g as any)._frameTimestamp === 'undefined') {
  (g as any)._frameTimestamp = null;
}
if (typeof (g as any)._eventTimestamp === 'undefined') {
  (g as any)._eventTimestamp = null;
}
if (typeof (g as any)._WORKLET === 'undefined') {
  (g as any)._WORKLET = false;
}
if (typeof (g as any)._getCurrentTime === 'undefined') {
  (g as any)._getCurrentTime = () => performance.now();
}

export {};
