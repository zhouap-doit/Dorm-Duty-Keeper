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
        <!-- 成员版不显示重新排班按钮 -->
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
      <view class="nav-item" :class="{ active: currentPage === 'home' }" @tap="goHome">
        <text class="nav-icon">🏠</text>
        <text class="nav-text">首页</text>
      </view>
      <view class="nav-item" :class="{ active: currentPage === 'duty' }" @tap="goMe">
        <text class="nav-icon">📋</text>
        <text class="nav-text">值日表</text>
      </view>
      <view class="nav-item" :class="{ active: currentPage === 'mine' }" @tap="goMine">
        <text class="nav-icon">👤</text>
        <text class="nav-text">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 响应式数据
const viewOnlyMe = ref(false)
const currentDisplayDate = ref(new Date())
const currentUserName = ref('张三') // 当前用户名
const currentPage = ref('duty') // 当前页面标识

// 计算当前显示月份
const currentDisplayMonth = computed(() => {
  const year = currentDisplayDate.value.getFullYear()
  const month = currentDisplayDate.value.getMonth() + 1
  return `${year}年${month}月`
})

// 生成日历数据
const calendarDays = computed(() => {
  const year = currentDisplayDate.value.getFullYear()
  const month = currentDisplayDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDay = firstDay.getDay()

  const days = []
  
  // 添加空白日期
  for (let i = 0; i < startDay; i++) {
    days.push({ day: '', date: null })
  }
  
  // 添加月份日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dutyData = getDutyDataForDate(dateStr)
    const checkinData = getCheckinDataForDate(dateStr)
    
    days.push({
      day,
      date: dateStr,
      dutyPerson: dutyData?.person,
      checkinPerson: checkinData?.person
    })
  }
  
  return days
})

// 获取指定日期的值日数据
const getDutyDataForDate = (dateStr) => {
  try {
    const dutyData = uni.getStorageSync('duty_schedule_data')
    if (!dutyData) {
      console.log(`[成员值日表] 未找到duty_schedule_data`)
      return null
    }
    
    console.log(`[成员值日表] 查询日期 ${dateStr}，dutyData结构:`, {
      hasSchedule: !!dutyData.schedule,
      scheduleType: typeof dutyData.schedule,
      hasGeneratedMonths: !!dutyData.generatedMonths
    })
    
    // 查找对应日期的值日安排
    if (dutyData.schedule && Array.isArray(dutyData.schedule)) {
      for (const item of dutyData.schedule) {
        // item 可能是 [date, person] 或 {date, person}
        const itemDate = Array.isArray(item) ? item[0] : item.date
        const itemPerson = Array.isArray(item) ? item[1] : item.person
        
        if (itemDate === dateStr && itemPerson) {
          console.log(`[成员值日表] 找到值日数据:`, { date: itemDate, person: itemPerson })
          return { person: itemPerson }
        }
      }
    }
    
    // 查找生成月份数据
    if (dutyData.generatedMonths && Array.isArray(dutyData.generatedMonths)) {
      for (const monthData of dutyData.generatedMonths) {
        if (monthData.cells && Array.isArray(monthData.cells)) {
          for (const cell of monthData.cells) {
            if (cell.date === dateStr && cell.title) {
              console.log(`[成员值日表] 从generatedMonths找到值日数据:`, { date: cell.date, person: cell.title })
              return { person: cell.title }
            }
          }
        }
      }
    }
    
    return null
  } catch (e) {
    console.error(`[成员值日表] getDutyDataForDate错误:`, e)
    return null
  }
}

// 计算当前模式（P 或 J）
const dutyMode = computed(() => {
  try {
    const dutyData = uni.getStorageSync('duty_schedule_data')
    return dutyData?.mode || 'J'
  } catch (e) {
    return 'J'
  }
})

// 获取指定日期的打卡数据
const getCheckinDataForDate = (dateStr) => {
  try {
    const dutyData = uni.getStorageSync('duty_schedule_data')
    if (!dutyData || !dutyData.checkins) return null
    
    const checkinData = dutyData.checkins.find(([date]) => date === dateStr)
    if (checkinData && checkinData.length > 1) {
      return { person: checkinData[1] }
    }
    
    return null
  } catch (e) {
    return null
  }
}

// 判断日期是否在值日范围内
const isInDutyRange = (dateStr) => {
  try {
    const dutyData = uni.getStorageSync('duty_schedule_data')
    if (!dutyData) return false
    
    const startDate = dutyData.startDate
    const endDate = dutyData.endDate
    
    if (!startDate || !endDate) return false
    
    return dateStr >= startDate && dateStr <= endDate
  } catch (e) {
    return false
  }
}

// 切换查看模式
const toggleViewMode = () => {
  viewOnlyMe.value = !viewOnlyMe.value
}

// 月份导航
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

// 点击日期
const onDayClick = (day) => {
  if (!day.date || !day.checkinPerson) return
  
  // 在P人模式下，显示上传的照片和描述
  try {
    const dutyData = uni.getStorageSync('duty_schedule_data')
    if (dutyData && dutyData.mode === 'P') {
      showDayDetails(day)
    }
  } catch (e) {}
}

// 显示日期详情
const showDayDetails = (day) => {
  try {
    const dutyData = uni.getStorageSync('duty_schedule_data')
    const checkins = dutyData?.checkins || []
    const checkinData = checkins.find(([date]) => date === day.date)
    
    if (checkinData && checkinData.length > 2) {
      const [date, person, images, description] = checkinData
      
      uni.showModal({
        title: `${date} 值日详情`,
        content: `值日人员：${person}\n描述：${description || '无描述'}`,
        showCancel: false,
        confirmText: '查看照片',
        success: (res) => {
          if (res.confirm && images && images.length > 0) {
            uni.previewImage({
              urls: images,
              current: images[0]
            })
          }
        }
      })
    } else {
      uni.showToast({
        title: `${day.date} 已打卡`,
        icon: 'none',
        duration: 2000
      })
    }
  } catch (e) {
    uni.showToast({
      title: `${day.date} 已打卡`,
      icon: 'none',
      duration: 2000
    })
  }
}

// 监听全局事件更新用户信息
const handleUserInfoUpdate = (userInfo) => {
  if (userInfo.userName) {
    currentUserName.value = userInfo.userName
  }
  // 当用户名字更新时，重新加载值班表数据（为了显示更新的名字）
  try {
    const dutyData = uni.getStorageSync('duty_schedule_data')
    console.log('[成员值日表] 用户名字已更新，重新加载值班表数据:', dutyData)
  } catch (e) {}
}

// 监听成员加入成功事件
const handleMemberJoined = (data) => {
  // 更新用户信息
  if (data.memberName) {
    currentUserName.value = data.memberName
  }
  
  // 显示加入成功提示
  uni.showToast({
    title: '成功加入宿舍！',
    icon: 'success',
    duration: 3000
  })
  
  // 延迟跳转到成员首页
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/member-home/member-home' })
  }, 2000)
}

// 页面加载时
onMounted(() => {
  // 加载当前用户信息
  try {
    const memberProfile = uni.getStorageSync('member_profile')
    if (memberProfile && memberProfile.userName) {
      currentUserName.value = memberProfile.userName
    }
    
    // 【重要】打印逻辑：检查是否有值班表数据
    const dutyData = uni.getStorageSync('duty_schedule_data')
    console.log('[成员值日表页] onMounted - 值班表数据:', dutyData)
    
    // ... existing code ...
    
    // 检查是否有加入成功的标志
    const joinSuccess = uni.getStorageSync('member_join_success')
    if (joinSuccess && joinSuccess.timestamp) {
      // 检查时间戳，如果是最近5分钟内的，则显示成功提示
      const now = Date.now()
      if (now - joinSuccess.timestamp < 5 * 60 * 1000) {
        // 更新用户信息
        if (joinSuccess.memberName) {
          currentUserName.value = joinSuccess.memberName
        }
        
        // 显示成功提示
        uni.showToast({
          title: '成功加入宿舍！',
          icon: 'success',
          duration: 3000
        })
        
        // 清除标志
        uni.removeStorageSync('member_join_success')
        
        // 延迟跳转到成员首页
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/member-home/member-home' })
        }, 2000)
      }
    }
  } catch (e) {}
  
  // 监听全局事件
  uni.$on('updateUserInfo', handleUserInfoUpdate)
  uni.$on('memberJoinedSuccessfully', handleMemberJoined)
  
  // 【重要】监听管理人员的值班表更新事件
  uni.$on('dutyScheduleStorageUpdated', (newData) => {
    console.log('[成员值日表页] 收到值班表更新事件:', newData)
    // 触发日历重新计算（自动）以渲染最新数据
    currentDisplayDate.value = new Date(currentDisplayDate.value)  // 触发响应式更新
    uni.showToast({
      title: '宿舍长更新了值班表，已同步',
      icon: 'success',
      duration: 2000
    })
  })
})

onUnmounted(() => {
  // 移除事件监听
  uni.$off('updateUserInfo', handleUserInfoUpdate)
  uni.$off('memberJoinedSuccessfully', handleMemberJoined)
  uni.$off('dutyScheduleStorageUpdated')  // 【重要】移除值班表更新事件监听
})

// ... existing code ...
const goHome = () => { 
  uni.navigateTo({ url: '/pages/member-home/member-home' }) 
}
const goMe = () => { /* 当前页 */ }
const goMine = () => { 
  uni.navigateTo({ url: '/pages/member-mine/member-mine' }) 
}
</script>

<style scoped lang="scss">
.page-container {
  min-height: 100vh;
  position: relative;
  padding: 40rpx;
  padding-bottom: 140rpx;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.bg-gradient {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%);
  z-index: -1;
}

.content-card {
  width: 100%;
  max-width: 750rpx;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50rpx;
  padding: 40rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 40rpx;
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

.month-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
  flex: 1;
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
  font-size: 20rpx;
  font-weight: 500;
  padding: 6rpx 0;
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
  color: #333; 
}

.nav-icon { 
  display: block; 
  font-size: 44rpx; 
  line-height: 1; 
}

.nav-text { 
  display: block; 
  font-size: 24rpx; 
  margin-top: 6rpx; 
}

/* 响应式适配 */
@media screen and (max-width: 750rpx) {
  .content-card {
    padding: 30rpx;
  }
}
</style>