import { copyFileSync, createReadStream, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
// Relative import on purpose: Vite bundles relative imports into the config, while the workspace package is plain .ts.
import { AssetIdError, assetUrl, MEDIA_PREFIX } from '../../skeleton/src/assets/assetUrl.ts';
import { HERO_SMALL_WIDTH, hasHeroCopy, heroSmallId } from '../../skeleton/src/assets/heroCopy.ts';

const ID_FROM_FILE = /^([a-z0-9-]+)\.webp$/;

/**
 * The repo path served for `rawPath`, or null. Only the canonical URL of an asset id is served: the file name's id is
 * mapped through assetUrl and must give back exactly the requested path, so `..`, encoded characters, other
 * extensions and wrong folders never match. The raw (undecoded, unnormalised) path is checked on purpose.
 */
export function mediaFile(assetsDir: string, rawPath: string): string | null {
  const m = ID_FROM_FILE.exec(rawPath.slice(rawPath.lastIndexOf('/') + 1));
  if (!m) return null;
  let url: string;
  try {
    url = assetUrl(m[1]!);
  } catch (e) {
    if (e instanceof AssetIdError) return null;
    throw e;
  }
  return url === rawPath ? join(assetsDir, url.slice(MEDIA_PREFIX.length)) : null;
}

/** Build-time only: the 1000 px copy of a hero file as WebP bytes, or null when the file is not wider than that. */
async function heroCopyBytes(file: string): Promise<Buffer | null> {
  const { default: sharp } = await import('sharp');
  const { width } = await sharp(file).metadata();
  if (!width || !hasHeroCopy(ID_FROM_FILE.exec(file.slice(file.lastIndexOf('/') + 1))?.[1] ?? '', width)) return null;
  return sharp(file).resize({ width: HERO_SMALL_WIDTH }).webp({ quality: 80 }).toBuffer();
}

/** The hero file behind `/media/.../<id>-w1000.webp` (dev only), or null. */
export function heroCopySource(assetsDir: string, rawPath: string): string | null {
  const m = /^(.*)-w1000\.webp$/.exec(rawPath);
  return m ? mediaFile(assetsDir, `${m[1]}.webp`) : null;
}

const webpFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? webpFiles(join(dir, e.name)) : e.name.endsWith('.webp') ? [join(dir, e.name)] : []));

/** Serves /media/* from the repo's assets/ in dev, and copies the canonical files into the client build output. */
export function media(assetsDir: string): Plugin {
  return {
    name: 'kiroween:media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = (req.url ?? '').split('?')[0]!;
        if (!raw.startsWith(MEDIA_PREFIX)) return next();
        const heroFile = heroCopySource(assetsDir, raw);
        if (heroFile && statSync(heroFile, { throwIfNoEntry: false })?.isFile()) {
          heroCopyBytes(heroFile).then(
            (bytes) => {
              if (!bytes) res.statusCode = 404;
              else res.setHeader('content-type', 'image/webp');
              res.end(bytes ?? undefined);
            },
            () => {
              res.statusCode = 500;
              res.end();
            },
          );
          return;
        }
        const file = mediaFile(assetsDir, raw);
        if (!file || !statSync(file, { throwIfNoEntry: false })?.isFile()) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('content-type', 'image/webp');
        createReadStream(file).pipe(res);
      });
    },
    async writeBundle(options) {
      if (this.environment.name !== 'client' || !options.dir) return;
      for (const file of webpFiles(assetsDir)) {
        const rel = relative(assetsDir, file).split(sep).join('/');
        if (mediaFile(assetsDir, `${MEDIA_PREFIX}${rel}`) !== file) {
          this.warn(`not copied, not at its canonical path: assets/${rel}`);
          continue;
        }
        const out = join(options.dir, MEDIA_PREFIX, rel);
        mkdirSync(dirname(out), { recursive: true });
        copyFileSync(file, out);
        // Hero copies go to the build output only, never back into assets/ (Requirement 13.6).
        const id = ID_FROM_FILE.exec(rel.slice(rel.lastIndexOf('/') + 1))![1]!;
        const bytes = hasHeroCopy(id, Number.MAX_SAFE_INTEGER) ? await heroCopyBytes(file) : null;
        if (bytes) writeFileSync(join(options.dir, MEDIA_PREFIX, rel.replace(`${id}.webp`, `${heroSmallId(id)}.webp`)), bytes);
      }
    },
  };
}
