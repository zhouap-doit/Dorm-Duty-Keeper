<template>
  <view class="join-container">
    <view class="bg-gradient"></view>

    <view class="join-card">
      <!-- 标题 -->
      <view class="header">
        <text class="title">选择加入方式</text>
      </view>

      <!-- 方式卡片：通过宿舍名称 -->
      <view class="method-card">
        <view class="method-row">
          <text class="icon">🔍</text>
          <view class="method-info">
            <text class="method-title">通过宿舍名称</text>
            <text class="method-sub">输入宿舍名称搜索加入</text>
          </view>
          <text class="radio">○</text>
        </view>
      </view>

      <!-- 输入与按钮 -->
      <view class="form">
        <input class="input" v-model="dormName" placeholder="请输入宿舍名称" placeholder-class="placeholder" />
        <button class="join-btn" :disabled="!dormName.trim()" :class="{disabled: !dormName.trim()}" @tap="handleJoin">
          加入宿舍
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const dormName = ref('')

const handleJoin = () => {
  if (!dormName.value.trim()) {
    uni.showToast({ title: '请先输入宿舍名称', icon: 'none' })
    return
  }
  
  // 跳转到申请页面，传递宿舍名称
  uni.navigateTo({ 
    url: `/pages/join-dormitory-apply/join-dormitory-apply?dormitoryName=${encodeURIComponent(dormName.value.trim())}`
  })
}
</script>

<style lang="scss" scoped>
.join-container { min-height: 100vh; position: relative; display:flex; align-items:center; justify-content:center; padding: 40rpx; }
.bg-gradient { position: fixed; inset: 0; background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%); z-index:-1; }

.join-card { width:100%; max-width: 750rpx; background: rgba(255,255,255,.95); border-radius: 50rpx; padding: 60rpx; box-shadow: 0 50rpx 100rpx rgba(0,0,0,.15); box-sizing: border-box; }
.header { text-align:center; margin-bottom: 40rpx; }
.title { display:block; font-size: 44rpx; font-weight: 700; color:#333; }

.method-card { background:#f8f9fa; border-radius: 24rpx; padding: 24rpx; border: 4rpx solid #e1e5e9; margin-bottom: 80rpx; }
.method-row { display:flex; align-items:center; }
.icon { font-size: 44rpx; margin-right: 16rpx; color:#555; }
.method-info { flex:1; }
.method-title { display:block; font-size: 32rpx; color:#333; font-weight: 600; }
.method-sub { display:block; font-size: 24rpx; color:#888; margin-top: 6rpx; }
.radio { font-size: 40rpx; color:#999; }

.form { display:flex; flex-direction: column; gap: 24rpx; align-items:center; }
.input { width: 80%; padding: 26rpx 30rpx; background:#fff; border: 2rpx solid #e1e5e9; border-radius: 30rpx; font-size: 30rpx; color:#333; }
.placeholder { color:#999; }
.join-btn { width: 60%; padding: 30rpx 0; border-radius: 30rpx; background:#a8e6cf; color:#333; font-size: 32rpx; }
.join-btn.disabled { opacity:.6; }
</style>


