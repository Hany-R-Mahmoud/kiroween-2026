// Share tags (Open Graph and Twitter) shared by both apps. Pure and browser-safe: no server import.
// The image tags are written only when an absolute origin is known; a relative image URL is never produced.

export const SHARE_IMAGE_PATH = '/og/trick-or-told-1200x630.jpg';
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export interface ShareInput {
  origin: string;
  title: string;
  description: string;
  imageAlt: string;
  siteName: string;
}

export type MetaTag = { property: string; content: string } | { name: string; content: string };

export function shareTags(input: ShareInput): MetaTag[] {
  const { origin, title, description, imageAlt, siteName } = input;
  const tags: MetaTag[] = [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];
  if (origin !== '') {
    const image = `${origin}${SHARE_IMAGE_PATH}`;
    tags.push(
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: String(SHARE_IMAGE_SIZE.width) },
      { property: 'og:image:height', content: String(SHARE_IMAGE_SIZE.height) },
      { property: 'og:image:alt', content: imageAlt },
      { name: 'twitter:image', content: image },
    );
  }
  return tags;
}
