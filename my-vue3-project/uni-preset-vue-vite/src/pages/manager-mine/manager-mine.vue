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

// 用户信息
const userName = ref('张三')
const userRole = ref('宿舍长')
const dormitoryNumber = ref('301')
const currentDutyMode = ref('J人模式')
const avatarUrl = ref('')
const isEditing = ref(false)
const editNickname = ref('')
const editDorm = ref('')

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

onMounted(() => {
  try {
    const cache = uni.getStorageSync('manager_profile')
    if (cache && typeof cache === 'object') {
      if (cache.userName) userName.value = cache.userName
      if (cache.dormitoryNumber) dormitoryNumber.value = cache.dormitoryNumber
      if (cache.avatarUrl) avatarUrl.value = cache.avatarUrl
    }
    const mode = uni.getStorageSync('duty_mode')
    if (mode === 'J') currentDutyMode.value = 'J人模式'
    if (mode === 'P') currentDutyMode.value = 'P人模式'
  } catch (e) {}
  
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
const saveEdit = () => {
  if (!editNickname.value.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  if (!editDorm.value.trim()) {
    uni.showToast({ title: '请输入宿舍名称', icon: 'none' })
    return
  }
  const oldName = userName.value
  const oldDorm = dormitoryNumber.value
  const newName = editNickname.value.trim()
  const newDorm = editDorm.value.trim()
  userName.value = newName
  dormitoryNumber.value = newDorm
  isEditing.value = false
  try {
    uni.setStorageSync('manager_profile', {
      userName: userName.value,
      dormitoryNumber: dormitoryNumber.value,
      avatarUrl: avatarUrl.value
    })
    
    // 【重要】同时更新值班表数据中的名字和宿舍名称
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
    
    // 【重要】发送两个事件：一个是用户信息更新，一个是宿舍名符更新
    uni.$emit('updateUserInfo', {
      userName: userName.value,
      dormitoryNumber: dormitoryNumber.value,
      avatarUrl: avatarUrl.value
    })
    
    // 【重要】当宿舍名改变时，同时更新成员的 member_profile
    if (oldDorm !== newDorm) {
      // 如果当前设备上有成员信息（成员已经加入），也需要更新
      const memberProfile = uni.getStorageSync('member_profile')
      if (memberProfile && memberProfile.dormitoryNumber === oldDorm) {
        memberProfile.dormitoryNumber = newDorm
        uni.setStorageSync('member_profile', memberProfile)
        console.log('[管理人员我的] 已更新成员信息的宿舍名: ', oldDorm, '->', newDorm)
      }
      
      // 发送宿舍名更新事件，让所有页面同斶更新
      uni.$emit('dormitoryNameUpdated', {
        oldName: oldDorm,
        newName: newDorm
      })
      console.log('[管理人员我的] 宿舍名已更新:', oldDorm, '->', newDorm)
    }
  } catch (e) {}
  uni.showToast({ title: '保存成功', icon: 'success' })
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
}

// 转让宿舍长
const transferHead = () => {
  try {
    // 读取成员列表（不包含当前宿舍长）
    const members = uni.getStorageSync('dormitory_members') || []
    const candidates = members.filter(m => m.role !== '宿舍长')
    if (!candidates.length) {
      uni.showToast({ title: '暂无可转让的成员', icon: 'none' })
      return
    }

    // 弹出选择成员的操作表
    uni.showActionSheet({
      itemList: candidates.map(m => m.name),
      success: (res) => {
        const selected = candidates[res.tapIndex]

        uni.showModal({
          title: '确认转让',
          content: `确定将宿舍长转让给 ${selected.name} 吗？`,
          success: (confirmRes) => {
            if (!confirmRes.confirm) return

            // 交换角色：所选成员 → 宿舍长；当前管理人员 → 成员
            const allMembers = [...members]
            const selectedIdx = allMembers.findIndex(m => m.name === selected.name)
            // 确保当前管理人员也在列表中
            let currentIdx = allMembers.findIndex(m => m.name === userName.value)
            if (currentIdx === -1) {
              allMembers.push({ name: userName.value, role: '宿舍长', joinTime: new Date().toISOString() })
              currentIdx = allMembers.length - 1
            }
            // 设置角色
            allMembers[selectedIdx].role = '宿舍长'
            allMembers[currentIdx].role = '成员'

            // 更新存储的成员列表
            uni.setStorageSync('dormitory_members', allMembers)

            // 读取并交换本地资料
            const oldManager = uni.getStorageSync('manager_profile') || {}
            const memberProfile = uni.getStorageSync('member_profile') || {}

            // 新宿舍长资料（沿用宿舍信息，替换姓名）
            const newManagerProfile = {
              userName: selected.name,
              dormitoryNumber: oldManager.dormitoryNumber || memberProfile.dormitoryNumber || dormitoryNumber.value,
              avatarUrl: oldManager.avatarUrl || ''
            }
            // 原宿舍长变成员
            const newMemberProfile = {
              userName: userName.value,
              dormitoryNumber: newManagerProfile.dormitoryNumber,
              avatarUrl: memberProfile.avatarUrl || ''
            }

            uni.setStorageSync('manager_profile', newManagerProfile)
            uni.setStorageSync('member_profile', newMemberProfile)

            // 通知其他页面用户信息变化
            uni.$emit('updateUserInfo', {
              userName: newManagerProfile.userName,
              dormitoryNumber: newManagerProfile.dormitoryNumber,
              avatarUrl: newManagerProfile.avatarUrl
            })

            // 当前设备持有人原本是宿舍长，转让后应显示“成员”页面
            uni.showToast({ title: '转让成功', icon: 'success' })
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/member-home/member-home' })
            }, 1200)
          }
        })
      }
    })
  } catch (e) {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}

// 设置值日模式
const setDutyMode = () => {
  uni.showActionSheet({
    itemList: ['J人模式', 'P人模式'],
    success: (res) => {
      const modes = ['J人模式', 'P人模式']
      currentDutyMode.value = modes[res.tapIndex]
      uni.showToast({ title: '模式已切换', icon: 'success' })
      try {
        const code = currentDutyMode.value.startsWith('J') ? 'J' : 'P'
        uni.setStorageSync('duty_mode', code)
      } catch (e) {}
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
const logout = () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已退出登录', icon: 'success' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/login/login' })
        }, 1500)
      }
    }
  })
}

// 页面卸载时清理事件监听
onUnmounted(() => {
  uni.$off('updateUserInfo', handleUserInfoUpdate)
})

// 导航方法
const goHome = () => { 
  uni.navigateTo({ url: '/pages/manager-home/manager-home' })
}
const goDutyTable = () => { 
  uni.navigateTo({ url: '/pages/manager-duty-table/manager-duty-table' })
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


