import { readDir, extname } from '@/utils/fs'
import { musicNameToFileName, getAllPossibleNames, getAudioExts } from '@/utils/aiFileName'
import { readMetadata } from '@/utils/localMediaMetadata'

export interface LocalFileIndex {
  fileMap: Map<string, string>
  scannedAt: number
  scannedPath: string
  totalFiles: number
}

let fileIndex: LocalFileIndex | null = null

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
        const key = await indexFile(fullPath, format)
        if (key && !fileMap.has(key)) {
          fileMap.set(key, fullPath)
        }
      } catch { /* skip unreadable files */ }
    }
  }
}

const indexFile = async(
  filePath: string,
  format: string,
): Promise<string | null> => {
  try {
    const metadata = await readMetadata(filePath)
    const name = metadata?.name?.trim()
    if (name) {
      return musicNameToFileName(name, metadata.singer ?? '', format)
    }
  } catch { /* skip metadata read errors */ }
  const parts = filePath.split('/')
  const fileName = parts[parts.length - 1] ?? filePath
  const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName
  return baseName.trim() || null
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
