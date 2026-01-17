<template>
  <view class="page-container">
    <view class="bg-gradient"></view>
    
    <!-- 加载状态骨架屏 -->
    <view class="content-card" v-if="isLoading">
      <text class="title">值日表</text>
      <view class="skeleton-section">
        <view class="skeleton-line skeleton-switch"></view>
      </view>
      <view class="skeleton-calendar">
        <view class="skeleton-header"></view>
        <view class="skeleton-grid">
          <view class="skeleton-day" v-for="i in 35" :key="i"></view>
        </view>
      </view>
      <view class="loading-text">数据加载中...</view>
    </view>
    
    <view class="content-card" v-else>
      <text class="title">值日表</text>
      
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

      <!-- 值日表日历区域 -->
      <view class="calendar-section">
        <view class="calendar-header">
          <text class="nav-arrow" @tap="prevMonth">‹</text>
          <text class="month-text">{{ currentDisplayMonth }}</text>
          <text class="nav-arrow" @tap="nextMonth">›</text>
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
              'has-checkin': day.checkinPerson,
              'p-mode': dutyMode === 'P',
              'j-mode': dutyMode === 'J'
            }"
              @tap="onDayClick(day)"
          >
            <text class="day-number">{{ day.day }}</text>
            <text v-if="day.dutyPerson" class="duty-person" :class="{ 'only-me': viewOnlyMe && day.dutyPerson !== currentUserName }">
              {{ viewOnlyMe && day.dutyPerson !== currentUserName ? '' : day.dutyPerson }}
            </text>
            <text v-if="day.checkinPerson" class="checkin-person" :class="{ 'only-me': viewOnlyMe && day.checkinPerson !== currentUserName }">
              ✓{{ viewOnlyMe && day.checkinPerson !== currentUserName ? '' : day.checkinPerson }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部菜单 -->
    <view class="bottom-nav">
      <view class="nav-item" @tap="goHome">
        <text class="nav-icon-emoji">🏠</text>
        <text class="nav-text">首页</text>
      </view>
      <view class="nav-item active">
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
import { onShow } from '@dcloudio/uni-app'
import { supabase } from '@/utils/supabase.js'

// 响应式数据
const viewOnlyMe = ref(false)
const currentDate = ref(new Date())
const currentUserName = ref('')
const isLoading = ref(true)  // 加载状态
const pageUserId = ref('')   // Session 守卫：记录页面打开时的用户ID

// 单月视图相关
const currentDisplayDate = ref(new Date())

// 计算当前显示月份
const currentDisplayMonth = computed(() => {
  const year = currentDisplayDate.value.getFullYear()
  const month = currentDisplayDate.value.getMonth() + 1
  return `${year}年${month}月`
})

// 计算当前月份（保持向后兼容）
const currentMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  return `${year}年${month}月`
})

// 生成日历数据
const calendarDays = computed(() => {
  const year = currentDisplayDate.value.getFullYear()
  const month = currentDisplayDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()
  
  const days = []
  
  // 添加空白日期（上个月的末尾）
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: '', day: '', dutyPerson: null, checkinPerson: null })
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

// 从本地存储获取实际的值日安排数据
const dutyScheduleData = ref(null)

// 计算当前模式（P 或 J）
const dutyMode = computed(() => {
  return dutyScheduleData.value?.mode || 'J'
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
    if (entry) {
      return entry[1]
    }
  }
  
  // 如果schedule中没有找到，尝试从generatedMonths中查找（手动排班数据）
  if (dutyScheduleData.value.generatedMonths) {
    for (const monthData of dutyScheduleData.value.generatedMonths) {
      if (monthData.cells) {
        for (const cell of monthData.cells) {
          if (cell.day && cell.title) {
            const cellDate = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
            if (cellDate === date) {
              return cell.title
            }
          }
        }
      }
    }
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
    // 模糊匹配日期部分 (YYYY-MM-DD)
    const entry = checkins.find(([checkinDate]) => {
      if (!checkinDate) return false
      return checkinDate.slice(0, 10) === date
    })
    return entry ? entry[1] : null
  }
  
  return null
}

// 切换查看模式
const toggleViewMode = () => {
  viewOnlyMe.value = !viewOnlyMe.value
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

// 导航函数（增加身份识别，防止跳错）
const goHome = async () => {
  if (!(await checkSession())) return
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', (await supabase.auth.getUser()).data.user.id).single()
  const target = profile?.role === 'manager' ? '/pages/manager-home/manager-home' : '/pages/member-home/member-home'
  uni.reLaunch({ url: target })
}

const goMine = async () => {
  if (!(await checkSession())) return
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', (await supabase.auth.getUser()).data.user.id).single()
  const target = profile?.role === 'manager' ? '/pages/manager-mine/manager-mine' : '/pages/member-mine/member-mine'
  uni.reLaunch({ url: target })
}

// 月份切换功能
const prevMonth = () => {
  const newDate = new Date(currentDisplayDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentDisplayDate.value = newDate
}

const nextMonth = () => {
  const newDate = new Date(currentDisplayDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentDisplayDate.value = newDate
}

// 重新排班
const goReschedule = () => {
  try {
    const mode = uni.getStorageSync('duty_mode')
    if (mode === 'J') {
      uni.navigateTo({ url: '/pages/j-mode-auto-schedule/j-mode-auto-schedule' })
    } else if (mode === 'P') {
      // P模式跳转到P人模式排班页面
      uni.navigateTo({ url: '/pages/p-mode-schedule/p-mode-schedule' })
      return
    } else {
      // 默认跳转到J人模式
      uni.navigateTo({ url: '/pages/j-mode-auto-schedule/j-mode-auto-schedule' })
    }
  } catch (e) {
    // 默认跳转到J人模式
    uni.navigateTo({ url: '/pages/j-mode-auto-schedule/j-mode-auto-schedule' })
  }
}

// 点击日期
const onDayClick = (day) => {
  if (!day.date || !day.checkinPerson) return
  
  // 在P人模式下，显示上传的照片和描述
  if (dutyScheduleData.value && dutyScheduleData.value.mode === 'P') {
    showDayDetails(day)
  }
}

// 显示日期详情
const showDayDetails = (day) => {
  // 获取该日期的打卡详情
  const checkins = dutyScheduleData.value.checkins || []
  const checkinData = checkins.find(([date]) => {
    if (!date) return false
    return date.slice(0, 10) === day.date
  })
  
  if (checkinData) {
    const [date, person, images, description] = checkinData
    
    // 显示照片和描述
    uni.showModal({
      title: `${date} 值日详情`,
      content: `值日人员：${person}\n描述：${description || '无描述'}`,
      showCancel: false,
      confirmText: '查看照片',
      success: (res) => {
        if (res.confirm && images && images.length > 0) {
          // 预览照片
          uni.previewImage({
            urls: images,
            current: images[0]
          })
        }
      }
    })
  } else {
    // 没有详细信息，只显示基本信息
    uni.showToast({
      title: `${day.date} 已打卡`,
      icon: 'none',
      duration: 2000
    })
  }
}

// 从本地缓存快速加载
const loadFromCache = () => {
  try {
    const cachedSchedule = uni.getStorageSync('cached_schedule_data')
    if (cachedSchedule) {
      dutyScheduleData.value = cachedSchedule
      return true
    }
    const cachedUserInfo = uni.getStorageSync('cached_user_info')
    if (cachedUserInfo?.userName) {
      currentUserName.value = cachedUserInfo.userName
    }
  } catch (e) {
    console.log('缓存读取失败')
  }
  return false
}

onMounted(() => {
  // 1. 先从缓存快速加载
  const hasCache = loadFromCache()
  if (hasCache) {
    isLoading.value = false
  }
  
  // 2. 后台加载最新数据
  loadDutyData()
  
  // 监听全局事件
  uni.$on('dutyCheckinUpdated', handleCheckinUpdate)
  uni.$on('updateUserInfo', handleUserInfoUpdate)
})

// 页面显示时（从其他页面返回时也会触发）
onShow(() => {
  loadDutyData()
})

// 加载值日数据
const loadDutyData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      isLoading.value = false
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    pageUserId.value = user.id // 锁定页面最初登录的用户ID

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, role, dormitory_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      // 【权限拦截】如果是成员，严禁进入管理员排班表
      if (profile.role !== 'manager') {
        console.warn('非管理员尝试访问管理员排班表，重定向中...')
        uni.reLaunch({ url: '/pages/member-duty-table/member-duty-table' })
        return
      }

      currentUserName.value = profile.username

      // 从 Supabase 加载排班数据
      if (profile.dormitory_id) {
        // 1. 获取当前宿舍模式
        const { data: dorm } = await supabase
          .from('dormitories')
          .select('duty_mode')
          .eq('id', profile.dormitory_id)
          .single()
        
        const currentMode = dorm?.duty_mode || 'J'

        // 2. 加载排班范围
        const { data: scheduleData, error } = await supabase
          .from('schedules')
          .select('schedule_data')
          .eq('dormitory_id', profile.dormitory_id)
          .maybeSingle()

        if (error) {
          console.error('加载排班数据失败:', error)
          isLoading.value = false
          return
        }

        // 3. 如果是 P 模式，还需要加载打卡记录
        let cloudCheckins = []
        if (currentMode === 'P') {
          const sd = scheduleData?.schedule_data
          const { data: checkins } = await supabase
            .from('checkins')
            .select('*')
            .eq('dormitory_id', profile.dormitory_id)
            .gte('checkin_date', sd?.startDate || '1900-01-01') // 逻辑过滤：只取新排班开始后的打卡
            .lte('checkin_date', sd?.endDate || '2100-12-31')   // 逻辑过滤：只取新排班结束前的打卡
            .order('checkin_date', { ascending: false })
          
          cloudCheckins = (checkins || []).map(c => [
            c.checkin_date, 
            c.person_name, 
            c.photo_urls || [], 
            c.description || ''
          ])
        }

        if (scheduleData?.schedule_data) {
          const sd = scheduleData.schedule_data
          dutyScheduleData.value = {
            mode: currentMode,
            scheduleType: sd.scheduleType || 'auto',
            schedule: sd.schedule_data || [],
            generatedMonths: sd.generatedMonths || [],
            startDate: sd.startDate,
            endDate: sd.endDate,
            members: sd.members || [],
            checkins: cloudCheckins, // 合并打卡记录
            publishTime: new Date().toISOString()
          }
          console.log('加载排班数据成功:', dutyScheduleData.value)
          
          // 同步更新模式缓存
          uni.setStorageSync('duty_mode', currentMode)
          
          // 同步更新数据缓存
          try {
            uni.setStorageSync('cached_schedule_data', dutyScheduleData.value)
          } catch (e) {}
        } else {
          console.log('云端未找到排班数据，清空本地显示')
          dutyScheduleData.value = null
          try {
            uni.removeStorageSync('cached_schedule_data')
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    isLoading.value = false
  }
}

// 处理用户信息更新事件
const handleUserInfoUpdate = async (userInfo) => {
  if (userInfo.userName) {
    currentUserName.value = userInfo.userName
  }
  // 重新加载排班数据
  await loadDutyData()
}

// 处理打卡更新事件
const handleCheckinUpdate = async (checkinData) => {
  console.log('收到打卡更新事件:', checkinData)
  await loadDutyData()
  uni.showToast({
    title: `${checkinData.person}已打卡值日`,
    icon: 'none',
    duration: 2000
  })
}

onUnmounted(() => {
  // 移除事件监听
  uni.$off('dutyCheckinUpdated', handleCheckinUpdate)
  uni.$off('updateUserInfo', handleUserInfoUpdate)
})

</script>

<style lang="scss" scoped>
.page-container { min-height: 100vh; position: relative; padding: 40rpx; padding-bottom: 140rpx; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
.bg-gradient { position: fixed; top:0;left:0;right:0;bottom:0; background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%); z-index:-1; }

/* 底部导航栏样式 */
.bottom-nav {
  position: fixed;
  left: 0; 
  right: 0; 
  bottom: 0;
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

.nav-item + .nav-item { 
  border-left: 2rpx solid #e5e5e5; 
}

.nav-item.active { 
  color: #4CAF50; 
}

.nav-icon-emoji {
  display: block;
  font-size: 44rpx;
  line-height: 1;
}

.nav-text { 
  display: block; 
  font-size: 24rpx; 
  margin-top: 6rpx; 
}

.content-card { 
  width: 100%;
  max-width: 750rpx;
  margin: 0 auto;
  padding: 40rpx; 
  background: rgba(255,255,255,.95); 
  border-radius: 30rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.title { 
  display: block; 
  font-size: 40rpx; 
  font-weight: 700; 
  color: #333; 
  margin-bottom: 30rpx; 
  text-align: center;
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
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
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

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6rpx;
  margin-bottom: 6rpx;
  width: 100%;
  box-sizing: border-box;
}

.weekday {
  text-align: center;
  color: #888;
  font-size: 24rpx;
  font-weight: 500;
  padding: 8rpx 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6rpx;
  width: 100%;
  box-sizing: border-box;
}

.calendar-day {
  background: white;
  border: 2rpx solid #e5e7eb;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 6rpx;
  min-height: 70rpx;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
  
  // P 人模式：值日区间内的所有日期都显示浅绿色
  &.p-mode.in-range {
    background: #e8f5e8;
    border: 2rpx solid #88d8a3;
  }
  
  // J 人模式：值日区间内但未排班的日期不添加样式
  &.j-mode.in-range {
    // 去掉边框，未排班的日期使用默认样式
  }
  
  // 已排班的日期（两种模式通用）
  &.has-duty {
    background: #e8f5e8;
    border: 2rpx solid #88d8a3;
  }
  
  // 已打卡的日期（两种模式通用）
  &.has-checkin {
    background: #d4edda;
    border: 2rpx solid #28a745;
  }
  
  // 值日区间内且已排班
  &.in-range.has-duty {
    background: #c3e6cb;
    border: 2rpx solid #88d8a3;
  }
  
  // 值日区间内且已打卡
  &.in-range.has-checkin {
    background: #b8d4ba;
    border: 2rpx solid #28a745;
  }
}

.day-number {
  font-size: 20rpx;
  color: #333;
  font-weight: 500;
  line-height: 1;
  width: 100%;
  word-break: break-word;
}

.duty-person {
  font-size: 16rpx;
  color: #2e7d32;
  font-weight: 600;
  margin-top: 2rpx;
  text-align: center;
  word-break: break-all;
  line-height: 1.2;
  width: 100%;
  max-width: calc(100% - 4rpx);
  
  &.only-me {
    opacity: 0;
  }
}

.checkin-person {
  font-size: 14rpx;
  color: #28a745;
  font-weight: 600;
  margin-top: 2rpx;
  text-align: center;
  word-break: break-all;
  line-height: 1.2;
  width: 100%;
  max-width: calc(100% - 4rpx);
  
  &.only-me {
    opacity: 0;
  }
}

/* 骨架屏样式 */
.skeleton-section {
  margin-bottom: 30rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 20rpx;
}

.skeleton-line {
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 8rpx;
}

.skeleton-switch {
  height: 40rpx;
  width: 50%;
}

.skeleton-calendar {
  background: #f8f9fa;
  border-radius: 20rpx;
  padding: 20rpx;
}

.skeleton-header {
  height: 40rpx;
  width: 40%;
  margin: 0 auto 20rpx;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 8rpx;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6rpx;
}

.skeleton-day {
  height: 70rpx;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 8rpx;
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


