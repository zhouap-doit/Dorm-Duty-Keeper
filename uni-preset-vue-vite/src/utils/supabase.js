import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// 请将下面的 key 替换为 Supabase Dashboard 中的 "anon" key
// Settings -> API -> Project API keys -> anon (public)
// 格式应该是: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => {
        // #ifdef H5
        return window.sessionStorage.getItem(key)
        // #endif
        // #ifndef H5
        return uni.getStorageSync(key)
        // #endif
      },
      setItem: (key, value) => {
        // #ifdef H5
        window.sessionStorage.setItem(key, value)
        // #endif
        // #ifndef H5
        uni.setStorageSync(key, value)
        // #endif
      },
      removeItem: (key) => {
        // #ifdef H5
        window.sessionStorage.removeItem(key)
        // #endif
        // #ifndef H5
        uni.removeStorageSync(key)
        // #endif
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web'
    },
    fetch: (url, options = {}) => {
      // 增加超时设置为 30 秒
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      return fetch(url, {
        ...options,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))
    }
  }
})
