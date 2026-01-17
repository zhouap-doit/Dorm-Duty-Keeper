<template>
  <view class="home-container">
    <view class="bg-gradient"></view>

    <view class="home-card">
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
                  <text v-if="cell.title" class="duty-person" :class="{ 'only-me': viewOnlyMe && cell.title !== '张三' }">
                    {{ viewOnlyMe && cell.title !== '张三' ? '' : cell.title }}
                  </text>
                  <text v-if="cell.day && getCheckinPersonForDate(getDateString(month.year, month.month, cell.day))" class="checkin-person" :class="{ 'only-me': viewOnlyMe && getCheckinPersonForDate(getDateString(month.year, month.month, cell.day)) !== '张三' }">
                    ✓{{ viewOnlyMe && getCheckinPersonForDate(getDateString(month.year, month.month, cell.day)) !== '张三' ? '' : getCheckinPersonForDate(getDateString(month.year, month.month, cell.day)) }}
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
                <text v-if="day.dutyPerson" class="duty-person" :class="{ 'only-me': viewOnlyMe && day.dutyPerson !== '张三' }">
                  {{ viewOnlyMe && day.dutyPerson !== '张三' ? '' : day.dutyPerson }}
                </text>
                <text v-if="day.checkinPerson" class="checkin-person" :class="{ 'only-me': viewOnlyMe && day.checkinPerson !== '张三' }">
                  ✓{{ viewOnlyMe && day.checkinPerson !== '张三' ? '' : day.checkinPerson }}
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

const roomName = ref('301室')
const userName = ref('张三')
const active = ref('home')
const isJMode = ref(false)
const viewOnlyMe = ref(false)
const currentDate = ref(new Date())
const dutyScheduleData = ref(null)
const generatedMonths = ref([])
const todayDutyPerson = ref('')
const todayCheckinPerson = ref('')

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

onMounted(() => {
  try {
    // ... existing code ...
    const cache = uni.getStorageSync('manager_profile')
    if (cache && typeof cache === 'object') {
      if (cache.userName) userName.value = cache.userName
      if (cache.dormitoryNumber) roomName.value = cache.dormitoryNumber + '室'
    }
    
    const mode = uni.getStorageSync('duty_mode')
    if (mode === 'J') {
      isJMode.value = true
      console.log('[管理人员首页] 设置了J人模式')
    } else if (mode === 'P') {
      isJMode.value = false
      console.log('[管理人员首页] 设置了P人模式')
    }
    
    // ... existing code ...
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData) {
      dutyScheduleData.value = storedData
      console.log('[管理人员首页] 已发布值日表：', storedData)
      console.log('[管理人员首页] 排班类型:', storedData.scheduleType)
      console.log('[管理人员首页] 成员数量:', storedData.members?.length || 0)
      // 加载生成的月份数据
      if (storedData.generatedMonths) {
        generatedMonths.value = storedData.generatedMonths
      }
      // 更新今日提醒
      updateTodayReminder()
    }
  } catch (e) {}
  
  // 监听全局事件
  uni.$on('updateUserInfo', handleUserInfoUpdate)
  uni.$on('dutyCheckinUpdated', handleCheckinUpdate)
  
  // 【重要】监听宿舍名更新事件
  uni.$on('dormitoryNameUpdated', (data) => {
    console.log('[管理人首页] 宿舍名符已更新:', data.oldName, '->', data.newName)
    roomName.value = data.newName + '室'
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
const handleCheckinUpdate = (checkinData) => {
  console.log('收到打卡更新事件:', checkinData)
  
  // 重新加载值日表数据
  try {
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData) {
      dutyScheduleData.value = storedData
      updateTodayReminder()
      
      // 显示通知
      uni.showToast({
        title: `${checkinData.person}已打卡值日`,
        icon: 'none',
        duration: 2000
      })
    }
  } catch (e) {
    console.error('更新值日表数据失败:', e)
  }
}

onUnmounted(() => {
  // 移除事件监听
  uni.$off('updateUserInfo', handleUserInfoUpdate)
  uni.$off('dutyCheckinUpdated', handleCheckinUpdate)
  uni.$off('dormitoryNameUpdated')  // 【重要】移除宿舍名更新事件监听
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

const goHome = () => { 
  // tabBar页面需要使用switchTab
  uni.switchTab({ url: '/pages/manager-home/manager-home' })
}
const goDutyTable = () => { 
  uni.navigateTo({ url: '/pages/manager-duty-table/manager-duty-table' })
}
const goMine = () => { 
  uni.navigateTo({ url: '/pages/manager-mine/manager-mine' })
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
</style>
