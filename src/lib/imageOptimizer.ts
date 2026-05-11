/**
 * Optimizes an image URL using wsrv.nl proxy.
 * Provides resizing, WebP conversion, and quality adjustment.
 */
export function optimizeImage(url: string, width: number = 800, quality: number = 75): string {
  if (!url) return '';
  
  // If the image is already from a blob or data URI, don't optimize
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  // For external images, wrap with wsrv.nl
  // Remove protocol for wsrv.nl compatibility if needed, but usually it handles full URLs
  const cleanUrl = url.replace(/^https?:\/\//, '');
  return `https://wsrv.nl/?url=${cleanUrl}&w=${width}&output=webp&q=${quality}`;
}
