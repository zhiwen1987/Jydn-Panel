import { post } from '@/utils/request'

export function get<T>() {
  return post<T>({
    url: '/about',
  })
}

export function checkVersion<T>() {
  return post<T>({
    url: '/about/checkVersion',
  })
}