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
        <view class="skeleton-item" v-for="i in 3" :key="i"></view>
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
          <view class="quick-item" @tap="goDutyManage">
            <view class="quick-icon">🧹</view>
            <text class="quick-title">值日管理</text>
            <text class="quick-sub">设置/管理值班</text>
          </view>

          <view class="quick-item" @tap="uploadDutyPhoto" :class="{ 'disabled': isJMode }">
            <view class="quick-icon">📷</view>
            <text class="quick-title">记录值日</text>
            <text class="quick-sub">{{ isJMode ? 'J人模式不支持' : '上传值日照片' }}</text>
          </view>

          <view class="quick-item" @tap="setReminder" :class="{ 'disabled': !isJMode }">
            <view class="quick-icon">⏰</view>
            <text class="quick-title">提醒时间</text>
            <text class="quick-sub">{{ isJMode ? '设置值日提醒' : 'P人模式不支持' }}</text>
          </view>
        </view>
      </view>

      <!-- 今日提醒 -->
      <view class="today-section">
        <text class="section-title">今日提醒</text>
        <view class="today-card">
          <!-- P人模式下显示最新通知 -->
          <template v-if="!isJMode">
            <view class="today-row">
              <text class="today-item">{{ latestNotification || '今日暂无值日动态' }}</text>
            </view>
          </template>
          
          <!-- J人模式下显示原本的提醒 -->
          <template v-else>
            <view class="today-row" v-if="todayDutyPerson">
              <text class="today-item">今日值日：{{ todayDutyPerson }}</text>
            </view>
            <view class="today-row" v-if="todayDutyPerson">
              <text class="today-item">记得完成值日任务哦</text>
            </view>
            <view class="today-row" v-if="!todayDutyPerson">
              <text class="today-item">今日无值日安排</text>
            </view>
            <view class="today-row" v-if="todayCheckinPerson">
              <text class="today-item">✓ {{ todayCheckinPerson }} 已完成值日</text>
            </view>
          </template>
        </view>
      </view>
      </template>

      <template v-else-if="active === 'duty'">
        <!-- 值日表内容 - 与manager-duty-table页面保持一致 -->
        <view class="duty-table-section">
          <text class="section-title">值日表</text>
          
          <!-- 功能切换区域 -->
          <view class="function-section">
            <view class="switch-item" @tap="toggleViewMode">
              <text class="switch-text">只看自己的</text>
              <view class="switch-btn" :class="{ active: viewOnlyMe }">
                <view class="switch-dot"></view>
              </view>
            </view>
            <view class="action-buttons">
              <button class="reschedule-btn" @tap="goReschedule">重新排班</button>
            </view>
          </view>

          <!-- 值日表日历区域 - 显示所有月份 -->
          <view class="calendar-list" v-if="generatedMonths.length > 0">
            <view class="calendar-card" v-for="month in generatedMonths" :key="month.key">
              <view class="calendar-header">
                <text class="nav-arrow" @tap="prevMonth(month)">‹</text>
                <text class="month-text">{{ month.year }}年{{ month.month }}月</text>
                <text class="nav-arrow" @tap="nextMonth(month)">›</text>
              </view>
              <view class="weekday-row">
                <text class="weekday" v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</text>
              </view>
              <view class="calendar-grid">
                <view 
                  class="calendar-day" 
                  v-for="(cell, idx) in month.cells" 
                  :key="idx"
                  :class="{ 
                    'in-range': cell.day && isInDutyRange(getDateString(month.year, month.month, cell.day)),
                    'has-duty': cell.title,
                    'has-checkin': cell.day && getCheckinPersonForDate(getDateString(month.year, month.month, cell.day))
                  }"
                >
                  <text class="day-number" v-if="cell.day">{{ cell.day }}</text>
                  <text v-if="cell.title" class="duty-person" :class="{ 'only-me': viewOnlyMe && cell.title !== userName }">
                    {{ viewOnlyMe && cell.title !== userName ? '' : cell.title }}
                  </text>
                  <text v-if="cell.day && getCheckinPersonForDate(getDateString(month.year, month.month, cell.day))" class="checkin-person" :class="{ 'only-me': viewOnlyMe && getCheckinPersonForDate(getDateString(month.year, month.month, cell.day)) !== userName }">
                    ✓{{ viewOnlyMe && getCheckinPersonForDate(getDateString(month.year, month.month, cell.day)) !== userName ? '' : getCheckinPersonForDate(getDateString(month.year, month.month, cell.day)) }}
                  </text>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 如果没有数据，显示当前月份 -->
          <view v-else class="calendar-section">
            <view class="calendar-header">
              <text class="month-text">{{ currentMonth }}</text>
            </view>
            <view class="weekday-row">
              <text class="weekday" v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</text>
            </view>
            <view class="calendar-grid">
              <view 
                class="calendar-day" 
                v-for="day in calendarDays" 
                :key="day.date"
                :class="{ 
                  'in-range': isInDutyRange(day.date),
                  'has-duty': day.dutyPerson,
                  'has-checkin': day.checkinPerson
                }"
              >
                <text class="day-number">{{ day.day }}</text>
                <text v-if="day.dutyPerson" class="duty-person" :class="{ 'only-me': viewOnlyMe && day.dutyPerson !== userName }">
                  {{ viewOnlyMe && day.dutyPerson !== userName ? '' : day.dutyPerson }}
                </text>
                <text v-if="day.checkinPerson" class="checkin-person" :class="{ 'only-me': viewOnlyMe && day.checkinPerson !== userName }">
                  ✓{{ viewOnlyMe && day.checkinPerson !== userName ? '' : day.checkinPerson }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </template>
    </view>

    <!-- 底部菜单（页面内嵌） -->
    <view class="bottom-nav">
      <view class="nav-item" :class="{ active: active === 'home' }" @tap="goHome">
        <text class="nav-icon-emoji">🏠</text>
        <text class="nav-text">首页</text>
      </view>
      <view class="nav-item" :class="{ active: active === 'duty' }" @tap="goDutyTable">
        <text class="nav-icon-emoji">📋</text>
        <text class="nav-text">值日表</text>
      </view>
      <view class="nav-item" @tap="goMine">
        <text class="nav-icon-emoji">👤</text>
        <text class="nav-text">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase.js'

const roomName = ref('')
const userName = ref('')
const active = ref('home')
const isJMode = ref(true)
const viewOnlyMe = ref(false)
const currentDate = ref(new Date())
const dutyScheduleData = ref(null)
const generatedMonths = ref([])
const todayDutyPerson = ref('')
const todayCheckinPerson = ref('')
const latestNotification = ref('')
const isLoading = ref(true)  // 加载状态
const pageUserId = ref('')   // Session 守卫：记录页面打开时的用户ID

// 监听全局事件更新用户信息
const handleUserInfoUpdate = (userInfo) => {
  if (userInfo.userName) {
    userName.value = userInfo.userName
  }
  if (userInfo.dormitoryNumber) {
    roomName.value = userInfo.dormitoryNumber + '室'
  }
}

// 计算当前月份
const currentMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  return `${year}年${month}月`
})

// 生成日历数据
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()
  
  const days = []
  
  // 添加空白日期（上个月的末尾）
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: '', day: '', dutyPerson: null })
  }
  
  // 添加当月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    // 获取值班人员和打卡人员数据
    const dutyPerson = getDutyPersonForDate(date)
    const checkinPerson = getCheckinPersonForDate(date)
    days.push({ 
      date, 
      day, 
      dutyPerson,
      checkinPerson 
    })
  }
  
  return days
})

// 判断日期是否在值日区间内
const isInDutyRange = (date) => {
  if (!dutyScheduleData.value || !date) {
    return false
  }
  
  const startDate = dutyScheduleData.value.startDate
  const endDate = dutyScheduleData.value.endDate
  
  if (!startDate || !endDate) {
    return false
  }
  
  return date >= startDate && date <= endDate
}

// 获取某日的值班人员
const getDutyPersonForDate = (date) => {
  if (!dutyScheduleData.value) {
    return null
  }
  
  // 从存储的数据中查找对应日期的值班人员
  const schedule = dutyScheduleData.value.schedule || []
  if (Array.isArray(schedule)) {
    const entry = schedule.find(([scheduleDate]) => scheduleDate === date)
    return entry ? entry[1] : null
  }
  
  return null
}

// 获取某日的打卡人员
const getCheckinPersonForDate = (date) => {
  if (!dutyScheduleData.value) {
    return null
  }
  
  // 从存储的数据中查找对应日期的打卡人员
  const checkins = dutyScheduleData.value.checkins || []
  if (Array.isArray(checkins)) {
    const entry = checkins.find(([checkinDate]) => checkinDate === date)
    return entry ? entry[1] : null
  }
  
  return null
}

// 切换查看模式
const toggleViewMode = () => {
  viewOnlyMe.value = !viewOnlyMe.value
}

// 生成日期字符串
const getDateString = (year, month, day) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 月份导航功能
const prevMonth = (month) => {
  // 这里可以实现月份切换逻辑，暂时只是提示
  uni.showToast({ title: '月份切换功能', icon: 'none' })
}

const nextMonth = (month) => {
  // 这里可以实现月份切换逻辑，暂时只是提示
  uni.showToast({ title: '月份切换功能', icon: 'none' })
}

// 重新排班
const goReschedule = () => {
  try {
    const mode = uni.getStorageSync('duty_mode')
    if (mode === 'J') {
      uni.navigateTo({ url: '/pages/j-mode-auto-schedule/j-mode-auto-schedule' })
    } else if (mode === 'P') {
      uni.navigateTo({ url: '/pages/p-mode-schedule/p-mode-schedule' })
    } else {
      // 默认跳转到J人模式
      uni.navigateTo({ url: '/pages/j-mode-auto-schedule/j-mode-auto-schedule' })
    }
  } catch (e) {
    // 默认跳转到J人模式
    uni.navigateTo({ url: '/pages/j-mode-auto-schedule/j-mode-auto-schedule' })
  }
}

// 从本地缓存快速加载数据（基于用户ID）
const loadFromCache = (userId) => {
  if (!userId) return
  try {
    const cachedUserInfo = uni.getStorageSync(`user_info_${userId}`)
    if (cachedUserInfo) {
      userName.value = cachedUserInfo.userName || ''
      roomName.value = cachedUserInfo.roomName || ''
      isJMode.value = cachedUserInfo.isJMode !== false
    }
    const cachedSchedule = uni.getStorageSync(`schedule_data_${userId}`)
    if (cachedSchedule) {
      dutyScheduleData.value = cachedSchedule
      generatedMonths.value = cachedSchedule.generatedMonths || []
      updateTodayReminder()
    }
  } catch (e) {
    console.log('缓存读取失败')
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
    console.log('缓存保存失败')
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
      .select('username, role, dormitory_id, dormitories(id, name, duty_mode)')
      .eq('id', user.id)
      .single()

    if (profile) {
      // 【权限硬核校验】如果数据库里是成员，却进到了管理员页面，强制重定向
      if (profile.role !== 'manager') {
        console.warn('权限不符，正在重定向到成员页面')
        uni.reLaunch({ url: '/pages/member-home/member-home' })
        return
      }

      userName.value = profile.username || '管理员'
      roomName.value = (profile.dormitories?.name || '') + (profile.dormitories?.name ? '室' : '')
      
      const mode = profile.dormitories?.duty_mode || 'J'
      isJMode.value = (mode === 'J')
      
      // 保存到当前用户的专属缓存
      saveToCache(user.id, { userName: userName.value, roomName: roomName.value, isJMode: isJMode.value }, null)
      
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

    // 4. 加载排班数据
    if (profile?.dormitory_id) {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('schedule_data')
        .eq('dormitory_id', profile.dormitory_id)
        .maybeSingle()

      if (scheduleError) {
        console.error('加载排班数据失败:', scheduleError)
        return
      }

      if (scheduleData?.schedule_data) {
        const sd = scheduleData.schedule_data
        dutyScheduleData.value = {
          mode: sd.mode || 'J',
          scheduleType: sd.scheduleType || 'auto',
          schedule: sd.schedule_data || [],
          generatedMonths: sd.generatedMonths || [],
          startDate: sd.startDate,
          endDate: sd.endDate,
          members: sd.members || [],
          publishTime: new Date().toISOString()
        }
        generatedMonths.value = sd.generatedMonths || []
        updateTodayReminder()
        
        // 保存到专属缓存
        saveToCache(user.id, null, dutyScheduleData.value)
      }
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    isLoading.value = false
  }
  
  // 监听全局事件
  uni.$on('updateUserInfo', handleUserInfoUpdate)
  uni.$on('dutyCheckinUpdated', handleCheckinUpdate)
  
  uni.$on('dormitoryNameUpdated', (data) => {
    roomName.value = data.newName + '室'
    // 更新缓存
    const userId = supabase.auth.getUser()?.data?.user?.id
    if (userId) saveToCache(userId, { userName: userName.value, roomName: data.newName + '室', isJMode: isJMode.value }, null)
  })

  // 【新增】监听首页动态更新（由 App.vue 转发）
  uni.$on('dormitoryLogUpdated', (newLog) => {
    latestNotification.value = newLog.content
  })
})

// 更新今日提醒
const updateTodayReminder = () => {
  if (!dutyScheduleData.value) return
  
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  // 获取今日值班人员
  const schedule = dutyScheduleData.value.schedule || []
  const todayDuty = schedule.find(([date]) => date === todayStr)
  todayDutyPerson.value = todayDuty ? todayDuty[1] : ''
  
  // 获取今日打卡人员
  const checkins = dutyScheduleData.value.checkins || []
  const todayCheckin = checkins.find(([date]) => date === todayStr)
  todayCheckinPerson.value = todayCheckin ? todayCheckin[1] : ''
}

// 处理打卡更新事件
const handleCheckinUpdate = async (checkinData) => {
  console.log('收到打卡更新事件:', checkinData)
  
  // 重新加载排班数据
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('dormitory_id')
      .eq('id', user.id)
      .single()

    if (profile?.dormitory_id) {
      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('schedule_data')
        .eq('dormitory_id', profile.dormitory_id)
        .single()

      if (scheduleData?.schedule_data) {
        const sd = scheduleData.schedule_data
        dutyScheduleData.value = {
          mode: 'J',
          scheduleType: sd.scheduleType || 'auto',
          schedule: sd.schedule_data || [],
          generatedMonths: sd.generatedMonths || [],
          startDate: sd.startDate,
          endDate: sd.endDate,
          members: sd.members || []
        }
        updateTodayReminder()
      }
    }

    uni.showToast({
      title: `${checkinData.person}已打卡值日`,
      icon: 'none',
      duration: 2000
    })
  } catch (e) {
    console.error('更新值日表数据失败:', e)
  }
}

onUnmounted(() => {
  // 移除事件监听
  uni.$off('updateUserInfo', handleUserInfoUpdate)
  uni.$off('dutyCheckinUpdated', handleCheckinUpdate)
  uni.$off('dormitoryNameUpdated')  // 【重要】移除宿舍名更新事件监听
  uni.$off('dormitoryLogUpdated')   // 【重要】移除动态通知监听
})

const goDutyManage = () => {
  let target = '/pages/j-mode-auto-schedule/j-mode-auto-schedule'
  try {
    const mode = uni.getStorageSync('duty_mode')
    if (mode === 'P') target = '/pages/p-mode-schedule/p-mode-schedule'
  } catch (e) {}
  uni.navigateTo({ url: target })
}

const uploadDutyPhoto = () => {
  try {
    const mode = uni.getStorageSync('duty_mode')
    if (mode === 'J') {
      uni.showToast({ 
        title: 'J人模式下不支持记录值日功能', 
        icon: 'none',
        duration: 2000
      })
      return
    }
  } catch (e) {
    // 如果获取模式失败，默认允许访问
  }
  uni.navigateTo({ url: '/pages/p-mode-checkin/p-mode-checkin?from=manager' })
}

const setReminder = () => {
  // 只在J人模式下可以使用
  if (!isJMode.value) {
    uni.showToast({ title: 'P人模式下不支持设置提醒时间', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/set-reminder-time/set-reminder-time' })
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

// 导航方法
const goHome = async () => { 
  if (!(await checkSession())) return
  // 已经在首页
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
  
  &.disabled {
    background: #f5f5f5;
    opacity: 0.6;
  }
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
.nav-item.active { color: #4CAF50; }
.nav-icon-emoji { display: block; font-size: 44rpx; line-height: 1; }
.nav-text { display: block; font-size: 24rpx; margin-top: 6rpx; }

/* 值日表相关样式 */
.duty-table-section {
  margin-top: 20rpx;
}

.calendar-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.calendar-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.function-section {
  margin-bottom: 30rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 20rpx;
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.switch-btn {
  width: 80rpx;
  height: 40rpx;
  background: #ccc;
  border-radius: 20rpx;
  position: relative;
  transition: background-color 0.3s ease;
  
  &.active {
    background: #88d8a3;
  }
}

.switch-dot {
  width: 36rpx;
  height: 36rpx;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2rpx;
  left: 2rpx;
  transition: transform 0.3s ease;
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,.2);
}

.switch-btn.active .switch-dot {
  transform: translateX(40rpx);
}

.action-buttons {
  margin-top: 20rpx;
  display: flex;
  justify-content: center;
}

.reschedule-btn {
  background: linear-gradient(135deg, #a8e6cf, #88d8a3);
  color: white;
  border: none;
  border-radius: 24rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.calendar-section {
  background: #f8f9fa;
  border-radius: 20rpx;
  padding: 20rpx;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 0 10rpx;
}

.month-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
  flex: 1;
}

.nav-arrow { 
  font-size: 36rpx; 
  color: #88d8a3; 
  padding: 8rpx 16rpx;
  cursor: pointer;
  user-select: none;
  border-radius: 8rpx;
  transition: background-color 0.2s;
}

.nav-arrow:active {
  background-color: rgba(136, 216, 163, 0.1);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
}

.calendar-day {
  aspect-ratio: 1;
  background: white;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8rpx;
  position: relative;
  transition: all 0.3s ease;
  
  &.in-range {
    background: #e8f5e8; // 浅绿色底色
    border: 2rpx solid #88d8a3;
  }
  
  &.has-duty {
    background: #e8f5e8; // 有值班人员的浅绿色
    border: 2rpx solid #88d8a3;
  }
  
  &.has-checkin {
    background: #d4edda; // 已打卡的深绿色
    border: 2rpx solid #28a745;
  }
  
  &.in-range.has-duty {
    background: #c3e6cb; // 值日区间内且有值班人员
    border: 2rpx solid #88d8a3;
  }
  
  &.in-range.has-checkin {
    background: #b8d4ba; // 值日区间内且已打卡
    border: 2rpx solid #28a745;
  }
}

.day-number {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.duty-person {
  font-size: 18rpx;
  color: #2e7d32;
  font-weight: 600;
  margin-top: 2rpx;
  text-align: center;
  
  &.only-me {
    opacity: 0;
  }
}

.checkin-person {
  font-size: 16rpx;
  color: #28a745;
  font-weight: 600;
  margin-top: 2rpx;
  text-align: center;
  
  &.only-me {
    opacity: 0;
  }
}

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
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.skeleton-item {
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  height: 120rpx;
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
