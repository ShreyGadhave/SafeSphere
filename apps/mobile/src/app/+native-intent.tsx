/**
 * Android share-menu intents arrive as deep links handled by expo-share-intent; send them to the
 * home route instead of a "page not found" — the root layout then opens Safe Ride with the text.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.includes('dataUrl=')) return '/';
    return path;
  } catch {
    return '/';
  }
}
