import { ss } from '@/utils/storage'
import { PanelPanelConfigStyleEnum, PanelStateNetworkModeEnum } from '@/enums'
import defaultBackground from '@/assets/defaultBackground.webp'
const LOCAL_NAME = 'panelStorage'
export const DEFAULT_LOGO_TEXT = 'Jydn'

// Default footer is empty (no branding) unless user sets it.
const defaultFooterHtml = ''

export function defaultStatePanelConfig(): Panel.panelConfig {
  return {
    backgroundImageSrc: defaultBackground,
    backgroundBlur: 0,
    backgroundMaskNumber: 0,
    iconStyle: PanelPanelConfigStyleEnum.icon,
    iconTextColor: '#ffffff',
    iconTextInfoHideDescription: false,
    iconTextIconHideTitle: false,
    logoText: DEFAULT_LOGO_TEXT,
    logoImageSrc: '',
    faviconImageSrc: '',
    poweredByText: 'Jydn-Panel',
    poweredByUrl: 'https://github.com/zhiwen1987/Jydn-Panel',
    poweredByHtml: 'Powered By <a class="login-powered-link" href="https://github.com/zhiwen1987/Jydn-Panel" target="_blank" rel="noopener noreferrer">Jydn-Panel</a>',
    topHeaderShow: false,
    clockShowSecond: false,
    searchBoxShow: false,
    searchBoxSearchIcon: false,
    marginBottom: 10,
    marginTop: 10,
    maxWidth: 1200,
    maxWidthUnit: 'px',
    marginX: 5,
    paddingTop: 0,
    paddingBottom: 0,
    footerHtml: defaultFooterHtml,
    netModeChangeButtonShow: true,
    floatingToolsPosition: 'right-top',
    leftCatalogShow: true,
    leftCatalogLabelFixed: false,
    leftCatalogSize: 14,
    rightScrollBarShow: true,

    // Spacing (px)
    searchToBelowGapPx: 30, // 搜索框到下面（网站/网页切换条）的距离
    tabsToFirstGroupGapPx: 40, // 网站/网页切换条到第一个分组的距离
    groupToGroupGapPx: 40, // 分组与分组之间距离
    webpageListGapPx: 10, // 网页列表条目间距

  }
}

export function normalizePanelConfig(config?: Panel.panelConfig): Panel.panelConfig {
  const panelConfig = { ...defaultStatePanelConfig(), ...config }
  const legacyLogoText = ['AnGe', 'Panel'].join('-')
  if (!panelConfig.logoText || panelConfig.logoText === legacyLogoText)
    panelConfig.logoText = DEFAULT_LOGO_TEXT
  return panelConfig
}

export function defaultState(): Panel.State {
  return {
    rightSiderCollapsed: false,
    leftSiderCollapsed: false,
    networkMode: PanelStateNetworkModeEnum.wan,
    panelConfig: { ...defaultStatePanelConfig() },
  }
}

export function getLocalState(): Panel.State {
  const localState = ss.get(LOCAL_NAME)
  return { ...defaultState(), ...localState }
}

export function setLocalState(state: Panel.State) {
  ss.set(LOCAL_NAME, state)
}

export function removeLocalState() {
  ss.remove(LOCAL_NAME)
}
