<template>
  <view class="select-container">
    <!-- 背景渐变 -->
    <view class="bg-gradient"></view>
    
    <!-- 选择卡片 -->
    <view class="select-card">
      <!-- 欢迎信息区 -->
      <view class="welcome-section">
        <text class="welcome-title">欢迎使用值日小程序</text>
        <text class="welcome-subtitle">请选择以下方式开始你的值日之旅</text>
      </view>

      <!-- 选择按钮区域 -->
      <view class="options-section">
        <!-- 创建宿舍按钮 -->
        <view class="option-button" @tap="handleCreateDormitory">
          <view class="button-circle">
            <text class="button-text">创建宿舍</text>
          </view>
        </view>

        <!-- 加入宿舍按钮 -->
        <view class="option-button" @tap="handleJoinDormitory">
          <view class="button-circle">
            <text class="button-text">加入宿舍</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载提示 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-content">
        <text class="loading-text">处理中...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 响应式数据
const loading = ref(false)

// 页面加载时
onMounted(() => {
  console.log('选择页面已加载')
})

// 创建宿舍
const handleCreateDormitory = () => {
  uni.navigateTo({
    url: '/pages/create-dormitory/create-dormitory'
  })
}

// 加入宿舍
const handleJoinDormitory = () => {
  uni.navigateTo({
    url: '/pages/join-method/join-method'
  })
}
</script>

<style lang="scss" scoped>
.select-container {
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

.select-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 50rpx;
  padding: 80rpx 60rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 750rpx;
  position: relative;
}

.welcome-section {
  background: #f8f9fa;
  border-radius: 30rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  margin-bottom: 80rpx;
}

.welcome-title {
  display: block;
  font-size: 48rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.welcome-subtitle {
  display: block;
  color: #666;
  font-size: 28rpx;
  line-height: 1.4;
}

.options-section {
  display: flex;
  flex-direction: column;
  gap: 60rpx;
  align-items: center;
}

.option-button {
  width: 100%;
  display: flex;
  justify-content: center;
}

.button-circle {
  width: 400rpx;
  height: 400rpx;
  background: #f8f9fa;
  border: 4rpx solid #333;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.95);
    background: #e9ecef;
  }
}

.button-text {
  font-size: 36rpx;
  font-weight: 500;
  color: #333;
  text-align: center;
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
  .select-card {
    padding: 60rpx 40rpx;
  }
  
  .welcome-title {
    font-size: 42rpx;
  }
  
  .welcome-subtitle {
    font-size: 26rpx;
  }
  
  .button-circle {
    width: 350rpx;
    height: 350rpx;
  }
  
  .button-text {
    font-size: 32rpx;
  }
}
</style>
