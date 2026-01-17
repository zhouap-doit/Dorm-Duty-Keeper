<template>
  <view class="mine-container">
    <view class="bg-gradient"></view>

    <view class="mine-card">

      <!-- 用户信息区域 -->
      <view class="user-section">
        <view class="user-info">
          <view class="avatar" @tap="isEditing ? chooseAvatar() : null">
            <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill"></image>
            <text v-else class="avatar-text">头像</text>
          </view>
          <view class="user-details" v-if="!isEditing">
            <text class="user-name">{{ userName }}</text>
            <text class="user-role">{{ userRole }}</text>
            <text class="user-dormitory">宿舍 : {{ dormitoryNumber }}</text>
          </view>
          <view class="user-details edit" v-else>
            <input class="edit-input" v-model="editNickname" placeholder="请输入昵称" placeholder-class="placeholder" />
            <input class="edit-input" v-model="editDorm" placeholder="请输入宿舍名称" placeholder-class="placeholder" />
            <view class="edit-hint">点击头像可更换头像</view>
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

      <!-- 账户设置 -->
      <view class="section">
        <text class="section-title">账户设置</text>
        <view class="option-list">
          <view class="option-item" @tap="transferHead">
            <text class="option-text">转让宿舍长</text>
          </view>
          <view class="option-item" @tap="setDutyMode">
            <text class="option-text">设置值日模式</text>
            <text class="option-desc">当前 : {{ currentDutyMode }}</text>
          </view>
        </view>
      </view>

      <!-- 宿舍管理 -->
      <view class="section">
        <text class="section-title">宿舍管理</text>
        <view class="option-list">
          <view class="option-item" @tap="manageMembers">
            <text class="option-text">成员管理</text>
          </view>
          <view class="option-item" @tap="inviteMembers">
            <text class="option-text">邀请成员</text>
          </view>
        </view>
      </view>

      <!-- 其他 -->
      <view class="section">
        <text class="section-title">其他</text>
        <view class="option-list">
          <view class="option-item" @tap="helpFeedback">
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
      <view class="nav-item" @tap="goHome">
        <text class="nav-icon-emoji">🏠</text>
        <text class="nav-text">首页</text>
      </view>
      <view class="nav-item" @tap="goDutyTable">
        <text class="nav-icon-emoji">📋</text>
        <text class="nav-text">值日表</text>
      </view>
      <view class="nav-item active" @tap="goMine">
        <text class="nav-icon-emoji">👤</text>
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
const currentDutyMode = ref('J人模式')
const avatarUrl = ref('')
const isEditing = ref(false)
const editNickname = ref('')
const editDorm = ref('')
const pageUserId = ref('') // Session 守卫：记录页面打开时的用户ID

// 监听全局事件更新用户信息
const handleUserInfoUpdate = (userInfo) => {
  if (userInfo.userName) {
    userName.value = userInfo.userName
  }
  if (userInfo.dormitoryNumber) {
    dormitoryNumber.value = userInfo.dormitoryNumber
  }
  if (userInfo.avatarUrl !== undefined) {
    avatarUrl.value = userInfo.avatarUrl
  }
}

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
      // 【权限硬核校验】如果是成员误入管理员页面，踢出去
      if (profile.role !== 'manager') {
        uni.reLaunch({ url: '/pages/member-home/member-home' })
        return
      }

      userName.value = profile.username || '管理员'
      dormitoryNumber.value = profile.dormitories?.name || ''
      const mode = profile.dormitories?.duty_mode || 'J'
      currentDutyMode.value = mode === 'J' ? 'J人模式' : 'P人模式'
      
      // 更新该用户的专属缓存
      uni.setStorageSync(`user_info_${user.id}`, {
        userName: userName.value,
        roomName: dormitoryNumber.value + '室',
        isJMode: (mode === 'J')
      })
    }

    // 监听 Session 变化
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        uni.reLaunch({ url: '/pages/login/login' })
      }
    })
  } catch (e) {
    console.error('加载用户信息失败:', e)
  }
  
  // 监听全局事件更新用户信息
  uni.$on('updateUserInfo', handleUserInfoUpdate)
})

// 进入编辑
const startEdit = () => {
  editNickname.value = userName.value
  editDorm.value = dormitoryNumber.value
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
const saveEdit = async () => {
  if (!editNickname.value.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  if (!editDorm.value.trim()) {
    uni.showToast({ title: '请输入宿舍名称', icon: 'none' })
    return
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newName = editNickname.value.trim()
    const newDorm = editDorm.value.trim()

    // 更新 Supabase profiles 表
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ username: newName })
      .eq('id', user.id)

    if (profileError) throw profileError

    // 更新 Supabase dormitories 表
    const { data: profile } = await supabase
      .from('profiles')
      .select('dormitory_id')
      .eq('id', user.id)
      .single()

    if (profile?.dormitory_id) {
      const { error: dormError } = await supabase
        .from('dormitories')
        .update({ name: newDorm })
        .eq('id', profile.dormitory_id)

      if (dormError) throw dormError
    }

    // 更新本地显示
    userName.value = newName
    dormitoryNumber.value = newDorm
    isEditing.value = false

    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    console.error('保存失败:', e)
    uni.showToast({ title: '保存失败', icon: 'error' })
  }
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
}

// 转让宿舍长
const transferHead = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('dormitory_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dormitory_id) return

    // 查询宿舍成员
    const { data: members } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('dormitory_id', profile.dormitory_id)
      .eq('role', 'member')

    if (!members || members.length === 0) {
      uni.showToast({ title: '暂无可转让的成员', icon: 'none' })
      return
    }

    uni.showActionSheet({
      itemList: members.map(m => m.username),
      success: async (res) => {
        const selected = members[res.tapIndex]

        uni.showModal({
          title: '确认转让',
          content: `确定将宿舍长转让给 ${selected.username} 吗？`,
          success: async (confirmRes) => {
            if (!confirmRes.confirm) return

            try {
              // 调用原子操作函数
              const { error } = await supabase.rpc('transfer_management', {
                old_mgr_id: user.id,
                new_mgr_id: selected.id,
                dorm_id: profile.dormitory_id
              })

              if (error) throw error

              uni.showToast({ title: '转让成功', icon: 'success' })
              setTimeout(() => {
                uni.reLaunch({ url: '/pages/member-home/member-home' })
              }, 1200)
            } catch (error) {
              console.error('转让失败:', error)
              uni.showToast({ title: '操作失败', icon: 'error' })
            }
          }
        })
      }
    })
  } catch (e) {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}

// 设置值日模式
const setDutyMode = async () => {
  uni.showActionSheet({
    itemList: ['J人模式', 'P人模式'],
    success: async (res) => {
      const modes = ['J人模式', 'P人模式']
      const selectedMode = modes[res.tapIndex]
      const code = selectedMode.startsWith('J') ? 'J' : 'P'
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
          .from('profiles')
          .select('dormitory_id')
          .eq('id', user.id)
          .single()

        if (!profile?.dormitory_id) return

        // 1. 更新宿舍的值日模式
        await supabase
          .from('dormitories')
          .update({ duty_mode: code })
          .eq('id', profile.dormitory_id)

        // 2. 清空旧的排班数据
        await supabase
          .from('schedules')
          .delete()
          .eq('dormitory_id', profile.dormitory_id)

        // 3. 同步本地缓存
        uni.setStorageSync('duty_mode', code)
        uni.removeStorageSync('duty_schedule_data')
        
        currentDutyMode.value = selectedMode
        uni.showToast({ 
          title: `已切换为${selectedMode}，请重新设置排班`, 
          icon: 'success',
          duration: 2500
        })
      } catch (e) {
        console.error('切换模式失败:', e)
        uni.showToast({ title: '切换失败', icon: 'error' })
      }
    }
  })
}


// 成员管理
const manageMembers = () => {
  uni.navigateTo({ url: '/pages/manager-member-management/manager-member-management' })
}

// 邀请成员
const inviteMembers = () => {
  uni.navigateTo({ url: '/pages/manager-invite-member/manager-invite-member' })
}

// 帮助与反馈
const helpFeedback = () => {
  uni.navigateTo({ url: '/pages/help-feedback/help-feedback' })
}

// 退出登录
const logout = async () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          // 1. 调用 Supabase 退出
          await supabase.auth.signOut()
          
          // 2. 清空所有用户信息相关的缓存（非常重要！）
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

// 页面卸载时清理事件监听
onUnmounted(() => {
  uni.$off('updateUserInfo', handleUserInfoUpdate)
})

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
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const target = profile?.role === 'manager' ? '/pages/manager-home/manager-home' : '/pages/member-home/member-home'
  uni.reLaunch({ url: target })
}
const goDutyTable = async () => { 
  if (!(await checkSession())) return
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const target = profile?.role === 'manager' ? '/pages/manager-duty-table/manager-duty-table' : '/pages/member-duty-table/member-duty-table'
  uni.reLaunch({ url: target })
}
const goMine = () => { 
  // 当前页，无需跳转
}
</script>

<style lang="scss" scoped>
.mine-container { min-height: 100vh; position: relative; display:flex; align-items:center; justify-content:center; padding: 40rpx; padding-bottom: 140rpx; }
.bg-gradient { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%); z-index: -1; }
.mine-card { width: 100%; max-width: 750rpx; background: rgba(255,255,255,.95); border-radius: 50rpx; padding: 40rpx; box-shadow: 0 50rpx 100rpx rgba(0,0,0,.15); box-sizing: border-box; }
.user-section { background: #f8f9fa; border-radius: 30rpx; padding: 30rpx; margin-bottom: 30rpx; border: 4rpx solid #e1e5e9; }
.user-info { display: flex; align-items: center; gap: 30rpx; }
.avatar { width: 120rpx; height: 120rpx; background: #e9ecef; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-img { width: 120rpx; height: 120rpx; border-radius: 50%; }
.avatar-text { color: white; font-size: 24rpx; font-weight: 500; }
.user-details { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.user-details.edit { gap: 12rpx; }
.edit-input { width: 100%; padding: 24rpx 28rpx; border: 4rpx solid #e1e5e9; border-radius: 24rpx; background:#fff; font-size: 28rpx; color:#333; }
.placeholder { color:#999; }
.edit-hint { color:#888; font-size: 24rpx; }
.edit-actions { margin-left: 12rpx; }
.edit-btn { background: linear-gradient(135deg, #a8e6cf, #88d8a3); color:#fff; border:none; border-radius: 24rpx; padding: 16rpx 28rpx; font-size: 28rpx; }
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
.option-list { background: #f8f9fa; border-radius: 24rpx; overflow: hidden; border: 4rpx solid #e1e5e9; }
.option-item { padding: 28rpx 32rpx; border-bottom: 2rpx solid #eef2f5; display: flex; flex-direction: column; gap: 8rpx; transition: background-color 0.2s ease; }
.option-item:last-child { border-bottom: none; }
.option-item:active { background-color: #f8f9fa; }
.option-text { font-size: 32rpx; color: #333; font-weight: 500; }
.option-desc { font-size: 24rpx; color: #999; }
.bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; height: 120rpx; background: #f2f2f2; border-top: 2rpx solid #e5e5e5; display: flex; align-items: center; padding-bottom: constant(safe-area-inset-bottom); padding-bottom: env(safe-area-inset-bottom); z-index: 10; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8rpx 0; color: #666; }
.nav-item.active { color: #4CAF50; }
.nav-icon-emoji { display: block; font-size: 44rpx; line-height: 1; }
.nav-text { font-size: 24rpx; margin-top: 6rpx; }
</style>


