import { Storage } from '@/utils/storage'
import { ACCESS_TOKEN_KEY } from '@/constants'

const baseUrl = String(import.meta.env.VITE_INSFORGE_URL || 'http://127.0.0.1:7130').replace(/\/$/, '')
const anonKey = String(import.meta.env.VITE_INSFORGE_ANON_KEY || '')

export function toLoginEmail(username: string): string {
  const value = username.trim()
  return value.includes('@') ? value.toLowerCase() : `${value}@local.dev`
}

export async function insforgeRequest<T>(
  path: string,
  init: { method?: string, json?: unknown, skipAccessToken?: boolean } = {},
): Promise<T> {
  const token = init.skipAccessToken ? '' : Storage.get<string>(ACCESS_TOKEN_KEY) || ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token)
    headers.Authorization = `Bearer ${token}`
  else if (anonKey)
    headers.Authorization = `Bearer ${anonKey}`

  const response = await uni.request({
    url: `${baseUrl}${path}`,
    method: (init.method || 'GET') as UniApp.RequestOptions['method'],
    header: headers,
    data: init.json,
  })
  const payload = (response.data || {}) as Record<string, unknown>
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(String(payload.message || payload.error || `InsForge 请求失败 (${response.statusCode})`))
  }
  return payload as T
}

export { anonKey as insforgeAnonKey, baseUrl as insforgeBaseUrl }
