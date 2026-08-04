import CryptoJS from 'crypto-js'
import moment from 'moment'

const VERSION = 2
const ALLOW_LOW_VERSION = 1
const APPNAME = 'Jydn-Panel-Config'
const LEGACY_APP_NAMES = ['Sun-Panel-Config', 'SunPanel-Config']

export class FormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FormatError'
  }
}

export class ConfigVersionLowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigVersionLowError'
  }
}

export type EmbeddedAssetType = 'icon' | 'wallpaper'

export interface EmbeddedAsset {
  sourceUrl: string
  fileName: string
  fileType: EmbeddedAssetType
  mimeType: string
  dataUrl: string
}

export interface JsonStructure {
  version: number
  appName: string
  exportTime: string
  appVersion: string
  icons?: IconGroup[]
  assets?: EmbeddedAsset[]
  panelConfig?: Panel.panelConfig
  md5: string
}

export interface Icon {
  title: string
  sort: number
  icon: Panel.ItemIcon | null
  url: string
  lanUrl: string
  description: string
  openMethod: number
  pinned?: boolean
}

export interface IconGroup {
  title: string
  sort: number
  groupType?: 'website' | 'webpage'
  children: Icon[]
}

interface ExportJsonResult {
  addIconsData(datas: IconGroup[]): ExportJsonResult
  addAssetsData(datas: EmbeddedAsset[]): ExportJsonResult
  addPanelConfig(config: Panel.panelConfig): ExportJsonResult
  exportFile(): void
  string(): string
}

export function exportJson(appVersion?: string): ExportJsonResult {
  const jsonData: JsonStructure = {
    version: VERSION,
    appName: APPNAME,
    exportTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    appVersion: appVersion || '',
    md5: '',
  }

  function generateMD5AndUpdate() {
    jsonData.md5 = generateMD5(JSON.stringify(jsonData))
  }

  return {
    addIconsData(datas: IconGroup[]) {
      jsonData.icons = datas
      return this
    },

    addAssetsData(datas: EmbeddedAsset[]) {
      jsonData.assets = datas
      return this
    },

    addPanelConfig(config: Panel.panelConfig) {
      jsonData.panelConfig = config
      return this
    },

    exportFile() {
      generateMD5AndUpdate()
      const jsonString = JSON.stringify(jsonData)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `JydnPanel-Data${moment().format('YYYYMMDDHHmm')}.jydn-panel.json`
      link.click()
      URL.revokeObjectURL(link.href)
    },

    string() {
      generateMD5AndUpdate()
      return JSON.stringify(jsonData)
    },
  }
}

export interface ImportJsonResult {
  isPassCheckMd5: () => boolean
  isPassCheckConfigVersionOld: () => boolean
  isPassCheckConfigVersionNew: () => boolean
  isPassCheckConfigVersionBest: () => boolean
  jsonStruct: JsonStructure
  hasProperty: (key: string) => boolean
  geticons: () => IconGroup[]
  getassets: () => EmbeddedAsset[]
  getPanelConfig: () => Panel.panelConfig | undefined
}

export function importJsonString(jsonString: string): ImportJsonResult | null {
  let data: any
  try {
    data = JSON.parse(jsonString)
  }
  catch {
    throw new FormatError('file format error')
  }

  const jsonStruct = transformJson(data)
  const md5 = generateMD5(jsonString)

  if (!jsonStruct)
    throw new FormatError('file format error')

  if (data.version < ALLOW_LOW_VERSION)
    throw new ConfigVersionLowError('')

  return {
    isPassCheckMd5: () => md5 === jsonStruct.md5,
    isPassCheckConfigVersionOld: () => !(jsonStruct.version < VERSION),
    isPassCheckConfigVersionNew: () => !(jsonStruct.version > VERSION),
    isPassCheckConfigVersionBest: () => jsonStruct.version === VERSION,
    jsonStruct,
    hasProperty: (key: string): boolean => key in jsonStruct,
    geticons: (): IconGroup[] => jsonStruct.icons || [],
    getassets: (): EmbeddedAsset[] => jsonStruct.assets || [],
    getPanelConfig: () => jsonStruct.panelConfig,
  }
}

function transformJson(jsonData: any): JsonStructure | null {
  if (!jsonData || typeof jsonData !== 'object')
    return null

  const requiredKeys: Array<keyof JsonStructure> = ['version', 'appName', 'exportTime', 'appVersion', 'md5']
  if (jsonData.appName !== APPNAME && !LEGACY_APP_NAMES.includes(jsonData.appName))
    return null
  for (const key of requiredKeys) {
    if (!(key in jsonData))
      return null
  }

  return jsonData as JsonStructure
}

function generateMD5(jsonString: string): string {
  try {
    const data: any = JSON.parse(jsonString)
    delete data.md5
    return CryptoJS.MD5(JSON.stringify(data)).toString()
  }
  catch {
    return ''
  }
}
