<template>
  <view class="invite-container">
    <view class="bg-gradient"></view>

    <view class="invite-card">
      <!-- 标题栏 -->
      <view class="header">
        <view class="header-left" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="title">邀请成员</text>
        <view class="header-right"></view>
      </view>

      <!-- 宿舍信息 -->
      <view class="dormitory-info">
        <view class="info-card">
          <text class="info-title">宿舍信息</text>
          <view class="info-content">
            <view class="info-item">
              <text class="info-label">宿舍名称</text>
              <text class="info-value">{{ dormitoryName }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">宿舍长</text>
              <text class="info-value">{{ managerName }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">值日模式</text>
              <text class="info-value">{{ dutyMode }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 邀请方式 -->
      <view class="invite-methods">
        <text class="section-title">邀请方式</text>
        
        <!-- 微信分享 -->
        <view class="method-card" @tap="shareToWechat">
          <view class="method-icon">💬</view>
          <view class="method-info">
            <text class="method-title">微信分享</text>
            <text class="method-desc">分享给微信好友或群聊</text>
          </view>
          <text class="method-arrow">›</text>
        </view>

        <!-- 复制邀请链接 -->
        <view class="method-card" @tap="copyInviteLink">
          <view class="method-icon">🔗</view>
          <view class="method-info">
            <text class="method-title">复制邀请链接</text>
            <text class="method-desc">复制链接发送给朋友</text>
          </view>
          <text class="method-arrow">›</text>
        </view>

        <!-- 生成邀请码 -->
        <view class="method-card" @tap="generateInviteCode">
          <view class="method-icon">🔢</view>
          <view class="method-info">
            <text class="method-title">生成邀请码</text>
            <text class="method-desc">生成专属邀请码</text>
          </view>
          <text class="method-arrow">›</text>
        </view>
      </view>

      <!-- 邀请记录 -->
      <view class="invite-history">
        <text class="section-title">邀请记录</text>
        <view v-if="inviteHistory.length === 0" class="empty-state">
          <text class="empty-text">暂无邀请记录</text>
        </view>
        <view v-else class="history-list">
          <view 
            v-for="(record, index) in inviteHistory" 
            :key="index"
            class="history-item"
          >
            <view class="history-info">
              <text class="invite-method">{{ record.method }}</text>
              <text class="invite-time">{{ formatTime(record.time) }}</text>
            </view>
            <view class="history-status">
              <text class="status-text" :class="record.status">{{ getStatusText(record.status) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请码弹窗 -->
    <view v-if="showInviteCode" class="modal-mask" @tap="closeInviteCode">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">邀请码</text>
          <text class="modal-close" @tap="closeInviteCode">×</text>
        </view>
        <view class="modal-body">
          <view class="invite-code-display">
            <text class="code-text">{{ inviteCode }}</text>
          </view>
          <text class="code-hint">将此邀请码分享给朋友，他们可以通过输入邀请码加入宿舍</text>
          <button class="copy-code-btn" @tap="copyInviteCode">复制邀请码</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 响应式数据
const dormitoryName = ref('')
const managerName = ref('')
const dutyMode = ref('')
const inviteHistory = ref([])
const showInviteCode = ref(false)
const inviteCode = ref('')

// 页面加载时
onMounted(() => {
  loadData()
})

// 加载数据
const loadData = () => {
  try {
    // 加载宿舍信息
    const dormitoryInfo = uni.getStorageSync('dormitory_info')
    if (dormitoryInfo) {
      dormitoryName.value = dormitoryInfo.dormitoryName || ''
    }
    
    const managerProfile = uni.getStorageSync('manager_profile')
    if (managerProfile) {
      managerName.value = managerProfile.userName || ''
    }
    
    const mode = uni.getStorageSync('duty_mode')
    dutyMode.value = mode === 'J' ? 'J人模式' : 'P人模式'
    
    // 加载邀请记录
    const history = uni.getStorageSync('invite_history') || []
    inviteHistory.value = history
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

// 格式化时间
const formatTime = (timeString) => {
  const date = new Date(timeString)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  }
  return statusMap[status] || '未知'
}

// 微信分享
const shareToWechat = () => {
  // 模拟微信分享
  uni.showActionSheet({
    itemList: ['分享给朋友', '分享到群聊'],
    success: (res) => {
      const shareType = res.tapIndex === 0 ? '分享给朋友' : '分享到群聊'
      
      // 记录邀请
      recordInvite('微信分享', shareType)
      
      uni.showToast({ 
        title: '分享成功', 
        icon: 'success' 
      })
    }
  })
}

// 复制邀请链接
const copyInviteLink = () => {
  const inviteLink = `https://dormitory-app.com/invite?dormitory=${dormitoryName.value}&code=${generateCode()}`
  
  // 模拟复制到剪贴板
  uni.setClipboardData({
    data: inviteLink,
    success: () => {
      // 记录邀请
      recordInvite('复制链接', '邀请链接')
      
      uni.showToast({ 
        title: '链接已复制', 
        icon: 'success' 
      })
    }
  })
}

// 生成邀请码
const generateInviteCode = () => {
  inviteCode.value = generateCode()
  showInviteCode.value = true
  
  // 记录邀请
  recordInvite('生成邀请码', inviteCode.value)
}

// 复制邀请码
const copyInviteCode = () => {
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => {
      uni.showToast({ 
        title: '邀请码已复制', 
        icon: 'success' 
      })
    }
  })
}

// 关闭邀请码弹窗
const closeInviteCode = () => {
  showInviteCode.value = false
}

// 生成邀请码
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 记录邀请
const recordInvite = (method, detail) => {
  const record = {
    method: method,
    detail: detail,
    time: new Date().toISOString(),
    status: 'pending'
  }
  
  inviteHistory.value.unshift(record)
  
  // 保存到本地存储
  try {
    uni.setStorageSync('invite_history', inviteHistory.value)
  } catch (e) {
    console.error('保存邀请记录失败:', e)
  }
}

// 返回
const goBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.invite-container {
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

.invite-card {
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

.dormitory-info {
  margin-bottom: 40rpx;
}

.info-card {
  background: #f8f9fa;
  border-radius: 24rpx;
  padding: 32rpx;
  border: 4rpx solid #e1e5e9;
}

.info-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.invite-methods {
  margin-bottom: 40rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

.method-card {
  background: #f8f9fa;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 16rpx;
  border: 4rpx solid #e1e5e9;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  
  &:active {
    background: #f0f0f0;
    transform: scale(0.98);
  }
}

.method-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
}

.method-info {
  flex: 1;
}

.method-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.method-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
}

.method-arrow {
  font-size: 32rpx;
  color: #999;
}

.invite-history {
  margin-bottom: 40rpx;
}

.history-list {
  background: #f8f9fa;
  border-radius: 24rpx;
  overflow: hidden;
  border: 4rpx solid #e1e5e9;
}

.history-item {
  padding: 32rpx;
  border-bottom: 2rpx solid #eef2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
}

.history-info {
  flex: 1;
}

.invite-method {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
}

.invite-time {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.history-status {
  margin-left: 24rpx;
}

.status-text {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  
  &.pending {
    background: #fff3cd;
    color: #856404;
  }
  
  &.approved {
    background: #d4edda;
    color: #155724;
  }
  
  &.rejected {
    background: #f8d7da;
    color: #721c24;
  }
}

.empty-state {
  text-align: center;
  padding: 80rpx;
}

.empty-text {
  color: #999;
  font-size: 28rpx;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 80%;
  max-width: 600rpx;
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  padding: 32rpx;
  border-bottom: 2rpx solid #eef2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  padding: 32rpx;
  text-align: center;
}

.invite-code-display {
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 40rpx;
  margin-bottom: 24rpx;
  border: 4rpx solid #e1e5e9;
}

.code-text {
  font-size: 48rpx;
  font-weight: 700;
  color: #333;
  letter-spacing: 8rpx;
}

.code-hint {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
  margin-bottom: 32rpx;
}

.copy-code-btn {
  width: 100%;
  padding: 24rpx 0;
  background: linear-gradient(135deg, #a8e6cf, #88d8a3);
  color: #333;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  border-radius: 20rpx;
}

/* 响应式适配 */
@media screen and (max-width: 750rpx) {
  .invite-card {
    padding: 30rpx;
  }
  
  .method-card {
    padding: 24rpx;
  }
  
  .method-icon {
    font-size: 40rpx;
    margin-right: 20rpx;
  }
  
  .method-title {
    font-size: 28rpx;
  }
  
  .method-desc {
    font-size: 24rpx;
  }
}
</style>
