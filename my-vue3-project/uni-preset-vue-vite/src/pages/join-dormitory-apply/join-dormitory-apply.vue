<template>
  <view class="apply-container">
    <view class="bg-gradient"></view>

    <view class="apply-card">
      <!-- 标题 -->
      <view class="header">
        <text class="title">申请加入宿舍</text>
        <text class="subtitle">输入宿舍名称申请加入</text>
      </view>

      <!-- 申请表单 -->
      <view class="form-section">
        <view class="input-group">
          <text class="label">宿舍名称</text>
          <input 
            class="input" 
            type="text"
            v-model="dormitoryName" 
            placeholder="请输入要加入的宿舍名称" 
            placeholder-class="placeholder"
            maxlength="20"
            @input="onDormitoryNameInput"
          />
        </view>

        <view class="input-group">
          <text class="label">您的昵称</text>
          <input 
            class="input" 
            type="text"
            v-model="memberName" 
            placeholder="请输入您的昵称" 
            placeholder-class="placeholder"
            maxlength="10"
            @input="onMemberNameInput"
          />
        </view>

        <view class="input-group">
          <text class="label">申请理由（可选）</text>
          <textarea 
            class="textarea" 
            v-model="applyReason" 
            placeholder="请输入申请理由，让宿舍长更好地了解您" 
            placeholder-class="placeholder"
            maxlength="100"
            @input="onApplyReasonInput"
          />
        </view>
      </view>


      <!-- 提交按钮 -->
      <view class="submit-section">
        <button 
          class="submit-btn" 
          :disabled="!canSubmit" 
          :class="{disabled: !canSubmit}" 
          @tap="submitApply"
        >
          提交申请
        </button>
        <text class="hint">提交后等待宿舍长审核</text>
      </view>
    </view>

    <!-- 加载遮罩 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-content">
        <text class="loading-text">提交中...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 响应式数据
const dormitoryName = ref('')
const memberName = ref('')
const applyReason = ref('')
const loading = ref(false)

let approvalTimer = null

// 页面加载时
onMounted(() => {
  // 获取URL参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  
  if (options.dormitoryName) {
    dormitoryName.value = decodeURIComponent(options.dormitoryName)
  }
  // 启动轮询检查审批结果，仅在本申请者维度检测
  approvalTimer = setInterval(checkApprovedAndEnter, 2000)
})

onUnmounted(() => {
  if (approvalTimer) clearInterval(approvalTimer)
})

// 计算属性：是否可以提交
const canSubmit = computed(() => {
  return dormitoryName.value.trim() && memberName.value.trim()
})

// 输入事件处理
const onDormitoryNameInput = (e) => {
  dormitoryName.value = e.detail.value
}

const onMemberNameInput = (e) => {
  memberName.value = e.detail.value
}

const onApplyReasonInput = (e) => {
  applyReason.value = e.detail.value
}

// 检测审批并跳转
const checkApprovedAndEnter = () => {
  try {
    const apps = uni.getStorageSync('dormitory_applications') || []
    const approved = apps.find(a => a.memberName === memberName.value.trim() && a.dormitoryName === dormitoryName.value.trim() && a.status === 'approved')
    if (approved) {
      const profile = uni.getStorageSync('member_profile') || {}
      profile.userName = approved.memberName
      profile.dormitoryNumber = approved.dormitoryName
      uni.setStorageSync('member_profile', profile)
      uni.showToast({ title: '申请已通过', icon: 'success' })
      clearInterval(approvalTimer)
      approvalTimer = null
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/member-home/member-home' })
      }, 800)
    }
  } catch(e) { /* no-op */ }
}

// 提交申请
const submitApply = async () => {
  // 验证表单数据
  if (!dormitoryName.value.trim()) {
    uni.showToast({ title: '请输入宿舍名称', icon: 'none' })
    return
  }
  
  if (!memberName.value.trim()) {
    uni.showToast({ title: '请输入您的昵称', icon: 'none' })
    return
  }
  
  // 验证宿舍名称长度
  if (dormitoryName.value.trim().length < 2) {
    uni.showToast({ title: '宿舍名称至少2个字符', icon: 'none' })
    return
  }
  
  // 验证昵称长度
  if (memberName.value.trim().length < 2) {
    uni.showToast({ title: '昵称至少2个字符', icon: 'none' })
    return
  }

  loading.value = true

  try {
    // 模拟提交申请（实际需要调用后端API）
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 保存申请信息到本地存储（模拟）
    const applyData = {
      dormitoryName: dormitoryName.value.trim(),
      memberName: memberName.value.trim(),
      applyReason: applyReason.value.trim(),
      applyTime: new Date().toISOString(),
      status: 'pending' // pending, approved, rejected
    }
    
    // 获取现有申请列表
    let applications = []
    try {
      applications = uni.getStorageSync('dormitory_applications') || []
    } catch (e) {
      console.error('获取申请列表失败:', e)
    }
    
    applications.push(applyData)
    uni.setStorageSync('dormitory_applications', applications)
    
    // 注意：这里只是保存申请，实际加入需要管理人员同意
    // 管理人员同意后，会更新成员资料中的宿舍名称
    
    console.log('申请数据已保存:', applyData)
    
    uni.showToast({ 
      title: '申请已提交，等待宿舍长审核', 
      icon: 'success',
      duration: 2000
    })
    
    setTimeout(() => {
      // 返回选择页面
      uni.navigateBack()
    }, 2000)
    
  } catch (error) {
    console.error('提交申请失败:', error)
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.apply-container {
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  -webkit-tap-highlight-color: transparent;
}

.bg-gradient {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%);
  z-index: -1;
  pointer-events: none;
}

.apply-card {
  width: 100%;
  max-width: 750rpx;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 50rpx;
  padding: 60rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.form-section {
  margin-bottom: 60rpx;
}

.input-group {
  margin-bottom: 40rpx;
}

.label {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 32rpx;
  background: #ffffff;
  border: 2rpx solid #e1e5e9;
  border-radius: 12rpx;
  font-size: 30rpx;
  color: #333333;
  box-sizing: border-box;
  outline: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  user-select: text;
  transition: border-color 0.3s ease;
  line-height: 80rpx;
  
  &:focus {
    border-color: #88d8a3;
    background: #ffffff;
  }
  
  &:active {
    border-color: #88d8a3;
    background: #ffffff;
  }
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx 32rpx;
  background: #ffffff;
  border: 2rpx solid #e1e5e9;
  border-radius: 12rpx;
  font-size: 30rpx;
  color: #333333;
  box-sizing: border-box;
  resize: none;
  outline: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  user-select: text;
  transition: border-color 0.3s ease;
  
  &:focus {
    border-color: #88d8a3;
    background: #ffffff;
  }
  
  &:active {
    border-color: #88d8a3;
    background: #ffffff;
  }
}

.placeholder {
  color: #999;
}


.submit-section {
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 32rpx 0;
  background: linear-gradient(135deg, #a8e6cf, #88d8a3);
  color: #333;
  font-size: 36rpx;
  font-weight: 600;
  border: none;
  border-radius: 30rpx;
  margin-bottom: 20rpx;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
  
  &.disabled {
    opacity: 0.6;
    background: #e9ecef;
    color: #999;
  }
}

.hint {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.loading-mask {
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

.loading-content {
  background: white;
  padding: 60rpx;
  border-radius: 20rpx;
  text-align: center;
}

.loading-text {
  color: #333;
  font-size: 32rpx;
}

/* 响应式适配 */
@media screen and (max-width: 750rpx) {
  .apply-card {
    padding: 40rpx;
  }
  
  .title {
    font-size: 42rpx;
  }
  
  .subtitle {
    font-size: 26rpx;
  }
}
</style>
