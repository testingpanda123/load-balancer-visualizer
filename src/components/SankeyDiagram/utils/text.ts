/**
 * Truncates text to fit within a given width, adding ellipsis if needed.
 */
export function getTruncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + '…';
}
