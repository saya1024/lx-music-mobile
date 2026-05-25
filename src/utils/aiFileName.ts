import { formatMusicName } from '@/utils/tools'

const AUDIO_EXTS = ['.mp3', '.flac', '.wav', '.ape', '.ogg', '.m4a', '.wma']

const INVALID_CHAR_MAP: Record<string, string> = {
  '<': '＜',
  '>': '＞',
  ':': '：',
  '"': '″',
  '/': '／',
  '\\': '＼',
  '|': '｜',
  '?': '？',
  '*': '＊',
}

const invalidCharRxp = new RegExp(`[${Object.keys(INVALID_CHAR_MAP).join('')}]`, 'g')

export const getAudioExts = () => [...AUDIO_EXTS]

export const replaceInvalidFileNameChars = (name: string): string => {
  return name.replace(invalidCharRxp, match => INVALID_CHAR_MAP[match])
}

export const musicNameToFileName = (name: string, singer: string, format: string): string => {
  return replaceInvalidFileNameChars(formatMusicName(format, name, singer))
}

const FORMATS = [
  '歌名 - 歌手',
  '歌手 - 歌名',
  '歌名',
] as const

const trimTrailingSeparator = (name: string): string => {
  return name.replace(/\s*[-–—]\s*$/, '').trim()
}

export const getAllPossibleNames = (name: string, singer: string): string[] => {
  const names: string[] = []
  for (const format of FORMATS) {
    const candidate = musicNameToFileName(name, singer, format)
    const trimmed = trimTrailingSeparator(candidate)
    if (trimmed && !names.includes(trimmed)) names.push(trimmed)
    if (trimmed !== candidate && !names.includes(candidate)) names.push(candidate)
  }
  return names
}
