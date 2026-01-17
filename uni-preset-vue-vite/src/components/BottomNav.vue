<template>
  <view class="bottom-nav">
    <view 
      class="nav-item" 
      :class="{ active: currentIndex === 0 }"
      @tap="handleTap(0, '/pages/manager-home/manager-home')"
    >
      <text class="nav-icon">🏠</text>
      <text class="nav-text">首页</text>
    </view>
    <view 
      class="nav-item" 
      :class="{ active: currentIndex === 1 }"
      @tap="handleTap(1, '/pages/manager-duty-table/manager-duty-table')"
    >
      <text class="nav-icon">📋</text>
      <text class="nav-text">值日表</text>
    </view>
    <view 
      class="nav-item" 
      :class="{ active: currentIndex === 2 }"
      @tap="handleTap(2, '/pages/mine/mine')"
    >
      <text class="nav-icon">👤</text>
      <text class="nav-text">我的</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  active: {
    type: String,
    default: 'home' // home | duty | mine
  }
})

const mapToIndex = {
  home: 0,
  duty: 1,
  mine: 2
}

const currentIndex = computed(() => mapToIndex[props.active] ?? 0)

const handleTap = (index, url) => {
  if (index === currentIndex.value) return
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.bottom-nav {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: 120rpx;
  background: #E8F5E9; /* 浅绿色 */
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-shadow: 0 -6rpx 20rpx rgba(0, 0, 0, 0.08); /* 轻微阴影 */
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8rpx 0;
  color: rgba(0,0,0,0.55);
}

.nav-icon {
  display: block;
  font-size: 44rpx;
  line-height: 1;
}

.nav-text {
  display: block;
  font-size: 24rpx;
  margin-top: 6rpx;
}

.nav-item.active {
  color: #4CAF50; /* 深绿色 */
  font-weight: 600;
}
</style>


