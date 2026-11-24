// Writes public/og/trick-or-told-1200x630.jpg: the Told and True cards side by side under the title.
// Reads assets/shell/ (never writes there). Run once from apps/atlas: node scripts/make-share-image.mjs.
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shell = join(root, '../../assets/shell')
const outDir = join(root, 'public/og')
const out = join(outDir, 'trick-or-told-1200x630.jpg')

const W = 1200
const H = 630
const MAX_BYTES = 200 * 1024
const CARD_H = 470
const CARD_W = Math.round((CARD_H * 1000) / 1400)
const GAP = 64
const CARD_TOP = H - CARD_H - 36

const fontfile = join(root, 'node_modules/@fontsource/im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff')

const need = (name) => {
  const p = join(shell, name)
  if (!existsSync(p)) {
    console.error(`make-share-image: missing source layer: ${p}`)
    process.exit(1)
  }
  return p
}

async function card(kind) {
  const bg = await sharp(need(`shell-card-${kind}-bg-01.webp`))
    .resize(CARD_W, CARD_H, { fit: 'cover' })
    .toBuffer()
  const subject = await sharp(need(`shell-card-${kind}-subject-01.webp`))
    .resize(CARD_W, CARD_H, { fit: 'cover' })
    .toBuffer()
  const frame = await sharp(need('shell-card-frame-01.webp')).resize(CARD_W, CARD_H, { fit: 'cover' }).toBuffer()
  return sharp(bg)
    .composite([{ input: subject }, { input: frame }])
    .png()
    .toBuffer()
}

// sharp's Pango/fontconfig could not load the font file here (it fell back to a sans face), so the title is
// drawn by headless Chrome with the page font and composited as a transparent PNG.
async function title() {
  if (!existsSync(fontfile)) {
    console.error(`make-share-image: font file not found: ${fontfile}`)
    process.exit(1)
  }
  const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p))
  if (!chrome) {
    console.error('make-share-image: no Chrome found (set CHROME_BIN)')
    process.exit(1)
  }
  const dir = await mkdtemp(join(tmpdir(), 'share-title-'))
  try {
    const html = join(dir, 'title.html')
    const png = join(dir, 'title.png')
    await writeFile(
      html,
      `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:T;src:url("${pathToFileURL(fontfile).href}")}
html,body{margin:0;background:transparent}body{width:700px;height:110px;display:flex;align-items:center;justify-content:center}
h1{margin:0;font:400 76px/1 T,serif;color:#E9DFC9;letter-spacing:.02em;white-space:nowrap}</style><h1>Trick or Told</h1>`,
    )
    await execFileAsync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', '--window-size=700,110', '--virtual-time-budget=2000', `--screenshot=${png}`, pathToFileURL(html).href], { timeout: 30000 })
    return await sharp(png).trim().png().toBuffer()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const told = await card('told')
const trueCard = await card('true')
const titleImg = await title()
const tm = await sharp(titleImg).metadata()
const x0 = Math.round((W - (CARD_W * 2 + GAP)) / 2)
const titleTop = Math.max(8, Math.round((CARD_TOP - (tm.height ?? 0)) / 2))

const canvas = sharp({ create: { width: W, height: H, channels: 3, background: '#0E0B10' } }).composite([
  { input: told, left: x0, top: CARD_TOP },
  { input: trueCard, left: x0 + CARD_W + GAP, top: CARD_TOP },
  { input: titleImg, left: Math.round((W - (tm.width ?? 0)) / 2), top: titleTop },
])
const flat = await canvas.png().toBuffer()

let buf = null
let used = 0
for (let q = 82; q >= 40; q -= 6) {
  const b = await sharp(flat).jpeg({ quality: q, mozjpeg: true }).toBuffer()
  if (b.length < MAX_BYTES) {
    buf = b
    used = q
    break
  }
}
if (!buf) {
  console.error('make-share-image: could not get under 200 KB')
  process.exit(1)
}

await mkdir(outDir, { recursive: true })
const tmp = `${out}.tmp`
try {
  await writeFile(tmp, buf)
  await rename(tmp, out)
} catch (error) {
  await rm(tmp, { force: true })
  throw error
}
console.log(`make-share-image: wrote ${out} (${buf.length} bytes, quality ${used}, title via headless Chrome)`)
