import { assetUrl, type AtlasImage, HERO_SMALL_MEDIA, heroSmall } from '@kiroween/skeleton/client';

/**
 * An asset image with its real width and height, so the page never jumps (R7.3). Only the page's first image
 * (`priority`) loads at once with high priority; everything else loads lazily (R7.4).
 * A hero (`hero`) with a build-made phone copy sits in a `picture` whose source is chosen by viewport width only (R13.3, R13.8).
 */
export function Img({ image, alt, priority = false, hero = false, className }: { image: AtlasImage; alt: string; priority?: boolean; hero?: boolean; className?: string }) {
  const small = hero ? heroSmall(image) : null;
  const img = (
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
  return small ? (
    <picture>
      <source media={HERO_SMALL_MEDIA} srcSet={assetUrl(small.id)} width={small.width} height={small.height} />
      {img}
    </picture>
  ) : (
    img
  );
}
