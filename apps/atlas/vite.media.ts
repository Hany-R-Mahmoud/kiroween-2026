import { copyFileSync, createReadStream, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
// Relative import on purpose: Vite bundles relative imports into the config, while the workspace package is plain .ts.
import { AssetIdError, assetUrl, MEDIA_PREFIX } from '../../skeleton/src/assets/assetUrl.ts';

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
    writeBundle(options) {
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
      }
    },
  };
}
