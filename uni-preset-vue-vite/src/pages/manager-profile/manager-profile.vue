<template>
  <view class="mine-container">
    <view class="bg-gradient"></view>

    <view class="mine-card">
      <view class="page-header">
        <text class="page-title">宿舍长--我的</text>
      </view>

      <view class="user-section">
        <view class="user-info">
          <view class="avatar"><text class="avatar-text">头像</text></view>
          <view class="user-details">
            <text class="user-name">张三</text>
            <text class="user-role">宿舍长</text>
            <text class="user-dormitory">宿舍 : 301</text>
          </view>
          <view class="edit-icon"><text class="edit-text">✏️</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
</script>

<style lang="scss" scoped>
.mine-container { min-height: 100vh; position: relative; background: #f8f8f8; padding-bottom: 120rpx; }
.bg-gradient { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%); z-index: -1; }
.mine-card { padding: 40rpx; width: 100%; max-width: 750rpx; margin: 0 auto; box-sizing: border-box; }
.page-header { text-align: center; margin-bottom: 40rpx; }
.page-title { font-size: 48rpx; font-weight: 600; color: #333; }
.user-section { background: white; border-radius: 20rpx; padding: 40rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1); }
.user-info { display: flex; align-items: center; gap: 30rpx; }
.avatar { width: 120rpx; height: 120rpx; background: #e9ecef; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-text { color: white; font-size: 24rpx; font-weight: 500; }
.user-details { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.user-name { font-size: 40rpx; font-weight: 700; color: #333; }
.user-role { font-size: 28rpx; color: #666; }
.user-dormitory { font-size: 28rpx; color: #666; }
.edit-icon { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.edit-text { font-size: 32rpx; }
</style>


