// Share-sheet launches arrive as savefit://dataUrl=... deep links.
// Send them to the home screen; ShareIntentHandler takes it from there.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes('dataUrl=')) return '/';
  return path;
}
