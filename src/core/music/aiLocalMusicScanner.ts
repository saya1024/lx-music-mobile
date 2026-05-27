import { readDir, extname } from '@/utils/fs'
import { getAllPossibleNames, getAudioExts } from '@/utils/aiFileName'
import { log } from '@/utils/log'

interface AudioFileEntry {
  name: string
  path: string
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
): Promise<AudioFileEntry[]> => {
  let entries
  try {
    entries = await readDir(dirPath)
  } catch {
    return []
  }

  const files: AudioFileEntry[] = []
  const subDirPromises: Array<Promise<AudioFileEntry[]>> = []

  for (const entry of entries) {
    if (!entry) continue
    if (entry.isDirectory) {
      const fullPath = entry.path || joinPath(dirPath, entry.name)
      subDirPromises.push(collectAudioFiles(fullPath, audioExts))
    } else if (entry.isFile) {
      if (!audioExts.includes('.' + extname(entry.name).toLowerCase())) continue
      files.push({ name: entry.name, path: entry.path || joinPath(dirPath, entry.name) })
    }
  }

  const nested = await Promise.all(subDirPromises)
  return [...files, ...nested.flat()]
}

export const scanLocalMusicDir = async(dirPath: string, _format: string): Promise<LocalFileIndex> => {
  const fileMap = new Map<string, string>()
  const audioExts = getAudioExts()

  if (!dirPath) {
    fileIndex = { fileMap, scannedAt: Date.now(), scannedPath: dirPath, totalFiles: 0 }
    return fileIndex
  }

  log.info(`[scan] start scanning: ${dirPath}`)
  const scanStart = Date.now()

  let allFiles: AudioFileEntry[] = []
  try {
    allFiles = await collectAudioFiles(dirPath, audioExts)
  } catch {}

  const totalFiles = allFiles.length
  log.info(`[scan] found ${totalFiles} audio files`)

  for (const file of allFiles) {
    log.info(`[scan] indexing: ${file.path}`)
    const ext = extname(file.name)
    const baseName = ext ? file.name.slice(0, -(ext.length + 1)) : file.name
    if (baseName) fileMap.set(baseName, file.path)
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
    const path = map.get(key)
    if (path) return path
  }
  return null
}

export const clearFileIndex = () => {
  fileIndex = null
}
