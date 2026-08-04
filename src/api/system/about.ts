import { post } from '@/utils/request'

export interface AboutInfo {
  versionName: string
  versionCode: number
}

export interface VersionCheckInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  publishedAt: string
  repository: string
}

export function get<T = AboutInfo>() {
  return post<T>({
    url: '/about',
  })
}

export function checkVersion() {
  return post<VersionCheckInfo>({
    url: '/about/checkVersion',
  })
}
