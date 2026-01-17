<template>
  <view class="create-container">
    <!-- ==================== 背景层 ==================== -->
    <view class="bg-gradient"></view>
    
    <!-- ==================== 主要内容卡片 ==================== -->
    <view class="create-card">
      <!-- 页面标题区域 -->
      <view class="page-header">
        <text class="page-title">基本信息设置</text>
      </view>

      <!-- ==================== 表单输入区域 ==================== -->
      <view class="input-section">
        <!-- 宿舍名称输入 -->
        <view class="form-group">
          <text class="form-label">宿舍名称</text>
          <view class="input-wrapper">
            <input 
              class="form-input" 
              type="text" 
              v-model="formData.dormitoryName" 
              placeholder="请输入宿舍名称" 
              placeholder-class="placeholder"
            />
          </view>
        </view>
      </view>

      <!-- ==================== 值日模式选择区域 ==================== -->
      <view class="mode-section">
        <text class="section-title">模式选择</text>
        
        <view class="mode-cards">
          <!-- J人模式：计划型，喜欢规律排班 -->
          <view 
            class="mode-card" 
            :class="{ 'selected': formData.selectedMode === 'J' }"
            @tap="selectMode('J')"
          >
            <text class="mode-title">J人模式</text>
            <text class="mode-desc">计划型, 喜欢规律排班</text>
          </view>

          <!-- P人模式：灵活型，自由安排值日 -->
          <view 
            class="mode-card" 
            :class="{ 'selected': formData.selectedMode === 'P' }"
            @tap="selectMode('P')"
          >
            <text class="mode-title">P人模式</text>
            <text class="mode-desc">灵活型, 自由安排值日</text>
          </view>
        </view>
      </view>

      <!-- ==================== 操作按钮区域 ==================== -->
      <view class="action-section">
        <button 
          class="create-btn" 
          @tap="handleCreateDormitory"
          :disabled="loading || !isFormValid"
          :loading="loading"
        >
          {{ loading ? '创建中...' : '创建宿舍' }}
        </button>
      </view>
    </view>

    <!-- ==================== 加载遮罩层 ==================== -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-content">
        <text class="loading-text">创建中...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

// ==================== 响应式数据 ====================
/**
 * 页面加载状态
 */
const loading = ref(false)

/**
 * 表单数据
 * - dormitoryName: 宿舍名称
 * - userNickname: 用户昵称
 * - selectedMode: 选择的值日模式 ('J' 或 'P')
 */
const formData = reactive({
  dormitoryName: '',
  selectedMode: ''
})

// ==================== 计算属性 ====================
/**
 * 表单验证：检查所有必填项是否已填写
 * @returns {boolean} 表单是否有效
 */
const isFormValid = computed(() => {
  return formData.dormitoryName.trim() && 
         formData.selectedMode
})

// ==================== 业务方法 ====================
/**
 * 选择值日模式
 * @param {string} mode - 模式类型：'J' (计划型) 或 'P' (灵活型)
 */
const selectMode = (mode) => {
  formData.selectedMode = mode
}

/**
 * 保存宿舍相关数据到本地存储
 * 包括：值日模式、宿舍信息、管理人员信息
 * 同时清空旧的排班数据
 */
const saveDormitoryData = () => {
  try {
    // 1. 保存值日模式（J人模式或P人模式）
    uni.setStorageSync('duty_mode', formData.selectedMode)
    
    // 2. 保存宿舍基本信息
    const dormitoryInfo = {
      dormitoryName: formData.dormitoryName.trim(),
      createTime: new Date().toISOString()
    }
    uni.setStorageSync('dormitory_info', dormitoryInfo)
    
    // 3. 保存管理人员信息（使用注册时的用户名）
    const registeredUsername = uni.getStorageSync('registered_username')
    const managerProfile = {
      userName: registeredUsername || '管理员',
      dormitoryNumber: formData.dormitoryName.trim(),
      role: 'manager'
    }
    uni.setStorageSync('manager_profile', managerProfile)
    
    // 4. 清空旧的排班信息，确保新创建的宿舍没有历史排班数据
    uni.removeStorageSync('duty_schedule_data')
    
  } catch (error) {
    console.error('保存宿舍信息失败:', error)
    throw error
  }
}

/**
 * 创建宿舍主流程
 * 1. 表单验证
 * 2. 显示加载状态
 * 3. 模拟API调用（实际项目中应替换为真实API）
 * 4. 保存数据到本地存储
 * 5. 显示成功提示
 * 6. 跳转到管理人员首页
 */
const handleCreateDormitory = async () => {
  // 步骤1: 表单验证
  if (!isFormValid.value) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none',
      duration: 2000
    })
    return
  }

  // 步骤2: 设置加载状态
  loading.value = true
  
  try {
    // 步骤3: 模拟API调用（实际项目中应替换为真实的创建宿舍API）
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 步骤4: 保存数据到本地存储
    saveDormitoryData()
    
    // 步骤5: 显示成功提示
    uni.showToast({ 
      title: '宿舍创建成功', 
      icon: 'success', 
      duration: 1200 
    })
    
    // 步骤6: 跳转到管理人员首页
    // 注意：使用 navigateTo 进行页面跳转
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/manager-home/manager-home' })
    }, 1200)
    
  } catch (error) {
    // 错误处理
    console.error('创建宿舍失败:', error)
    uni.showToast({
      title: '创建失败，请重试',
      icon: 'error',
      duration: 2000
    })
  } finally {
    // 无论成功或失败，都要关闭加载状态
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.create-container {
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
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

.create-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 50rpx;
  padding: 80rpx 60rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 750rpx;
  position: relative;
}

.page-header {
  text-align: center;
  margin-bottom: 80rpx;
}

.page-title {
  font-size: 56rpx;
  font-weight: 600;
  color: #333;
}

.input-section {
  margin-bottom: 60rpx;
}

.form-group {
  margin-bottom: 50rpx;
}

.form-label {
  display: block;
  color: #555;
  font-size: 32rpx;
  font-weight: 500;
  margin-bottom: 20rpx;
}

.input-wrapper {
  border: 4rpx solid #e1e5e9;
  border-radius: 30rpx;
  background: #f8f9fa;
  transition: all 0.3s ease;
  
  &:focus-within {
    border-color: #88d8a3;
    box-shadow: 0 0 0 8rpx rgba(136, 216, 163, 0.1);
  }
}

.form-input {
  width: 100%;
  padding: 36rpx 40rpx;
  border: none;
  border-radius: 30rpx;
  font-size: 32rpx;
  background: transparent;
  color: #333;
  
  &:focus {
    outline: none;
  }
}

.placeholder {
  color: #999;
}

.mode-section {
  margin-bottom: 80rpx;
}

.section-title {
  display: block;
  font-size: 48rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 40rpx;
  text-align: center;
}

.mode-cards {
  display: flex;
  gap: 30rpx;
  justify-content: center;
}

.mode-card {
  flex: 1;
  background: #f8f9fa;
  border: 4rpx solid #e1e5e9;
  border-radius: 30rpx;
  padding: 40rpx 30rpx;
  text-align: center;
  transition: all 0.3s ease;
  
  &.selected {
    border-color: #88d8a3;
    background: rgba(136, 216, 163, 0.1);
    box-shadow: 0 0 0 8rpx rgba(136, 216, 163, 0.1);
  }
  
  &:active {
    transform: scale(0.98);
  }
}

.mode-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.mode-desc {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.4;
}

.action-section {
  text-align: center;
}

.create-btn {
  width: 100%;
  padding: 36rpx;
  background: #f8f9fa;
  color: #333;
  border: 4rpx solid #e1e5e9;
  border-radius: 30rpx;
  font-size: 36rpx;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.5;
    background: #e9ecef;
  }
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
  .create-card {
    padding: 60rpx 40rpx;
  }
  
  .page-title {
    font-size: 48rpx;
  }
  
  .section-title {
    font-size: 42rpx;
  }
  
  .mode-cards {
    flex-direction: column;
    gap: 20rpx;
  }
  
  .mode-card {
    padding: 30rpx 20rpx;
  }
  
  .mode-title {
    font-size: 32rpx;
  }
  
  .mode-desc {
    font-size: 26rpx;
  }
}
</style>
