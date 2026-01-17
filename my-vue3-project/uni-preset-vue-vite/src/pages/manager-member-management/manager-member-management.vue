<template>
  <view class="management-container">
    <view class="bg-gradient"></view>

    <view class="management-card">
      <!-- 标题栏 -->
      <view class="header">
        <view class="header-left" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="title">成员管理</text>
        <view class="header-right"></view>
      </view>

      <!-- 统计信息 -->
      <view class="stats-section">
        <view class="stat-item">
          <text class="stat-number">{{ memberList.length }}</text>
          <text class="stat-label">总成员</text>
        </view>
        <view class="stat-item">
          <text class="stat-number">{{ pendingApplications.length }}</text>
          <text class="stat-label">待审核</text>
        </view>
      </view>

      <!-- 待审核申请 -->
      <view v-if="pendingApplications.length > 0" class="section">
        <text class="section-title">待审核申请</text>
        <view class="application-list">
          <view 
            v-for="(application, index) in pendingApplications" 
            :key="index"
            class="application-item"
          >
            <view class="application-info">
              <text class="applicant-name">{{ application.memberName }}</text>
              <text class="dormitory-name">申请加入：{{ application.dormitoryName }}</text>
              <text v-if="application.applyReason" class="apply-reason">{{ application.applyReason }}</text>
              <text class="apply-time">{{ formatTime(application.applyTime) }}</text>
            </view>
            <view class="application-actions">
              <button class="approve-btn" @tap="approveApplication(index)">同意</button>
              <button class="reject-btn" @tap="rejectApplication(index)">拒绝</button>
            </view>
          </view>
        </view>
      </view>

      <!-- 成员列表 -->
      <view class="section">
        <text class="section-title">宿舍成员</text>
        <view v-if="memberList.length === 0" class="empty-state">
          <text class="empty-text">暂无成员</text>
        </view>
        <view v-else class="member-list">
          <view 
            v-for="(member, index) in memberList" 
            :key="index"
            class="member-item"
          >
            <view class="member-info">
              <view class="member-avatar">
                <text class="avatar-text">{{ member.name.charAt(0) }}</text>
              </view>
              <view class="member-details">
                <text class="member-name">{{ member.name }}</text>
                <text class="member-role">{{ member.role }}</text>
                <text class="join-time">加入时间：{{ formatTime(member.joinTime) }}</text>
              </view>
            </view>
            <view class="member-actions">
              <button 
                v-if="member.role !== '宿舍长'"
                class="remove-btn" 
                @tap="removeMember(index)"
              >
                移除
              </button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 响应式数据
const memberList = ref([])
const pendingApplications = ref([])

// 页面加载时
onMounted(() => {
  loadData()
})

// 加载数据
const loadData = () => {
  try {
    // 加载成员列表
    const members = uni.getStorageSync('dormitory_members') || []
    memberList.value = members
    
    // 加载待审核申请
    const applications = uni.getStorageSync('dormitory_applications') || []
    pendingApplications.value = applications.filter(app => app.status === 'pending')
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

// 格式化时间
const formatTime = (timeString) => {
  const date = new Date(timeString)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 同意申请
const approveApplication = (index) => {
  const application = pendingApplications.value[index]
  
  uni.showModal({
    title: '确认同意',
    content: `确定同意 ${application.memberName} 加入宿舍吗？`,
    success: (res) => {
      if (res.confirm) {
        // 添加到成员列表
        const newMember = {
          name: application.memberName,
          role: '成员',
          joinTime: new Date().toISOString()
        }
        
        memberList.value.push(newMember)
        
        // 更新申请状态
        application.status = 'approved'
        
        // 不在管理端写 member_profile，也不设置 member_join_success，由成员端自行检测
        
        // 保存数据
        saveData()
        
        // 移除待审核列表
        pendingApplications.value.splice(index, 1)
        
        uni.showToast({ title: '已同意申请', icon: 'success' })
        
        // 模拟发送消息给申请人
        showMemberMessage(application.memberName, '您的申请已通过，欢迎加入宿舍！')

        // 注意：不在管理人员端跳转到成员页面。仅设置成功标志，由成员端轮询检测并跳转。
      }
    }
  })
}

// 拒绝申请
const rejectApplication = (index) => {
  const application = pendingApplications.value[index]
  
  uni.showModal({
    title: '确认拒绝',
    content: `确定拒绝 ${application.memberName} 的申请吗？`,
    success: (res) => {
      if (res.confirm) {
        // 更新申请状态
        application.status = 'rejected'
        
        // 保存数据
        saveData()
        
        // 移除待审核列表
        pendingApplications.value.splice(index, 1)
        
        uni.showToast({ title: '已拒绝申请', icon: 'success' })
        
        // 模拟发送消息给申请人
        showMemberMessage(application.memberName, '很抱歉，您的申请被拒绝了。')
      }
    }
  })
}

// 移除成员
const removeMember = (index) => {
  const member = memberList.value[index]
  
  uni.showModal({
    title: '确认移除',
    content: `确定要移除成员 ${member.name} 吗？`,
    success: (res) => {
      if (res.confirm) {
        // 移除成员
        memberList.value.splice(index, 1)
        
        // 保存数据
        saveData()
        
        uni.showToast({ title: '已移除成员', icon: 'success' })
        
        // 模拟发送消息给被移除的成员
        showMemberMessage(member.name, '你已被管理人员删除')
      }
    }
  })
}

// 保存数据
const saveData = () => {
  try {
    uni.setStorageSync('dormitory_members', memberList.value)
    
    // 更新申请状态
    const allApplications = uni.getStorageSync('dormitory_applications') || []
    const updatedApplications = allApplications.map(app => {
      const pendingApp = pendingApplications.value.find(p => p.memberName === app.memberName && p.applyTime === app.applyTime)
      return pendingApp || app
    })
    uni.setStorageSync('dormitory_applications', updatedApplications)
  } catch (e) {
    console.error('保存数据失败:', e)
  }
}

// 显示成员消息（模拟）
const showMemberMessage = (memberName, message) => {
  // 这里应该调用后端API发送消息
  console.log(`发送消息给 ${memberName}: ${message}`)
  
  // 模拟显示消息
  uni.showToast({ 
    title: `已通知${memberName}`, 
    icon: 'none',
    duration: 2000
  })
}

// 返回
const goBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.management-container {
  min-height: 100vh;
  position: relative;
  padding: 40rpx;
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

.management-card {
  width: 100%;
  max-width: 750rpx;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 50rpx;
  padding: 40rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.header-left {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #333;
  font-weight: bold;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
}

.header-right {
  width: 80rpx;
}

.stats-section {
  display: flex;
  gap: 40rpx;
  margin-bottom: 40rpx;
}

.stat-item {
  flex: 1;
  background: #f8f9fa;
  border-radius: 24rpx;
  padding: 32rpx;
  text-align: center;
  border: 4rpx solid #e1e5e9;
}

.stat-number {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.section {
  margin-bottom: 40rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

.application-list {
  background: #f8f9fa;
  border-radius: 24rpx;
  overflow: hidden;
  border: 4rpx solid #e1e5e9;
}

.application-item {
  padding: 32rpx;
  border-bottom: 2rpx solid #eef2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
}

.application-info {
  flex: 1;
}

.applicant-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.dormitory-name {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.apply-reason {
  display: block;
  font-size: 24rpx;
  color: #888;
  margin-bottom: 8rpx;
}

.apply-time {
  display: block;
  font-size: 22rpx;
  color: #999;
}

.application-actions {
  display: flex;
  gap: 16rpx;
}

.approve-btn {
  padding: 16rpx 24rpx;
  background: #88d8a3;
  color: #333;
  font-size: 24rpx;
  border: none;
  border-radius: 16rpx;
}

.reject-btn {
  padding: 16rpx 24rpx;
  background: #ff6b6b;
  color: white;
  font-size: 24rpx;
  border: none;
  border-radius: 16rpx;
}

.member-list {
  background: #f8f9fa;
  border-radius: 24rpx;
  overflow: hidden;
  border: 4rpx solid #e1e5e9;
}

.member-item {
  padding: 32rpx;
  border-bottom: 2rpx solid #eef2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
}

.member-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.member-avatar {
  width: 80rpx;
  height: 80rpx;
  background: #88d8a3;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

.member-details {
  flex: 1;
}

.member-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.member-role {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.join-time {
  display: block;
  font-size: 22rpx;
  color: #999;
}

.member-actions {
  margin-left: 24rpx;
}

.remove-btn {
  padding: 16rpx 24rpx;
  background: #ff6b6b;
  color: white;
  font-size: 24rpx;
  border: none;
  border-radius: 16rpx;
}

.empty-state {
  text-align: center;
  padding: 80rpx;
}

.empty-text {
  color: #999;
  font-size: 28rpx;
}

/* 响应式适配 */
@media screen and (max-width: 750rpx) {
  .management-card {
    padding: 30rpx;
  }
  
  .stats-section {
    gap: 20rpx;
  }
  
  .stat-item {
    padding: 24rpx;
  }
  
  .stat-number {
    font-size: 40rpx;
  }
}
</style>
