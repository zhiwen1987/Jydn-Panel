import { post } from '@/utils/request'

export interface DockerInfo {
  available: boolean
  version?: string
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

export function getDockerInfo<T = DockerInfo>() {
  return post<T>({
    url: '/system/docker/info',
  })
}

export function getDockerContainers<T = Common.ListResponse<DockerContainer[]>>() {
  return post<T>({
    url: '/system/docker/containers',
  })
}

export function runDockerAction<T>(id: string, action: 'start' | 'stop' | 'restart') {
  return post<T>({
    url: '/system/docker/action',
    data: { id, action },
  })
}

export function getDockerLogs<T = { logs: string }>(id: string, tail = 200) {
  return post<T>({
    url: '/system/docker/logs',
    data: { id, tail },
  })
}
