/** Builds the browser search URL for a medicine name (used by the copy-and-search button). */
export function drugSearchUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name.trim()} medicine`)}`;
}
