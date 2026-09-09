/**
 * Utility to convert image URLs (especially Cloudinary URLs) to mobile-optimized,
 * responsive, CDN-cached WebP/AVIF images.
 */
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:low';
  crop?: 'limit' | 'fill' | 'thumb' | 'scale';
}

export const getOptimizedImageUrl = (
  url?: string | null,
  options?: ImageOptimizationOptions
): string => {
  if (!url || typeof url !== 'string') return '';

  const cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // Local file / data / blob URIs shouldn't be transformed
  if (
    cleanUrl.startsWith('file://') ||
    cleanUrl.startsWith('content://') ||
    cleanUrl.startsWith('data:') ||
    cleanUrl.startsWith('blob:')
  ) {
    return cleanUrl;
  }

  // Cloudinary URL dynamic on-the-fly transformation
  if (cleanUrl.includes('res.cloudinary.com') && cleanUrl.includes('/upload/')) {
    // If it already has transformation flags, return as is
    if (cleanUrl.includes('/f_auto') || cleanUrl.includes('/q_auto')) {
      return cleanUrl;
    }

    const width = options?.width || 1000;
    const crop = options?.crop || 'limit';
    const quality = options?.quality || 'auto:good';
    const heightParam = options?.height ? `,h_${options.height}` : '';
    const transform = `f_auto,q_${quality},w_${width}${heightParam},c_${crop}`;

    return cleanUrl.replace('/upload/', `/upload/${transform}/`);
  }

  return cleanUrl;
};
