<template>
  <view class="register-container">
    <!-- 背景渐变 -->
    <view class="bg-gradient"></view>
    
    <!-- 注册表单卡片 -->
    <view class="register-card">
      <!-- Logo和标题 -->
      <view class="register-header">
        <view class="logo">
          <image class="logo-image" src="@/static/user-avatar.png" mode="aspectFit"></image>
        </view>
        <text class="welcome-text">创建账户</text>
        <text class="subtitle">请填写以下信息完成注册</text>
      </view>

      <!-- 注册表单 -->
      <form class="register-form">
        <view class="form-group">
          <text class="form-label">用户名</text>
          <view class="input-wrapper" :class="{ 'error': usernameError }">
            <text class="input-icon">👤</text>
            <input 
              class="form-input" 
              type="text" 
              v-model="formData.username" 
              placeholder="用于展示的昵称" 
              placeholder-class="placeholder"
              @focus="clearError('username')"
              @blur="validateUsername"
            />
          </view>
          <text v-if="usernameError" class="error-message">{{ usernameError }}</text>
        </view>

        <view class="form-group">
          <text class="form-label">邮箱</text>
          <view class="input-wrapper" :class="{ 'error': emailError }">
            <text class="input-icon">✉️</text>
            <input 
              class="form-input" 
              type="text" 
              v-model="formData.email" 
              placeholder="请输入邮箱（作为登录账号）" 
              placeholder-class="placeholder"
              @focus="clearError('email')"
            />
          </view>
          <text v-if="emailError" class="error-message">{{ emailError }}</text>
        </view>

        <view class="form-group">
          <text class="form-label">密码</text>
          <view class="input-wrapper" :class="{ 'error': passwordError }">
            <text class="input-icon">🔒</text>
            <input 
              class="form-input" 
              type="password" 
              v-model="formData.password" 
              placeholder="请输入密码（至少6个字符）" 
              placeholder-class="placeholder"
              @focus="clearError('password')"
              @blur="validatePassword"
            />
          </view>
          <text v-if="passwordError" class="error-message">{{ passwordError }}</text>
        </view>

        <view class="form-group">
          <text class="form-label">确认密码</text>
          <view class="input-wrapper" :class="{ 'error': confirmPasswordError }">
            <text class="input-icon">🔐</text>
            <input 
              class="form-input" 
              type="password" 
              v-model="formData.confirmPassword" 
              placeholder="请再次输入密码" 
              placeholder-class="placeholder"
              @focus="clearError('confirmPassword')"
              @blur="validateConfirmPassword"
            />
          </view>
          <text v-if="confirmPasswordError" class="error-message">{{ confirmPasswordError }}</text>
        </view>

        <!-- 用户协议 -->
        <view class="form-options">
          <view class="agreement">
            <checkbox-group @change="toggleAgreement">
              <label>
                <checkbox 
                  value="agree"
                  :checked="formData.agreeTerms" 
                  color="#88d8a3"
                  style="transform: scale(0.8);"
                />
              </label>
            </checkbox-group>
            <text class="agreement-text">
              我已阅读并同意
              <text class="terms-link" @tap="showTerms">《用户协议》</text>
              和
              <text class="terms-link" @tap="showPrivacy">《隐私政策》</text>
            </text>
          </view>
        </view>

        <button 
          class="register-btn" 
          type="button"
          :disabled="loading || !formData.agreeTerms"
          :loading="loading"
          @tap="handleRegister"
        >
          {{ loading ? '注册中...' : '立即注册' }}
        </button>
      </form>

      <!-- 登录入口 -->
      <view class="login-entry">
        <text class="login-desc">已有账户？</text>
        <text class="login-link" @tap="goToLogin">立即登录</text>
      </view>
    </view>

    <!-- 加载提示 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-content">
        <text class="loading-text">注册中...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '@/utils/supabase.js'

// 响应式数据
const loading = ref(false)
const usernameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')

const formData = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false
})

// 页面加载时检查
onMounted(() => {
  console.log('注册页面已加载')
})

// 表单验证
const validateUsername = () => {
  if (!formData.username.trim()) {
    usernameError.value = '请输入用户名'
    return false
  }
  if (formData.username.trim().length < 2) {
    usernameError.value = '用户名长度不能少于 2 位'
    return false
  }
  if (formData.username.trim().length > 20) {
    usernameError.value = '用户名不能超过20个字符'
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
  if (formData.password.trim().length > 20) {
    passwordError.value = '密码不能超过20个字符'
    return false
  }
  passwordError.value = ''
  return true
}

const validateConfirmPassword = () => {
  if (!formData.confirmPassword.trim()) {
    confirmPasswordError.value = '请确认密码'
    return false
  }
  if (formData.password !== formData.confirmPassword) {
    confirmPasswordError.value = '两次输入的密码不一致'
    return false
  }
  confirmPasswordError.value = ''
  return true
}

const clearError = (field) => {
  switch (field) {
    case 'username':
      usernameError.value = ''
      break
    case 'email':
      emailError.value = ''
      break
    case 'password':
      passwordError.value = ''
      break
    case 'confirmPassword':
      confirmPasswordError.value = ''
      break
  }
}

// 用户协议切换（按事件值设置，避免取反导致状态不同步）
const toggleAgreement = (e) => {
  try {
    // uni-app 中 checkbox change 的 e.detail.value 是数组，勾选时长度>0
    const val = e?.detail?.value
    formData.agreeTerms = Array.isArray(val) ? val.length > 0 : !!val
  } catch (err) {
    formData.agreeTerms = !formData.agreeTerms
  }
}

// 显示用户协议
const showTerms = () => {
  uni.showToast({
    title: '用户协议',
    icon: 'none',
    duration: 2000
  })
}

// 显示隐私政策
const showPrivacy = () => {
  uni.showToast({
    title: '隐私政策',
    icon: 'none',
    duration: 2000
  })
}

// 注册处理
const handleRegister = async () => {
  console.log('[register] click register button')
  // 验证表单
  const isUsernameValid = validateUsername()
  const isPasswordValid = validatePassword()
  const isConfirmPasswordValid = validateConfirmPassword()
  
  if (!formData.email || !formData.email.includes('@')) {
    emailError.value = '请输入有效的邮箱地址'
    return
  }

  if (!isUsernameValid || !isPasswordValid || !isConfirmPasswordValid) {
    return
  }

  if (!formData.agreeTerms) {
    uni.showToast({
      title: '请先同意用户协议和隐私政策',
      icon: 'none',
      duration: 2000
    })
    return
  }

  loading.value = true
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username
        }
      }
    })

    if (error) throw error
    
    uni.showToast({
      title: '注册成功，请查收验证邮件',
      icon: 'success',
      duration: 3000
    })
    
    setTimeout(() => {
      uni.navigateTo({
        url: '/pages/login/login'
      })
    }, 1500)
    
  } catch (error) {
    uni.showToast({
      title: error.message || '注册失败',
      icon: 'error',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

// 跳转到登录页面
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/login'
  })
}
</script>

<style lang="scss" scoped>
.register-container {
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

.register-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 50rpx;
  padding: 100rpx 60rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 750rpx;
  position: relative;
}

.register-header {
  text-align: center;
  margin-bottom: 60rpx;
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

.register-form {
  margin-bottom: 40rpx;
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
  margin: 30rpx 0;
}

.agreement {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
}

.agreement-text {
  color: #666;
  font-size: 28rpx;
  line-height: 1.4;
}

.terms-link {
  color: #88d8a3;
  font-weight: 500;
}

.register-btn {
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
    background: #ccc;
  }
}

.login-entry {
  text-align: center;
  margin-top: 40rpx;
}

.login-desc {
  color: #888;
  font-size: 28rpx;
}

.login-link {
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
  .register-card {
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