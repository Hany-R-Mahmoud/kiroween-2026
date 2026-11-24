// Writes public/icons/favicon-32.png and public/favicon.ico from public/icons/icon-512.png.
// The ICO holds 16, 32 and 48 px PNG images behind a hand-written ICONDIR and ICONDIRENTRY header.
// Run once from apps/atlas: node scripts/make-icons.mjs. The outputs are committed.
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'public/icons/icon-512.png')
const SIZES = [16, 32, 48]

if (!existsSync(source)) {
  console.error(`make-icons: source image not found: ${source}`)
  process.exit(1)
}

const png = async (size) =>
  sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()

const images = []
for (const size of SIZES) images.push(await png(size))

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(images.length, 4)

let offset = 6 + 16 * images.length
const entries = images.map((data, i) => {
  const entry = Buffer.alloc(16)
  const size = SIZES[i]
  entry.writeUInt8(size, 0) // width
  entry.writeUInt8(size, 1) // height
  entry.writeUInt8(0, 2) // palette colours
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // colour planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(data.length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += data.length
  return entry
})

await writeFile(join(root, 'public/favicon.ico'), Buffer.concat([header, ...entries, ...images]))
await writeFile(join(root, 'public/icons/favicon-32.png'), images[1])
console.log('make-icons: wrote public/favicon.ico (16, 32, 48) and public/icons/favicon-32.png')
