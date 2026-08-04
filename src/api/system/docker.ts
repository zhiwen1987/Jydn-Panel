import { post } from '@/utils/request'

export interface DockerInfo {
  available: boolean
  version?: string
  apiVersion?: string
  storageDriver?: string
  loggingDriver?: string
  containers?: number
  containersRunning?: number
  containersStopped?: number
  images?: number
  volumes?: number
  networks?: number
  host?: Record<string, number | string>
  message?: string
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: string
}

export function dockerPost<T>(path: string, data: Record<string, unknown> = {}) {
  return post<T>({ url: `/system/docker/${path}`, data })
}

export function getDockerInfo<T = DockerInfo>() {
  return dockerPost<T>('overview')
}

export function getDockerContainers<T = Common.ListResponse<DockerContainer[]>>() {
  return dockerPost<T>('containers')
}

export function runDockerAction<T>(id: string, action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill' | 'remove') {
  return dockerPost<T>('action', { id, action })
}

export function getDockerLogs<T = { logs: string }>(id: string, tail = 200) {
  return dockerPost<T>('logs', { id, tail })
}

export function getDockerImages<T = Common.ListResponse<Record<string, string>[]>>() {
  return dockerPost<T>('images')
}

export function getDockerVolumes<T = Common.ListResponse<Record<string, string>[]>>() {
  return dockerPost<T>('volumes')
}

export function getDockerNetworks<T = Common.ListResponse<Record<string, string>[]>>() {
  return dockerPost<T>('networks')
}
