import { assetUrl, type AtlasImage } from '@kiroween/skeleton/client';

/**
 * An asset image with its real width and height, so the page never jumps (R7.3). Only the page's first image
 * (`priority`) loads at once with high priority; everything else loads lazily (R7.4).
 */
export function Img({ image, alt, priority = false, className }: { image: AtlasImage; alt: string; priority?: boolean; className?: string }) {
  return (
    <img
      src={assetUrl(image.id)}
      width={image.width}
      height={image.height}
      alt={alt}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
      className={className}
    />
  );
}
