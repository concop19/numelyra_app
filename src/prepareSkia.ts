/**
 * Native platforms initialize Skia through the native module, so no async
 * bootstrap work is required before importing the app.
 */
export async function prepareSkia(): Promise<void> {}
