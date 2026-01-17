<template>
  <view class="mine-container">
    <view class="bg-gradient"></view>

    <view class="mine-card">
      <!-- 用户信息区域 -->
      <view class="user-section">
        <view class="user-info">
          <view class="avatar" @tap="isEditing ? chooseAvatar() : null">
            <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill"></image>
            <image v-else class="avatar-img" src="/static/user-avatar.png" mode="aspectFill"></image>
          </view>
          <view class="user-details" v-if="!isEditing">
            <text class="user-name">{{ userName }}</text>
            <text class="user-role">{{ userRole }}</text>
            <text class="user-dormitory">宿舍 : {{ dormitoryNumber }}</text>
          </view>
          <view class="user-details edit" v-else>
            <input class="edit-input" v-model="editNickname" placeholder="请输入昵称" placeholder-class="placeholder" />
            <view class="edit-hint">的人信息不支持修改宿舍名称</view>
          </view>
          <view class="edit-icon" v-if="!isEditing" @tap="startEdit">
            <text class="edit-text">✏️</text>
          </view>
          <view class="edit-actions" v-else>
            <view class="edit-btn-row">
              <button class="save-btn" @tap="saveEdit">保存</button>
              <button class="cancel-btn" @tap="cancelEdit">取消</button>
            </view>
          </view>
        </view>
      </view>

      <!-- 其他 -->
      <view class="section">
        <text class="section-title">其他</text>
        <view class="option-list">
          <view class="option-item" @tap="openFeedback">
            <text class="option-text">帮助与反馈</text>
          </view>
          <view class="option-item" @tap="logout">
            <text class="option-text">退出登录</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部导航栏 -->
    <view class="bottom-nav">
      <view class="nav-item" :class="{ active: currentPage === 'home' }" @tap="goHome">
        <text class="nav-icon">🏠</text>
        <text class="nav-text">首页</text>
      </view>
      <view class="nav-item" :class="{ active: currentPage === 'duty' }" @tap="goDuty">
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
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase.js'

// 用户信息
const userName = ref('')
const userRole = ref('')
const dormitoryNumber = ref('')
const avatarUrl = ref('')
const isEditing = ref(false)
const editNickname = ref('')
const editDorm = ref('')
const currentPage = ref('mine') // 当前页面标识
const pageUserId = ref('') // Session 守卫：记录页面打开时的用户ID

onMounted(async () => {
  try {
    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    pageUserId.value = user.id // 锁定页面最初登录的用户ID

    // 2. 尝试从专属缓存加载
    const cached = uni.getStorageSync(`user_info_${user.id}`)
    if (cached) {
      userName.value = cached.userName || ''
      dormitoryNumber.value = cached.roomName?.replace('室', '') || ''
    }

    // 3. 从云端加载最新信息并严格校验角色
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, role, dormitories(name, duty_mode)')
      .eq('id', user.id)
      .single()

    if (profile) {
      // 【权限核实】如果是管理员误入成员页，踢出去
      if (profile.role === 'manager') {
        uni.reLaunch({ url: '/pages/manager-home/manager-home' })
        return
      }

      userName.value = profile.username || '成员'
      dormitoryNumber.value = profile.dormitories?.name || ''
      
      // 更新该用户的专属缓存
      uni.setStorageSync(`user_info_${user.id}`, {
        userName: userName.value,
        roomName: dormitoryNumber.value + '室'
      })
    }
  } catch (e) {
    console.error('加载成员信息失败:', e)
  }
  
  // 监听全局事件更新用户信息
  uni.$on('updateUserInfo', handleUserInfoUpdate)
})

const handleUserInfoUpdate = (userInfo) => {
  if (userInfo.userName) userName.value = userInfo.userName
  if (userInfo.dormitoryNumber) dormitoryNumber.value = userInfo.dormitoryNumber
}

onUnmounted(() => {
  // 移除事件监听
  uni.$off('updateUserInfo', handleUserInfoUpdate)
  uni.$off('memberJoinedSuccessfully', handleMemberJoined)
  uni.$off('dutyScheduleStorageUpdated')  // 【重要】移除值班表更新事件监听
})

// 进入编辑
const startEdit = () => {
  editNickname.value = userName.value
  // 不会龍戒编辑宿舍名称
  isEditing.value = true
}

// 选择头像
const chooseAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      if (res.tempFilePaths && res.tempFilePaths.length) {
        avatarUrl.value = res.tempFilePaths[0]
      }
    }
  })
}

// 保存编辑
const saveEdit = () => {
  if (!editNickname.value.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  const oldName = userName.value
  const newName = editNickname.value.trim()
  userName.value = newName
  // 不修改 dormitoryNumber
  isEditing.value = false
  try {
    uni.setStorageSync('member_profile', {
      userName: userName.value,
      dormitoryNumber: dormitoryNumber.value,
      avatarUrl: avatarUrl.value
    })
    
    // 【重要】同时更新值班表数据中的名字
    const dutyData = uni.getStorageSync('duty_schedule_data')
    if (dutyData) {
      // 更新 schedule 数组中的名字
      if (dutyData.schedule && Array.isArray(dutyData.schedule)) {
        dutyData.schedule = dutyData.schedule.map(([date, person]) => {
          return [date, person === oldName ? newName : person]
        })
      }
      
      // 更新 generatedMonths 中的名字
      if (dutyData.generatedMonths && Array.isArray(dutyData.generatedMonths)) {
        dutyData.generatedMonths.forEach(monthData => {
          if (monthData.cells && Array.isArray(monthData.cells)) {
            monthData.cells.forEach(cell => {
              if (cell.title === oldName) {
                cell.title = newName
              }
            })
          }
        })
      }
      
      // 更新 members 列表中的名字
      if (dutyData.members && Array.isArray(dutyData.members)) {
        dutyData.members = dutyData.members.map(name => name === oldName ? newName : name)
      }
      
      // 更新 checkins 中的名字
      if (dutyData.checkins && Array.isArray(dutyData.checkins)) {
        dutyData.checkins = dutyData.checkins.map(([date, person, ...rest]) => {
          return [date, person === oldName ? newName : person, ...rest]
        })
      }
      
      uni.setStorageSync('duty_schedule_data', dutyData)
    }
    
    // 触发全局事件，通知其他页面更新用户信息
    uni.$emit('updateUserInfo', {
      userName: userName.value,
      dormitoryNumber: dormitoryNumber.value,
      avatarUrl: avatarUrl.value
    })
  } catch (e) {}
  uni.showToast({ title: '保存成功', icon: 'success' })
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
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
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const target = profile?.role === 'manager' ? '/pages/manager-home/manager-home' : '/pages/member-home/member-home'
  uni.reLaunch({ url: target })
}
const goDuty = async () => { 
  if (!(await checkSession())) return
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const target = profile?.role === 'manager' ? '/pages/manager-duty-table/manager-duty-table' : '/pages/member-duty-table/member-duty-table'
  uni.reLaunch({ url: target })
}
const goMine = () => { /* 当前页 */ }
const openFeedback = () => { 
  uni.navigateTo({ url: '/pages/help-feedback/help-feedback' })
}
// 退出登录
const logout = async () => {
  uni.showModal({
    title: '确认退出',
    content: '是否退出登录？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await supabase.auth.signOut()
          
          // 清空所有用户信息相关的缓存
          const keys = uni.getStorageInfoSync().keys
          keys.forEach(key => {
            if (key.startsWith('user_info_') || key.startsWith('schedule_data_') || key === 'userInfo') {
              uni.removeStorageSync(key)
            }
          })

          uni.showToast({ title: '已退出登录', icon: 'success' })
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/login' })
          }, 1000)
        } catch (e) {
          uni.reLaunch({ url: '/pages/login/login' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.mine-container { min-height: 100vh; position: relative; padding: 40rpx; padding-bottom: 140rpx; }
.bg-gradient { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%); z-index: -1; }
.mine-card { width: 100%; background: rgba(255,255,255,.95); border-radius: 50rpx; padding: 40rpx; box-shadow: 0 50rpx 100rpx rgba(0,0,0,.15); box-sizing: border-box; }
.user-section { background: #f8f9fa; border-radius: 50rpx; padding: 30rpx; margin-bottom: 30rpx; border: 4rpx solid #e1e5e9; }
.user-info { display: flex; align-items: center; gap: 30rpx; }
.avatar { width: 120rpx; height: 120rpx; background: #e9ecef; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img { width: 120rpx; height: 120rpx; border-radius: 50%; }
.user-details { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.user-details.edit { gap: 12rpx; }
.edit-input { width: 100%; padding: 24rpx 28rpx; border: 4rpx solid #e1e5e9; border-radius: 24rpx; background:#fff; font-size: 28rpx; color:#333; }
.placeholder { color:#999; }
.edit-hint { color:#888; font-size: 24rpx; }
.edit-actions { margin-left: 12rpx; }
.edit-btn-row { display:flex; gap: 12rpx; }
.save-btn { background: linear-gradient(135deg, #a8e6cf, #88d8a3); color:#fff; border:none; border-radius: 24rpx; padding: 16rpx 28rpx; font-size: 28rpx; }
.cancel-btn { background:#fff; color:#333; border: 2rpx solid #e1e5e9; border-radius: 24rpx; padding: 16rpx 28rpx; font-size: 28rpx; }
.user-name { font-size: 40rpx; font-weight: 700; color: #333; }
.user-role { font-size: 28rpx; color: #666; }
.user-dormitory { font-size: 28rpx; color: #666; }
.edit-icon { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.edit-text { font-size: 32rpx; }
.section { margin-bottom: 24rpx; }
.section-title { display: block; font-size: 32rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.option-list { background: #f8f9fa; border-radius: 50rpx; overflow: hidden; border: 4rpx solid #e1e5e9; }
.option-item { padding: 28rpx 32rpx; border-bottom: 2rpx solid #eef2f5; display: flex; flex-direction: column; gap: 8rpx; transition: background-color 0.2s ease; }
.option-item:last-child { border-bottom: none; }
.option-item:active { background-color: #f8f9fa; }
.option-text { font-size: 32rpx; color: #333; font-weight: 500; }
.bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; height: 120rpx; background: #f2f2f2; border-top: 2rpx solid #e5e5e5; display: flex; align-items: center; padding-bottom: constant(safe-area-inset-bottom); padding-bottom: env(safe-area-inset-bottom); z-index: 10; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8rpx 0; color: #666; }
.nav-item.active { color: #333; }
.nav-icon { font-size: 44rpx; line-height: 1; }
.nav-text { font-size: 24rpx; margin-top: 6rpx; }
</style>


