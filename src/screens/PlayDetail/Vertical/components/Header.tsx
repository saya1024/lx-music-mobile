import { memo, useRef, useMemo, useState, useEffect } from 'react'

import { View, StyleSheet } from 'react-native'

import { pop } from '@/navigation'
import StatusBar from '@/components/common/StatusBar'
import { useTheme } from '@/store/theme/hook'
import { usePlayerMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'
import { useStatusbarHeight } from '@/store/common/hook'
import Btn from './Btn'
import TimeoutExitBtn from './TimeoutExitBtn'
import { allMusicList } from '@/utils/listManage'
import { LIST_IDS } from '@/config/constant'
import listState from '@/store/list/state'

export const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)


const Title = () => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1)
    global.app_event.on('myListMusicUpdate', handler)
    return () => global.app_event.off('myListMusicUpdate', handler)
  }, [])

  const containingListNames = useMemo(() => {
    const id = musicInfo.id
    if (!id) return []
    const names: string[] = []
    for (const [listId, songs] of allMusicList) {
      if (listId === LIST_IDS.TEMP) continue
      if (songs.some(s => s.id === id)) {
        let name: string | undefined
        if (listId === LIST_IDS.LOVE) name = global.i18n.t('list_name_love')
        else if (listId === LIST_IDS.DEFAULT) name = global.i18n.t('list_name_default')
        else name = listState.allList.find(l => l.id === listId)?.name
        if (name) names.push(name)
      }
    }
    return names
  }, [musicInfo.id])

  return (
    <View style={styles.titleContent}>
      <Text numberOfLines={1} style={styles.title}>{musicInfo.name}</Text>
      <Text numberOfLines={1} style={styles.title} size={12} color={theme['c-font-label']}>{musicInfo.singer}</Text>
      {containingListNames.length > 0 && (
        <Text numberOfLines={1} size={10} color={theme['c-400']} style={{ marginTop: 2 }}>
          {global.i18n.t('player__in_lists')}{containingListNames.join('、')}
        </Text>
      )}
    </View>
  )
}

export default memo(() => {
  const popupRef = useRef<SettingPopupType>(null)
  const statusBarHeight = useStatusbarHeight()

  const back = () => {
    void pop(commonState.componentIds.playDetail!)
  }
  const showSetting = () => {
    popupRef.current?.show()
  }

  return (
    <View style={{ height: HEADER_HEIGHT + statusBarHeight, paddingTop: statusBarHeight }} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}>
      <StatusBar />
      <View style={styles.container}>
        <Btn icon="chevron-left" onPress={back} />
        <Title />
        <TimeoutExitBtn />
        <Btn icon="slider" onPress={showSetting} />
      </View>
      <SettingPopup ref={popupRef} direction="vertical" />
    </View>
  )
})


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // justifyContent: 'center',
    height: '100%',
  },
  titleContent: {
    flex: 1,
    paddingHorizontal: 5,
    // alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    // flex: 1,
    // textAlign: 'center',
  },
  icon: {
    paddingLeft: 4,
    paddingRight: 4,
  },
})
