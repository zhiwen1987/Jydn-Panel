import { post } from '@/utils/request'

export function getList<T>(fileType?: 'icon' | 'wallpaper') {
  return post<T>({
    url: '/file/getList',
    data: fileType ? { fileType } : {},
  })
}

export function deletes<T>(ids: number[]) {
  return post<T>({
    url: '/file/deletes',
    data: { ids },
  })
}
