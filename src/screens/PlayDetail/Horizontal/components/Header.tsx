import { memo, useRef, useMemo, useState, useEffect } from 'react'

import { View, StyleSheet, TouchableOpacity } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { pop } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import { usePlayerMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import CommentBtn from './CommentBtn'
import Btn from './Btn'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'
import DesktopLyricBtn from './DesktopLyricBtn'
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
    const hasSong = (listId: string) => allMusicList.get(listId)?.some(s => s.id === id)
    const checkAndPush = (listId: string, name: string) => { if (hasSong(listId) && name) names.push(name) }
    checkAndPush(LIST_IDS.DEFAULT, global.i18n.t('list_name_default'))
    checkAndPush(LIST_IDS.LOVE, global.i18n.t('list_name_love'))
    for (const list of listState.allList) {
      if (list.id === LIST_IDS.DEFAULT || list.id === LIST_IDS.LOVE || list.id === LIST_IDS.TEMP) continue
      checkAndPush(list.id, list.name)
    }
    return names
  }, [musicInfo.id])

  return (
    <View style={styles.titleContent}>
      <Text numberOfLines={1} style={styles.title} size={14}>{musicInfo.name}</Text>
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

  const back = () => {
    void pop(commonState.componentIds.playDetail!)
  }
  const showSetting = () => {
    popupRef.current?.show()
  }

  return (
    <View style={{ height: HEADER_HEIGHT }} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}>
      <View style={styles.container}>
        <TouchableOpacity onPress={back} style={{ ...styles.button, width: HEADER_HEIGHT }}>
          <Icon name="chevron-left" size={18} />
        </TouchableOpacity>
        <Title />
        <DesktopLyricBtn />
        <CommentBtn />
        <Btn icon="slider" onPress={showSetting} />
      </View>
      <SettingPopup ref={popupRef} position="left" direction="horizontal" />
    </View>
  )
})


const styles = StyleSheet.create({
  container: {
    flex: 0,
    // backgroundColor: '#ccc',
    flexDirection: 'row',
    // justifyContent: 'center',
    height: '100%',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    flex: 0,
  },
  titleContent: {
    flex: 1,
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
