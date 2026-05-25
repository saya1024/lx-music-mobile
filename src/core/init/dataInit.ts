// import { getPlayInfo } from '@/utils/data'
// import { log } from '@/utils/log'
import { init as musicSdkInit } from '@/utils/musicSdk'
import { getUserLists, setUserList } from '@/core/list'
import { setNavActiveId } from '../common'
import { getViewPrevState } from '@/utils/data'
import { bootLog } from '@/utils/bootLog'
import { getDislikeInfo, setDislikeInfo } from '@/core/dislikeList'
import { unlink } from '@/utils/fs'
import { TEMP_FILE_PATH } from '@/utils/tools'
import { scanLocalMusicDir, clearFileIndex } from '@/core/music/aiLocalMusicScanner'
import settingState from '@/store/setting/state'
// import { play, playList } from '../player/player'

// const initPrevPlayInfo = async(appSetting: LX.AppSetting) => {
//   const info = await getPlayInfo()
//   global.lx.restorePlayInfo = null
//   if (!info?.listId || info.index < 0) return
//   const list = await getListMusics(info.listId)
//   if (!list[info.index]) return
//   global.lx.restorePlayInfo = info
//   await playList(info.listId, info.index)

//   if (appSetting['player.startupAutoPlay']) setTimeout(play)
// }

export default async(appSetting: LX.AppSetting) => {
  // await Promise.all([
  //   initUserApi(), // 自定义API
  // ]).catch(err => log.error(err))
  void musicSdkInit() // 初始化音乐sdk
  bootLog('User list init...')
  setUserList(await getUserLists()) // 获取用户列表
  setDislikeInfo(await getDislikeInfo()) // 获取不喜欢列表
  bootLog('User list inited.')
  setNavActiveId((await getViewPrevState()).id)
  void unlink(TEMP_FILE_PATH)
  if (appSetting['common.localMusicPath']) {
    void scanLocalMusicDir(appSetting['common.localMusicPath'], appSetting['download.fileName'])
  }
  global.state_event.on('configUpdated', (keys: Array<keyof LX.AppSetting>) => {
    if (keys.includes('common.localMusicPath')) {
      if (settingState.setting['common.localMusicPath']) {
        void scanLocalMusicDir(settingState.setting['common.localMusicPath'], settingState.setting['download.fileName'])
      } else {
        clearFileIndex()
      }
    } else if (keys.includes('download.fileName')) {
      if (settingState.setting['common.localMusicPath']) {
        void scanLocalMusicDir(settingState.setting['common.localMusicPath'], settingState.setting['download.fileName'])
      }
    }
  })
  // await initPrevPlayInfo(appSetting).catch(err => log.error(err)) // 初始化上次的歌曲播放信息
}
