<script>
import { supabase } from '@/utils/supabase.js'

let globalDormitoryChannel = null

export default {
  onLaunch: async function () {
    console.log('App Launch')
    
    // 全局身份校验：防止跨角色访问
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        
      if (profile) {
        // 记录当前真实身份到缓存，供全局导航使用
        uni.setStorageSync('current_role', profile.role)
      }

      // 初始化全局实时监听
      this.initGlobalRealtime()
    }

    // 监听账号切换
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // 登录成功时，清除所有旧缓存，防止干扰
        const keys = uni.getStorageInfoSync().keys
        keys.forEach(key => {
          if (key.includes('user_info_') || key.includes('schedule_data_')) {
            uni.removeStorageSync(key)
          }
        })
        // 重新初始化监听
        this.initGlobalRealtime()
      } else if (event === 'SIGNED_OUT') {
        if (globalDormitoryChannel) {
          supabase.removeChannel(globalDormitoryChannel)
          globalDormitoryChannel = null
        }
      }
    })
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
  methods: {
    initGlobalRealtime: async function () {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('dormitory_id')
          .eq('id', user.id)
          .single()

        if (!profile?.dormitory_id) return

        // 如果已经有存在的频道，先移除
        if (globalDormitoryChannel) {
          supabase.removeChannel(globalDormitoryChannel)
        }

        globalDormitoryChannel = supabase
          .channel('global-dormitory-logs')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'dormitory_status_logs',
            filter: `dormitory_id=eq.${profile.dormitory_id}`
          }, (payload) => {
            const newLog = payload.new
            // 发送全局总线事件，让首页去更新文字，不再弹窗
            uni.$emit('dormitoryLogUpdated', newLog)
          })
          .subscribe((status) => {
            console.log('全局宿舍动态订阅状态:', status)
          })
      } catch (e) {
        console.error('初始化全局监听失败:', e)
      }
    }
  }
}
</script>

<style>
/*每个页面公共css */
</style>
