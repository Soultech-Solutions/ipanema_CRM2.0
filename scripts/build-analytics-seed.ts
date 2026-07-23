/**
 * Gera public/data/analytics-seed.json a partir da planilha LOG FALA.
 * Uso: npx tsx scripts/build-analytics-seed.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeCtes } from '../src/services/cteAnalytics'
import { parseCteWorkbook } from '../src/services/cteParser'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const xlsxPath = path.join(root, 'public/data/base-fat-raca.xlsx')
const outPath = path.join(root, 'public/data/analytics-seed.json')

function main () {
  if (!fs.existsSync(xlsxPath)) {
    console.error('Planilha não encontrada:', xlsxPath)
    process.exit(1)
  }

  console.log('Lendo', xlsxPath)
  const fileBuf = fs.readFileSync(xlsxPath)
  const ab = fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength)

  const ctes = parseCteWorkbook(ab)
  console.log('CT-es:', ctes.length)

  const result = analyzeCtes(ctes, 'base-fat-raca.xlsx (seed)')
  const payload = {
    version: 2,
    stats: result.stats,
    clients: result.clients,
    dashboard: result.dashboard,
    clientDetails: result.clientDetails,
  }

  fs.writeFileSync(outPath, JSON.stringify(payload))
  const mb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2)
  console.log('Gerado', outPath, `(${mb} MB)`)
}

main()
