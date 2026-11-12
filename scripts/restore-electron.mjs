#!/usr/bin/env node
/**
 * 把 vendor/electron/ 的分割檔合併回 node_modules/electron/dist/electron.exe
 *
 * 為什麼要分割：electron.exe 有 250 MB，超過 GitHub 單檔 100 MB 的上限，
 * 因此以 split 切成三份（各約 80 MB）進版控。clone 後執行一次即可：
 *
 *   node scripts/restore-electron.mjs     （setup-offline.bat 會幫你跑）
 *
 * 合併後會比對 SHA-256，確保跟官方 Electron 45.3.1 win32-x64 的執行檔一模一樣。
 */
import { createHash } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'

const PARTS_DIR = 'vendor/electron'
const TARGET = 'node_modules/electron/dist/electron.exe'
const EXPECTED_SHA256 = '8e259d3bd53d7e16f491987e8bad461b84734807816856c99a2640d3577812e2'

async function sha256(file) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(file), hash)
  return hash.digest('hex')
}

async function main() {
  if (existsSync(TARGET) && (await sha256(TARGET)) === EXPECTED_SHA256) {
    console.log(`${TARGET} 已存在且正確，略過。`)
    return
  }

  const parts = readdirSync(PARTS_DIR)
    .filter((f) => /^electron\.exe\.part\d+$/.test(f))
    .sort()
  if (parts.length === 0) {
    throw new Error(`在 ${PARTS_DIR} 找不到分割檔（electron.exe.part00 …）`)
  }

  // 先寫到暫存檔，驗證通過才改名，避免留下一個壞掉的 electron.exe
  const tmp = `${TARGET}.tmp`
  const out = createWriteStream(tmp)
  for (const part of parts) {
    await pipeline(createReadStream(join(PARTS_DIR, part)), out, { end: false })
  }
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())))

  const actual = await sha256(tmp)
  if (actual !== EXPECTED_SHA256) {
    rmSync(tmp, { force: true })
    throw new Error(`合併後的 SHA-256 不符：\n  預期 ${EXPECTED_SHA256}\n  實際 ${actual}`)
  }
  renameSync(tmp, TARGET)
  console.log(`已還原 ${TARGET}（${parts.length} 個分割檔，SHA-256 驗證通過）`)
}

main().catch((err) => {
  console.error(`[錯誤] ${err.message}`)
  process.exit(1)
})
