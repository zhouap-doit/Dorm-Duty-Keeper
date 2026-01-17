<template>
  <view class="home-container">
    <view class="bg-gradient"></view>

    <!-- 加载状态骨架屏 -->
    <view class="home-card" v-if="isLoading">
      <view class="skeleton-card">
        <view class="skeleton-line skeleton-title"></view>
        <view class="skeleton-line skeleton-text"></view>
      </view>
      <view class="skeleton-grid">
        <view class="skeleton-item" v-for="i in 2" :key="i"></view>
      </view>
      <view class="loading-text">加载中...</view>
    </view>

    <view class="home-card" v-else>
      <template v-if="active === 'home'">
      <!-- 顶部欢迎卡片 -->
      <view class="welcome-card">
        <view class="room-row">
          <text class="room-name">{{ roomName }}</text>
        </view>
        <text class="welcome-text">欢迎回来，{{ userName }}</text>
      </view>

      <!-- 快捷功能区 -->
      <view class="quick-section">
        <view class="quick-grid">
          <view v-if="dutyMode === 'P'" class="quick-item" @tap="handleUpload">
            <view class="quick-icon">📷</view>
            <text class="quick-title">记录值日</text>
            <text class="quick-sub">上传值日照片</text>
          </view>
          
          <view v-else class="quick-item disabled">
            <view class="quick-icon">🚫</view>
            <text class="quick-title">记录值日</text>
            <text class="quick-sub">J人模式下不可用</text>
          </view>

          <view class="quick-item empty">
            <!-- 空白模块 -->
          </view>

          <view class="quick-item empty">
            <!-- 空白模块 -->
          </view>

          <view class="quick-item empty">
            <!-- 空白模块 -->
          </view>
        </view>
      </view>

      <!-- 今日提醒 -->
      <view class="today-section">
        <text class="section-title">今日提醒</text>
        <view class="today-card">
          <!-- P人模式下显示最新通知 -->
          <template v-if="dutyMode === 'P'">
            <view class="today-row">
              <text class="today-item">{{ latestNotification || '今日暂无值日动态' }}</text>
            </view>
          </template>

          <!-- J人模式下显示原本的提醒 -->
          <template v-else>
            <view class="today-row" v-if="todayIsMine">
              <text class="today-item">今天是你值日，记得哦</text>
            </view>
            <view class="today-row" v-else>
              <text class="today-item">今日暂无您的值日安排</text>
            </view>
          </template>
        </view>
      </view>
      </template>

      <template v-else-if="active === 'duty'">
        <view class="today-section">
          <text class="section-title">成员值日表</text>
          <view class="today-card">
            <view class="today-row">
              <text class="today-item">值日表内容占位</text>
            </view>
          </view>
        </view>
      </template>
    </view>

    <!-- 底部菜单（页面内嵌） -->
    <view class="bottom-nav">
      <view class="nav-item" :class="{ active: active === 'home' }" @tap="goHome">
        <text class="nav-icon">🏠</text>
        <text class="nav-text">首页</text>
      </view>
      <view class="nav-item" :class="{ active: active === 'duty' }" @tap="goDutyTable">
        <text class="nav-icon">📋</text>
        <text class="nav-text">值日表</text>
      </view>
      <view class="nav-item" @tap="goMine">
        <text class="nav-icon">👤</text>
        <text class="nav-text">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase.js'

const roomName = ref('')
const userName = ref('')
const todayIsMine = ref(false)
const active = ref('home')
const uploading = ref(false)
const dutyMode = ref('J') // J人模式或P人模式
const latestNotification = ref('')
const isLoading = ref(true)
const pageUserId = ref('') // Session 守卫：记录页面打开时的用户ID

// 从本地缓存快速加载（基于用户ID）
const loadFromCache = (userId) => {
  if (!userId) return
  try {
    const cachedUserInfo = uni.getStorageSync(`user_info_${userId}`)
    if (cachedUserInfo) {
      userName.value = cachedUserInfo.userName || ''
      roomName.value = cachedUserInfo.roomName || ''
    }
    const cachedSchedule = uni.getStorageSync(`schedule_data_${userId}`)
    if (cachedSchedule) {
      dutyMode.value = cachedSchedule.mode || 'J'
    }
  } catch (e) {
    console.log('成员缓存读取失败')
  }
}

// 保存数据到本地缓存（基于用户ID）
const saveToCache = (userId, userInfo, scheduleData) => {
  if (!userId) return
  try {
    if (userInfo) {
      uni.setStorageSync(`user_info_${userId}`, userInfo)
    }
    if (scheduleData) {
      uni.setStorageSync(`schedule_data_${userId}`, scheduleData)
    }
  } catch (e) {
    console.log('成员缓存保存失败')
  }
}

onMounted(async () => {
  try {
    // 1. 获取当前登录用户
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    pageUserId.value = user.id // 锁定页面最初登录的用户ID

    // 2. 先从当前用户的专属缓存快速加载（避免显示他人数据）
    loadFromCache(user.id)
    
    if (userName.value && roomName.value) {
      isLoading.value = false
    }

    // 3. 从 Supabase 加载最新用户信息并验证权限
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, role, dormitory_id, dormitories(name, duty_mode)')
      .eq('id', user.id)
      .single()

    if (profile) {
      // 【权限核实】如果是管理员误入成员页，重定向
      if (profile.role === 'manager') {
        console.warn('检测到管理员身份，正在重定向到管理首页')
        uni.reLaunch({ url: '/pages/manager-home/manager-home' })
        return
      }

      userName.value = profile.username || '成员'
      roomName.value = (profile.dormitories?.name || '') + (profile.dormitories?.name ? '室' : '')
      dutyMode.value = profile.dormitories?.duty_mode || 'J'
      
      // 保存到当前用户的专属缓存
      saveToCache(user.id, { userName: userName.value, roomName: roomName.value }, { mode: dutyMode.value })

      // 【新增】加载最新动态通知
      if (profile.dormitory_id) {
        const { data: latestLog } = await supabase
          .from('dormitory_status_logs')
          .select('content')
          .eq('dormitory_id', profile.dormitory_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (latestLog) {
          latestNotification.value = latestLog.content
        }
      }
    }

    // 4. 加载值日表数据（为了计算今日提醒）
    if (profile?.dormitory_id) {
      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('schedule_data')
        .eq('dormitory_id', profile.dormitory_id)
        .single()

      if (scheduleData?.schedule_data) {
        const sd = scheduleData.schedule_data
        // 计算今日提醒
        const today = new Date()
        const iso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        let person = ''
        const schedule = sd.schedule_data || []
        const found = schedule.find(([d])=> d===iso)
        if (found) person = found[1]
        
        todayIsMine.value = (person && person === userName.value)
        if (todayIsMine.value) {
          uni.showToast({ title: '今天轮到你值日啦', icon: 'none' })
        }
      }
    }
  } catch (e) {
    console.error('加载成员数据失败:', e)
  } finally {
    isLoading.value = false
  }

  // 监听全局事件
  uni.$on('updateUserInfo', handleUserInfoUpdate)
  uni.$on('dutyCheckinUpdated', () => { 
    // #ifdef H5
    window.location.reload()
    // #endif
  })
  
  uni.$on('dormitoryNameUpdated', (data) => {
    roomName.value = data.newName + '室'
  })

  // 【新增】监听首页动态更新（由 App.vue 转发）
  uni.$on('dormitoryLogUpdated', (newLog) => {
    latestNotification.value = newLog.content
  })
})

const handleUserInfoUpdate = (userInfo) => {
  if (userInfo.userName) userName.value = userInfo.userName
  if (userInfo.roomName) roomName.value = userInfo.roomName
}

onUnmounted(() => {
  // 移除事件监听
  uni.$off('updateUserInfo', handleUserInfoUpdate)
  uni.$off('memberJoinedSuccessfully', handleMemberJoined)
  uni.$off('dutyCheckinUpdated', () => {})
  uni.$off('dormitoryNameUpdated')  // 【重要】移除宿舍名更新事件监听
  uni.$off('dutyScheduleStorageUpdated')  // 【重要】移除值班表更新事件监听
  uni.$off('dormitoryLogUpdated')   // 【重要】移除动态通知监听
})

const handleUpload = async () => {
  if (uploading.value) return
  uploading.value = true
  try {
    uni.navigateTo({ url: '/pages/member-p-mode-checkin/member-p-mode-checkin?from=member' })
  } finally {
    uploading.value = false
  }
}

// Session 守卫：校验身份一致性
const checkSession = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== pageUserId.value) {
    uni.showModal({
      title: '身份已过期',
      content: '检测到账号已在其他页面变更，请重新登录',
      showCancel: false,
      success: () => {
        uni.reLaunch({ url: '/pages/login/login' })
      }
    })
    return false
  }
  return true
}

const goHome = async () => { 
  if (!(await checkSession())) return
  active.value = 'home' 
}
const goDutyTable = async () => { 
  if (!(await checkSession())) return
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const target = profile?.role === 'manager' ? '/pages/manager-duty-table/manager-duty-table' : '/pages/member-duty-table/member-duty-table'
  uni.reLaunch({ url: target })
}
const goMine = async () => { 
  if (!(await checkSession())) return
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const target = profile?.role === 'manager' ? '/pages/manager-mine/manager-mine' : '/pages/member-mine/member-mine'
  uni.reLaunch({ url: target })
}

// 计算今日是否本人值日（J模式）
function updateTodayReminder() {
  try {
    const dutyData = uni.getStorageSync('duty_schedule_data')
    if (!dutyData || dutyData.mode !== 'J') { todayIsMine.value = false; return }
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    let person = ''
    if (Array.isArray(dutyData.schedule)) {
      const found = dutyData.schedule.find(([d])=> d===iso)
      if (found) person = found[1]
    }
    todayIsMine.value = person && person === userName.value
    if (todayIsMine.value) {
      // 小程序内提醒
      uni.showToast({ title: '今天轮到你值日啦', icon: 'none' })
    }
  } catch(e) { todayIsMine.value = false }
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  position: relative;
  padding-bottom: 140rpx; // 预留底部栏高度，避免被挡
  display: flex;
  justify-content: center;
}

.bg-gradient {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%);
  z-index: -1;
}

.home-card {
  padding: 40rpx;
  width: 100%;
  max-width: 750rpx; // 限制为移动端页面宽度
  margin: 0 auto; // 居中
  box-sizing: border-box;
}

.welcome-card {
  background: #f8f9fa;
  border-radius: 30rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.room-row { margin-bottom: 10rpx; }
.room-name { font-size: 40rpx; font-weight: 700; color: #333; }
.welcome-text { color: #666; font-size: 28rpx; }

.quick-section {
  background: #e9ecef;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.quick-item {
  background: #f8f9fa;
  border-radius: 20rpx;
  padding: 30rpx 20rpx;
  text-align: center;
}

.quick-item.empty {
  background: transparent;
  border: 2rpx dashed #e1e5e9;
}

.quick-item.disabled {
  background: #f5f5f5;
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-icon { font-size: 44rpx; margin-bottom: 10rpx; }
.quick-title { display: block; font-size: 30rpx; color: #333; font-weight: 600; }
.quick-sub { display: block; font-size: 24rpx; color: #888; }

.today-section { margin-top: 20rpx; }
.section-title { font-size: 36rpx; font-weight: 700; color: #333; margin-bottom: 16rpx; }

.today-card {
  background: #f8f9fa;
  border-radius: 20rpx;
  padding: 20rpx;
}

.today-row { padding: 16rpx 10rpx; }
.today-item { color: #333; font-size: 28rpx; }

.bottom-nav {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  width: 100%;
  height: 120rpx;
  background: #f2f2f2;
  border-top: 2rpx solid #e5e5e5;
  display: flex;
  align-items: center;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 10;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8rpx 0;
  color: #666;
}

.nav-item + .nav-item { border-left: 2rpx solid #e5e5e5; }
.nav-item.active { color: #333; }
.nav-icon { display: block; font-size: 44rpx; line-height: 1; }
.nav-text { display: block; font-size: 24rpx; margin-top: 6rpx; }

@media screen and (max-width: 750rpx) {
  .quick-grid { grid-template-columns: 1fr 1fr; }
}

/* 骨架屏样式 */
.skeleton-card {
  background: #f8f9fa;
  border-radius: 30rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.skeleton-line {
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 8rpx;
}

.skeleton-title {
  height: 40rpx;
  width: 40%;
  margin-bottom: 16rpx;
}

.skeleton-text {
  height: 28rpx;
  width: 60%;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.skeleton-item {
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  height: 180rpx;
  border-radius: 20rpx;
}

.loading-text {
  text-align: center;
  color: #888;
  font-size: 28rpx;
  padding: 20rpx;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>


