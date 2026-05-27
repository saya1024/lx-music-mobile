import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle, requestFullStoragePermission, checkFullStoragePermission } from '@/utils/tools'
import { memo, useEffect, useState } from 'react'
import { View, TouchableOpacity, TextInput } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { getExternalStoragePaths } from '@/utils/fs'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const localMusicPath = useSettingValue('common.localMusicPath')
  const setLocalMusicPath = (path: string) => {
    updateSetting({ 'common.localMusicPath': path })
  }
  const [storageDirs, setStorageDirs] = useState<string[]>([])

  useEffect(() => {
    void getExternalStoragePaths().then(paths => {
      setStorageDirs(paths.filter(Boolean))
    })
  }, [])

  const handleSelectFolder = async() => {
    const granted = await checkFullStoragePermission()
    if (!granted) {
      const result = await requestFullStoragePermission()
      if (!result) return
    }
    if (!localMusicPath && storageDirs.length > 0) {
      const defaultMusicPath = storageDirs[0] + '/Music'
      setLocalMusicPath(defaultMusicPath)
    }
  }

  const handleClear = () => {
    setLocalMusicPath('')
  }

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text size={13}>{t('setting_basic_local_music_path')}</Text>
      </View>
      <View style={styles.row}>
        <TextInput
          style={{ ...styles.input, color: theme['c-font'] }}
          value={localMusicPath}
          placeholder={t('setting_basic_local_music_path_empty')}
          placeholderTextColor={theme['c-400']}
          onChangeText={setLocalMusicPath}
          multiline
        />
        <TouchableOpacity style={{ ...styles.btn, backgroundColor: theme['c-primary-alpha-100'] }} onPress={handleSelectFolder}>
          <Text size={12} color={theme['c-primary-font']}>{t('setting_basic_local_music_path_change_btn')}</Text>
        </TouchableOpacity>
        {localMusicPath ? (
          <TouchableOpacity style={{ ...styles.btn, backgroundColor: theme['c-300'] }} onPress={handleClear}>
            <Text size={12} color={theme['c-font']}>{t('setting_basic_local_music_path_clear_btn')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 10,
    marginBottom: 5,
  },
  header: {
    marginBottom: 3,
    paddingLeft: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    flexBasis: '100%',
    fontSize: 11,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 3,
    paddingBottom: 3,
    marginBottom: 5,
    borderWidth: 1,
    borderRadius: 4,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  btn: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 4,
    marginRight: 5,
    marginBottom: 5,
  },
})
