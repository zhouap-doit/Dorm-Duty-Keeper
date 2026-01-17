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
          <view class="today-row" v-if="todayIsMine">
            <text class="today-item">今天是你值日，记得哦</text>
          </view>
          <view class="today-row" v-else>
            <text class="today-item"> </text>
          </view>
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

const roomName = ref('301室')
const userName = ref('张三')
const todayIsMine = ref(false)
const active = ref('home')
const uploading = ref(false)
const dutyMode = ref('J') // J人模式或P人模式

// 监听全局事件更新用户信息
const handleUserInfoUpdate = (userInfo) => {
  if (userInfo.userName) {
    userName.value = userInfo.userName
  }
  if (userInfo.dormitoryNumber) {
    roomName.value = userInfo.dormitoryNumber + '室'
  }
}

// 监听成员加入成功事件
const handleMemberJoined = (data) => {
  // 更新用户信息
  if (data.memberName) {
    userName.value = data.memberName
  }
  if (data.dormitoryName) {
    roomName.value = data.dormitoryName + '室'
  }
  
  // 显示加入成功提示
  uni.showToast({
    title: '成功加入宿舍！',
    icon: 'success',
    duration: 3000
  })
  
  // 延迟跳转到成员首页（如果当前不在成员首页）
  setTimeout(() => {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage.route !== 'pages/member-home/member-home') {
      uni.reLaunch({ url: '/pages/member-home/member-home' })
    }
  }, 2000)
}

onMounted(() => {
  try {
    // 从缓存中加载用户信息
    const cache = uni.getStorageSync('member_profile')
    if (cache && typeof cache === 'object') {
      if (cache.userName) userName.value = cache.userName
      if (cache.dormitoryNumber) roomName.value = cache.dormitoryNumber + '室'
    }
    
    // ... existing code ...
    // 加载值日模式
    const mode = uni.getStorageSync('duty_mode')
    if (mode) {
      dutyMode.value = mode
      console.log('[成员页面] 读取管理人员设置的值日模式:', mode)
    }
    // 检查管理人员是否已创建值日表
    const dutyData = uni.getStorageSync('duty_schedule_data')
    if (dutyData) {
      console.log('[成员页面] 读取管理人员创建的值日表数据:', dutyData)
      console.log('[成员页面] 值日模式:', dutyData.mode)
      console.log('[成员页面] 排班类型:', dutyData.scheduleType)
      console.log('[成员页面] 成员列表:', dutyData.members)
    } else {
      console.log('[成员页面] 警告：管理人员还没有创建值日表')
    }
    // 计算今日提醒（仅J人模式）
    if (dutyMode.value === 'J') {
      updateTodayReminder()
    } else {
      todayIsMine.value = false
    }
    
    // 检查是否有加入成功的标志
    const joinSuccess = uni.getStorageSync('member_join_success')
    if (joinSuccess && joinSuccess.timestamp) {
      // 检查时间戳，如果是最近5分钟内的，则显示成功提示
      const now = Date.now()
      if (now - joinSuccess.timestamp < 5 * 60 * 1000) {
        // 更新用户信息
        if (joinSuccess.memberName) {
          userName.value = joinSuccess.memberName
        }
        if (joinSuccess.dormitoryName) {
          roomName.value = joinSuccess.dormitoryName + '室'
        }
        
        // 显示成功提示
        uni.showToast({
          title: '成功加入宿舍！',
          icon: 'success',
          duration: 3000
        })
        
        // 清除标志
        uni.removeStorageSync('member_join_success')
      }
    }
  } catch (e) {}
  
  // 监听全局事件
  uni.$on('updateUserInfo', handleUserInfoUpdate)
  uni.$on('memberJoinedSuccessfully', handleMemberJoined)
  uni.$on('dutyCheckinUpdated', () => { if (dutyMode.value==='J') updateTodayReminder() })
  
  // 【重要】监听管理人员的宿舍名更新事件
  uni.$on('dormitoryNameUpdated', (data) => {
    console.log('[成员首页] 宿舍名符已更新:', data.oldName, '->', data.newName)
    roomName.value = data.newName + '室'
  })
  
  // 【重要】监听管理人员的值班表更新事件（localStorage 跨标签页事件）
  uni.$on('dutyScheduleStorageUpdated', (newData) => {
    console.log('[成员首页] 收到值班表更新事件:', newData)
    dutyMode.value = newData.mode
    // 页面内容会自动根据 dutyMode 的变化重新渲染
    if (dutyMode.value === 'J') {
      updateTodayReminder()
    } else {
      todayIsMine.value = false
    }
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
  uni.$off('dutyCheckinUpdated', () => {})
  uni.$off('dormitoryNameUpdated')  // 【重要】移除宿舍名更新事件监听
  uni.$off('dutyScheduleStorageUpdated')  // 【重要】移除值班表更新事件监听
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

const goHome = () => { active.value = 'home' }
const goDutyTable = () => { uni.navigateTo({ url: '/pages/member-duty-table/member-duty-table' }) }
const goMine = () => { uni.navigateTo({ url: '/pages/member-mine/member-mine' }) }

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
</style>


