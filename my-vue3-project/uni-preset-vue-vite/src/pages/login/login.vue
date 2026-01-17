<template>
  <view class="login-container">
    <!-- 背景渐变 -->
    <view class="bg-gradient"></view>
    
    <!-- 登录表单卡片 -->
    <view class="login-card">
      <!-- Logo和标题 -->
      <view class="login-header">
        <view class="logo">
          <image class="logo-image" src="/static/user-avatar.png" mode="aspectFit"></image>
        </view>
        <text class="welcome-text">欢迎回来</text>
        <text class="subtitle">请登录您的账户</text>
      </view>

      <!-- 登录表单 -->
      <form class="login-form">
                 <view class="form-group">
           <text class="form-label">用户名</text>
           <view class="input-wrapper" :class="{ 'error': usernameError }">
             <text class="input-icon">👤</text>
             <input 
               class="form-input" 
               type="text" 
               v-model="formData.username" 
               placeholder="请输入用户名" 
               placeholder-class="placeholder"
               @focus="clearError('username')"
               @blur="validateUsername"
             />
           </view>
           <text v-if="usernameError" class="error-message">{{ usernameError }}</text>
         </view>

         <view class="form-group">
           <text class="form-label">密码</text>
           <view class="input-wrapper" :class="{ 'error': passwordError }">
             <text class="input-icon">🔒</text>
             <input 
               class="form-input" 
               type="password" 
               v-model="formData.password" 
               placeholder="请输入密码" 
               placeholder-class="placeholder"
               @focus="clearError('password')"
               @blur="validatePassword"
             />
           </view>
           <text v-if="passwordError" class="error-message">{{ passwordError }}</text>
         </view>

         <!-- 记住我和忘记密码 -->
         <view class="form-options">
           <view class="remember-me">
             <checkbox 
               :checked="formData.rememberMe" 
               @change="toggleRememberMe"
               color="#88d8a3"
               style="transform: scale(0.8);"
             />
             <text class="remember-text">记住我</text>
           </view>
           <text class="forgot-link" @tap="handleForgotPassword">忘记密码？</text>
         </view>

        <button 
          class="login-btn" 
          type="button"
          :disabled="loading"
          :loading="loading"
          @tap="handleLogin"
        >
           {{ loading ? '登录中...' : '登录' }}
         </button>
      </form>

      


      <!-- 注册入口 -->
      <view class="footer-text">
        <text class="footer-desc">还没有账户？</text>
        <text class="register-link" @tap="handleRegister">立即注册</text>
      </view>
    </view>

    <!-- 加载提示 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-content">
        <text class="loading-text">登录中...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
// import { login, saveLoginInfo } from '@/api/auth.js' // 后端API已删除

// 响应式数据
const loading = ref(false)
const usernameError = ref('')
const passwordError = ref('')

const formData = reactive({
  username: '',
  password: '',
  rememberMe: false
})

// 页面加载时检查登录状态
onMounted(() => {
  // 可以在这里添加自动登录逻辑
  console.log('登录页面已加载')
})

// 表单验证
const validateUsername = () => {
  if (!formData.username.trim()) {
    usernameError.value = '请输入用户名'
    return false
  }
  if (formData.username.trim().length < 3) {
    usernameError.value = '用户名至少3个字符'
    return false
  }
  usernameError.value = ''
  return true
}

const validatePassword = () => {
  if (!formData.password.trim()) {
    passwordError.value = '请输入密码'
    return false
  }
  if (formData.password.trim().length < 6) {
    passwordError.value = '密码至少6个字符'
    return false
  }
  passwordError.value = ''
  return true
}

const clearError = (field) => {
  if (field === 'username') {
    usernameError.value = ''
  } else if (field === 'password') {
    passwordError.value = ''
  }
}

// 登录处理
const handleLogin = async () => {
  console.log('[login] click login button')
  // 验证表单
  const isUsernameValid = validateUsername()
  const isPasswordValid = validatePassword()
  
  if (!isUsernameValid || !isPasswordValid) {
    return
  }

  loading.value = true
  
  try {
    // 调用登录API - 后端API已删除，使用模拟数据
    // const result = await login(formData)
    const result = {
      success: true,
      message: '登录成功',
      data: {
        token: 'mock_token_' + Date.now(),
        userInfo: {
          id: 1,
          username: formData.username,
          nickname: formData.username,
          avatar: '/static/user-avatar.png'
        }
      }
    }
    console.log('[login] api result:', result)
    
    if (result.success) {
      // 保存登录信息 - 后端API已删除，使用本地存储
      // saveLoginInfo(result.data)
      uni.setStorageSync('token', result.data.token)
      uni.setStorageSync('userInfo', result.data.userInfo)
      
      // 同时保存到 manager_profile，供管理员首页和我的页面使用
      uni.setStorageSync('manager_profile', {
        userName: result.data.userInfo.username,
        dormitoryNumber: '216', // 默认宿舍号，后续可在我的页面修改
        avatarUrl: result.data.userInfo.avatar || ''
      })
      
      // 显示成功提示
      uni.showToast({
        title: result.message,
        icon: 'success',
        duration: 2000
      })
      
      // 跳转到选择页面
      setTimeout(() => {
        console.log('[login] navigate to select')
        uni.navigateTo({
          url: '/pages/select/select'
        })
      }, 1000)
    } else {
      throw new Error(result.message)
    }
    
  } catch (error) {
    uni.showToast({
      title: error.message || '登录失败，请重试',
      icon: 'error',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

// 忘记密码
const handleForgotPassword = () => {
  uni.showToast({
    title: '忘记密码功能',
    icon: 'none',
    duration: 2000
  })
}


// 记住我切换
const toggleRememberMe = () => {
  formData.rememberMe = !formData.rememberMe
}

// 注册
const handleRegister = () => {
  uni.navigateTo({
    url: '/pages/register/register'
  })
}
</script>

<style lang="scss" scoped>
.login-container {
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

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 50rpx;
  padding: 100rpx 60rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 750rpx;
  position: relative;
}

.login-header {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #a8e6cf, #88d8a3);
  border-radius: 40rpx;
  margin: 0 auto 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-image {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
}

.welcome-text {
  display: block;
  font-size: 56rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  color: #888;
  font-size: 32rpx;
}

.login-form {
  margin-bottom: 60rpx;
}

.form-group {
  margin-bottom: 50rpx;
  position: relative;
}

.form-label {
  display: block;
  color: #555;
  font-size: 28rpx;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.input-wrapper {
  position: relative;
  border: 4rpx solid #e1e5e9;
  border-radius: 30rpx;
  background: #f8f9fa;
  transition: all 0.3s ease;
  
  &.error {
    border-color: #ff6b6b;
    background: #fff5f5;
  }
  
  &:focus-within {
    border-color: #88d8a3;
    box-shadow: 0 0 0 8rpx rgba(136, 216, 163, 0.1);
  }
}

.input-icon {
  position: absolute;
  left: 36rpx;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 36rpx;
  z-index: 1;
}

.form-input {
  width: 100%;
  padding: 36rpx 40rpx 36rpx 100rpx;
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

.error-message {
  color: #ff6b6b;
  font-size: 24rpx;
  margin-top: 10rpx;
  display: block;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 30rpx 0;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.remember-text {
  color: #666;
  font-size: 28rpx;
}

.forgot-link {
  color: #88d8a3;
  font-size: 28rpx;
  text-decoration: none;
}

.login-btn {
  width: 100%;
  padding: 36rpx;
  background: linear-gradient(135deg, #a8e6cf, #88d8a3);
  color: white;
  border: none;
  border-radius: 30rpx;
  font-size: 36rpx;
  font-weight: 600;
  margin-top: 20rpx;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.7;
  }
}




.footer-text {
  text-align: center;
  margin-top: 40rpx;
}

.footer-desc {
  color: #888;
  font-size: 28rpx;
}

.register-link {
  color: #88d8a3;
  font-size: 28rpx;
  font-weight: 500;
  margin-left: 10rpx;
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
  .login-card {
    padding: 80rpx 40rpx;
  }
  
  .welcome-text {
    font-size: 48rpx;
  }
  
  .subtitle {
    font-size: 28rpx;
  }
}
</style>
