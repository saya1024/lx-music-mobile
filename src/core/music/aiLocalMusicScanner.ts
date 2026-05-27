import { readDir, extname } from '@/utils/fs'
import { musicNameToFileName, getAllPossibleNames, getAudioExts, replaceInvalidFileNameChars } from '@/utils/aiFileName'
import { readMetadata } from '@/utils/localMediaMetadata'
import { log } from '@/utils/log'

const SCAN_CONCURRENCY = 20

const DASH_RXP = /[–—～~]/g
const SPACE_RXP = /\s+/g

const normalizeKey = (key: string): string => {
  return key.replace(DASH_RXP, '-').replace(SPACE_RXP, ' ').trim()
}

export interface LocalFileIndex {
  fileMap: Map<string, string>
  scannedAt: number
  scannedPath: string
  totalFiles: number
}

let fileIndex: LocalFileIndex | null = null

type ScanListener = () => void
let scanListeners: ScanListener[] = []

export const onScanComplete = (fn: ScanListener): (() => void) => {
  scanListeners.push(fn)
  return () => {
    scanListeners = scanListeners.filter(l => l !== fn)
  }
}

const notifyScanComplete = () => {
  const list = scanListeners.slice()
  list.forEach(fn => { fn() })
}

export const getFileIndex = (): Readonly<LocalFileIndex | null> => fileIndex

const joinPath = (parent: string, child: string): string => {
  if (parent.endsWith('/')) return parent + child
  return parent + '/' + child
}

const collectAudioFiles = async(
  dirPath: string,
  audioExts: string[],
): Promise<string[]> => {
  let entries
  try {
    entries = await readDir(dirPath)
  } catch {
    return []
  }

  const files: string[] = []
  const subDirPromises: Array<Promise<string[]>> = []

  for (const entry of entries) {
    if (!entry) continue
    if (entry.isDirectory) {
      const fullPath = entry.path || joinPath(dirPath, entry.name)
      subDirPromises.push(collectAudioFiles(fullPath, audioExts))
    } else if (entry.isFile) {
      const ext = '.' + extname(entry.name).toLowerCase()
      if (!audioExts.includes(ext)) continue
      files.push(entry.path || joinPath(dirPath, entry.name))
    }
  }

  const nested = await Promise.all(subDirPromises)
  return [...files, ...nested.flat()]
}

const addKey = (fileMap: Map<string, string>, key: string, filePath: string) => {
  if (!key) return
  const normalized = normalizeKey(key)
  if (!fileMap.has(normalized)) fileMap.set(normalized, filePath)
  const lowered = normalized.toLowerCase()
  if (lowered !== normalized && !fileMap.has(lowered)) fileMap.set(lowered, filePath)
}

const indexFile = async(
  filePath: string,
  fileMap: Map<string, string>,
  format: string,
): Promise<void> => {
  const parts = filePath.split('/')
  const fileName = parts[parts.length - 1] ?? filePath
  const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName
  const trimmedFileName = baseName.trim()

  log.info(`[scan] indexing: ${filePath}`)

  try {
    const metadata = await readMetadata(filePath)
    const name = metadata?.name?.trim()
    const singer = metadata?.singer?.trim()
    if (name) {
      addKey(fileMap, musicNameToFileName(name, singer ?? '', format), filePath)
      addKey(fileMap, replaceInvalidFileNameChars(name), filePath)
    }
  } catch { /* skip metadata read errors */ }

  if (trimmedFileName) addKey(fileMap, trimmedFileName, filePath)
}

export const scanLocalMusicDir = async(dirPath: string, format: string): Promise<LocalFileIndex> => {
  const fileMap = new Map<string, string>()
  const audioExts = getAudioExts()

  if (!dirPath) {
    fileIndex = { fileMap, scannedAt: Date.now(), scannedPath: dirPath, totalFiles: 0 }
    return fileIndex
  }

  log.info(`[scan] start scanning: ${dirPath}, format: ${format}`)
  const scanStart = Date.now()

  let allFiles: string[] = []
  try {
    allFiles = await collectAudioFiles(dirPath, audioExts)
  } catch {}

  const totalFiles = allFiles.length
  log.info(`[scan] found ${totalFiles} audio files, start indexing...`)

  for (let i = 0; i < allFiles.length; i += SCAN_CONCURRENCY) {
    const batch = allFiles.slice(i, i + SCAN_CONCURRENCY)
    await Promise.all(batch.map(async f => { try { await indexFile(f, fileMap, format) } catch {} }))
  }

  const elapsed = Date.now() - scanStart
  log.info(`[scan] scan complete: ${totalFiles} files indexed in ${elapsed}ms`)

  fileIndex = { fileMap, scannedAt: Date.now(), scannedPath: dirPath, totalFiles }
  notifyScanComplete()
  return fileIndex
}

export const findMatchInIndex = (
  name: string,
  singer: string,
): string | null => {
  if (!fileIndex) return null
  const possibleKeys = getAllPossibleNames(name, singer)
  const map = fileIndex.fileMap

  for (const key of possibleKeys) {
    const normalized = normalizeKey(key)
    const lowered = normalized.toLowerCase()
    if (map.has(normalized)) return map.get(normalized)!
    if (lowered !== normalized && map.has(lowered)) return map.get(lowered)!
  }

  return null
}

export const clearFileIndex = () => {
  fileIndex = null
}
