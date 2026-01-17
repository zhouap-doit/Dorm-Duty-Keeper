<template>
  <view class="page-container">
    <view class="bg-gradient"></view>
    <view class="content-card">
      <text class="title">我的</text>
      <text class="desc">这里是我的占位页面</text>
    </view>
    <BottomNav active="mine" />
  </view>
</template>

<script setup>
import BottomNav from '@/components/BottomNav.vue'
</script>

<style lang="scss" scoped>
.page-container { min-height: 100vh; position: relative; padding-bottom: 120rpx; }
.bg-gradient { position: fixed; top:0;left:0;right:0;bottom:0; background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%); z-index:-1; }
.content-card { margin: 40rpx; padding: 60rpx; background: rgba(255,255,255,.95); border-radius: 30rpx; }
.title { display:block; font-size: 40rpx; font-weight: 700; color:#333; margin-bottom: 16rpx; }
.desc { color:#666; font-size: 28rpx; }
</style>


