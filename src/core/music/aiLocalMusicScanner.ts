import { readDir, extname } from '@/utils/fs'
import { musicNameToFileName, getAllPossibleNames, getAudioExts, replaceInvalidFileNameChars } from '@/utils/aiFileName'
import { readMetadata } from '@/utils/localMediaMetadata'

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

const scanDir = async(
  dirPath: string,
  fileMap: Map<string, string>,
  audioExts: string[],
  format: string,
  onFileFound: () => void,
): Promise<void> => {
  let entries
  try {
    entries = await readDir(dirPath)
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry) continue
    if (entry.isDirectory) {
      const fullPath = entry.path || joinPath(dirPath, entry.name)
      await scanDir(fullPath, fileMap, audioExts, format, onFileFound)
    } else if (entry.isFile) {
      const ext = '.' + extname(entry.name).toLowerCase()
      if (!audioExts.includes(ext)) continue
      onFileFound()
      const fullPath = entry.path || joinPath(dirPath, entry.name)
      try {
        await indexFile(fullPath, fileMap, format)
      } catch { /* skip unreadable files */ }
    }
  }
}

const addKey = (fileMap: Map<string, string>, key: string, filePath: string) => {
  if (key && !fileMap.has(key)) fileMap.set(key, filePath)
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

  try {
    const metadata = await readMetadata(filePath)
    const name = metadata?.name?.trim()
    if (name) {
      addKey(fileMap, musicNameToFileName(name, metadata?.singer ?? '', format), filePath)
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

  let totalFiles = 0
  try {
    await scanDir(dirPath, fileMap, audioExts, format, () => { totalFiles++ })
  } catch {}

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
  for (const key of possibleKeys) {
    const path = fileIndex.fileMap.get(key)
    if (path) return path
  }
  return null
}

export const clearFileIndex = () => {
  fileIndex = null
}
