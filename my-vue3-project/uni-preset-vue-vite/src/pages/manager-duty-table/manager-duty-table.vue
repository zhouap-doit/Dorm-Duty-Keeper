<template>
  <view class="page-container">
    <view class="bg-gradient"></view>
    
    <view class="content-card">
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

// 响应式数据
const viewOnlyMe = ref(false)
const currentDate = ref(new Date())
const currentUserName = ref('')

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
    const entry = checkins.find(([checkinDate]) => checkinDate === date)
    return entry ? entry[1] : null
  }
  
  return null
}

// 切换查看模式
const toggleViewMode = () => {
  viewOnlyMe.value = !viewOnlyMe.value
}

// 导航函数
const goHome = () => {
  uni.navigateTo({ url: '/pages/manager-home/manager-home' })
}

const goMine = () => {
  uni.navigateTo({ url: '/pages/manager-mine/manager-mine' })
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
  const checkinData = checkins.find(([date]) => date === day.date)
  
  if (checkinData && checkinData.length > 2) {
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

onMounted(() => {
  // 从本地存储加载值日表数据
  try {
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData) {
      dutyScheduleData.value = storedData
      console.log('加载值日表数据成功:', storedData)
    } else {
      console.log('未找到值日表数据')
    }
    // 读取当前用户名称用于“只看自己的”
    const manager = uni.getStorageSync('manager_profile') || {}
    const member = uni.getStorageSync('member_profile') || {}
    if (manager && manager.userName) {
      currentUserName.value = manager.userName
    } else if (member && member.userName) {
      currentUserName.value = member.userName
    } else if (storedData && Array.isArray(storedData.members) && storedData.members.length) {
      currentUserName.value = storedData.members[0]
    }
  } catch (e) {
    console.error('加载值日表数据失败:', e)
  }
  
// ... existing code ...
  // 监听全局事件
  uni.$on('dutyCheckinUpdated', handleCheckinUpdate)
  uni.$on('updateUserInfo', handleUserInfoUpdate)
})

// 处理用户信息更新事件
const handleUserInfoUpdate = (userInfo) => {
  if (userInfo.userName) {
    currentUserName.value = userInfo.userName
  }
  // 当用户名字更新时，重新加载值班表数据（为了显示更新的名字）
  try {
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData) {
      dutyScheduleData.value = storedData
      console.log('[管理值日表] 用户名字已更新，重新加载值班表数据')
    }
  } catch (e) {}
}

// 处理打卡更新事件
const handleCheckinUpdate = (checkinData) => {
  console.log('收到打卡更新事件:', checkinData)
  
  // 重新加载值日表数据
  try {
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData) {
      dutyScheduleData.value = storedData
      
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
</style>


