<template>
  <view class="checkin-container">
    <view class="bg-gradient"></view>
    <!-- 返回图标 -->
    <view class="back-icon" @tap="goBack">
      <text class="arrow">‹</text>
    </view>

    <view class="p-card">
      <!-- 页面标题 -->
      <view class="page-header">
        <text class="page-title">今日值日记录</text>
      </view>

      <!-- 图片上传区域 -->
      <view class="upload-section">
        <!-- 已上传的图片列表 -->
        <view v-if="uploadedImages.length > 0" class="uploaded-images">
          <view 
            v-for="(image, index) in uploadedImages" 
            :key="index" 
            class="image-item"
          >
            <image :src="image" mode="aspectFit" class="preview-image"></image>
            <view class="remove-btn" @tap.stop="removeImage(index)">
              <text class="remove-icon">×</text>
            </view>
        </view>
      </view>

        <!-- 上传按钮 -->
        <view class="upload-area" @tap="chooseImage">
          <view class="upload-placeholder">
            <text class="camera-icon">📷</text>
            <text class="upload-text">点击上传值日照片</text>
            <text class="upload-hint">支持 JPG、PNG 格式，最多9张</text>
          </view>
        </view>
      </view>

      <!-- 值日描述区域 -->
      <view class="description-section">
        <text class="section-label">值日描述 <text class="optional">(选填)</text></text>
        <textarea 
          class="description-input" 
          v-model="description" 
          placeholder="描述一下今天的值日情况..."
          placeholder-class="placeholder"
          :maxlength="200"
          :auto-height="true"
        ></textarea>
        <text class="char-count">{{ description.length }}/200</text>
    </view>

      <!-- 打卡按钮 -->
      <view class="publish-section">
        <button 
          class="checkin-btn" 
          @tap="handleCheckin"
          :disabled="!canCheckin"
          :class="{ 'disabled': !canCheckin }"
        >
          打卡
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

// 响应式数据
const uploadedImages = ref([])
const description = ref('')

// 计算属性：是否可以打卡
const canCheckin = computed(() => {
  return uploadedImages.value.length > 0
})

// 选择图片
const chooseImage = () => {
  uni.chooseImage({
    count: 9, // 最多选择9张图片
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 添加新选择的图片到现有图片列表
      uploadedImages.value = [...uploadedImages.value, ...res.tempFilePaths]
    },
    fail: (err) => {
      console.error('选择图片失败:', err)
      uni.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    }
  })
}

// 移除单张图片
const removeImage = (index) => {
  uploadedImages.value.splice(index, 1)
}

// 打卡
const handleCheckin = () => {
  if (!canCheckin.value) {
    uni.showToast({
      title: '请至少上传一张照片',
      icon: 'none'
    })
    return
  }

  // 模拟打卡过程
  uni.showLoading({
    title: '打卡中...'
  })

  setTimeout(() => {
    uni.hideLoading()
    
    // 更新值日表数据
    updateDutyCheckinData()
    
    uni.showToast({
      title: '打卡成功',
      icon: 'success'
    })
    
    // 清空表单
    uploadedImages.value = []
    description.value = ''
    
    // 根据来源页面返回对应页面
    setTimeout(() => {
      goBackToSource()
    }, 1500)
  }, 1500)
}

// 更新值日表打卡数据
const updateDutyCheckinData = () => {
  try {
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData) {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      
      // 检查今天是否在值日区间内
      const startDate = storedData.startDate
      const endDate = storedData.endDate
      
      if (!startDate || !endDate || todayStr < startDate || todayStr > endDate) {
        uni.showToast({
          title: '今天不在值日区间内',
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      // 添加打卡记录
      const checkins = storedData.checkins || []
      const existingCheckin = checkins.find(([date]) => date === todayStr)
      
      if (!existingCheckin) {
        const manager = uni.getStorageSync('manager_profile') || {}
        const member = uni.getStorageSync('member_profile') || {}
        // 优先根据路由参数判断身份
        let currentUser = '我'
        try {
          const pages = getCurrentPages()
          const currentPage = pages[pages.length - 1]
          const options = currentPage?.options || {}
          if (options.from === 'manager') currentUser = manager.userName || member.userName || '我'
          else if (options.from === 'member') currentUser = member.userName || manager.userName || '我'
          else currentUser = member.userName || manager.userName || '我'
        } catch (e) {
          currentUser = member.userName || manager.userName || '我'
        }
        // 存为 [date, person, images, description]
        checkins.push([todayStr, currentUser, [...uploadedImages.value], description.value])
        storedData.checkins = checkins
        
        // 保存更新后的数据
        uni.setStorageSync('duty_schedule_data', storedData)
        
        // 触发全局事件，通知值日表页面更新
        uni.$emit('dutyCheckinUpdated', {
          date: todayStr,
          person: currentUser,
          images: [...uploadedImages.value],
          description: description.value
        })
        
        // 检查J人模式下的循环完成情况
        checkJModeCycleCompletion(storedData)
      } else {
        uni.showToast({
          title: '今天已经打卡过了',
          icon: 'none',
          duration: 2000
        })
      }
    } else {
      uni.showToast({
        title: '请先设置值日区间',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (e) {
    console.error('更新值日表数据失败:', e)
  }
}

// 检查J人模式下的循环完成情况
const checkJModeCycleCompletion = (dutyData) => {
  if (dutyData.mode !== 'J') return
  
  const members = dutyData.members || []
  const checkins = dutyData.checkins || []
  
  // 获取当前循环中已打卡的成员
  const checkedInMembers = new Set()
  checkins.forEach(([date, person]) => {
    checkedInMembers.add(person)
  })
  
  // 检查是否所有成员都已完成值日
  const allMembersCompleted = members.every(member => checkedInMembers.has(member))
  
  if (allMembersCompleted && members.length > 0) {
    // 所有成员都已完成值日，开始新循环
    uni.showModal({
      title: '循环完成',
      content: '所有人已经值日好了，新的循环明天开始！',
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        // 清空打卡记录，开始新循环
        dutyData.checkins = []
        uni.setStorageSync('duty_schedule_data', dutyData)
        
        // 发送通知给所有人
        uni.showToast({
          title: '新循环明天开始',
          icon: 'success',
          duration: 3000
        })
      }
    })
  } else {
    // 显示当前打卡人员
    uni.showToast({
      title: '张三已值日好了，其他人做好准备',
      icon: 'none',
      duration: 2000
    })
  }
}

// 导航方法
const goHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  })
}

const goDutyTable = () => {
  uni.switchTab({
    url: '/pages/manager-duty-table/manager-duty-table'
  })
}

const goMine = () => {
  uni.switchTab({
    url: '/pages/mine/mine'
  })
}

// 返回来源页面
const goBackToSource = () => {
  // 获取来源页面信息
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  
  // 根据来源页面返回对应页面
  if (options.from === 'manager') {
    // 从管理人员首页来的，返回管理人员值班表
    uni.navigateTo({ url: '/pages/manager-duty-table/manager-duty-table' })
  } else if (options.from === 'member') {
    // 从成员首页来的，返回成员值班表
    uni.navigateTo({ url: '/pages/member-duty-table/member-duty-table' })
  } else {
    // 默认返回管理人员首页
    uni.navigateTo({ url: '/pages/manager-home/manager-home' })
  }
}

// 返回管理人员首页
const goBack = () => {
  goBackToSource()
}
</script>

<style lang="scss" scoped>
.checkin-container {
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

.back-icon { position: absolute; left: 24rpx; top: 24rpx; width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,.9); display:flex; align-items:center; justify-content:center; box-shadow: 0 8rpx 20rpx rgba(0,0,0,.08); }
.arrow { font-size: 52rpx; line-height: 1; color:#2e7d32; transform: translateX(-4rpx); }

.p-card {
  width: 100%;
  max-width: 750rpx;
  background: rgba(255,255,255,.95);
  border-radius: 50rpx;
  padding: 60rpx;
  box-shadow: 0 50rpx 100rpx rgba(0,0,0,.15);
  box-sizing: border-box;
}

.page-header {
  padding: 60rpx 40rpx 40rpx;
  text-align: center;
}

.page-title {
  font-size: 48rpx;
  font-weight: 600;
  color: #333;
}

.upload-section { margin-bottom: 40rpx; }

.uploaded-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-area {
  background: white;
  border: 4rpx dashed #ddd;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  position: relative;
  min-height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.camera-icon {
  font-size: 80rpx;
  color: #999;
}

.upload-text {
  font-size: 32rpx;
  color: #666;
  font-weight: 500;
}

.upload-hint {
  font-size: 24rpx;
  color: #999;
}

.remove-btn {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 40rpx;
  height: 40rpx;
  background: #ff4757;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon {
  color: white;
  font-size: 24rpx;
  font-weight: bold;
}

.description-section { margin-bottom: 20rpx; }

.section-label {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.optional {
  font-size: 24rpx;
  color: #999;
  font-weight: normal;
}

.description-input {
  width: 100%;
  min-height: 200rpx;
  background: white;
  border: 2rpx solid #e1e5e9;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  box-sizing: border-box;
}

.placeholder {
  color: #999;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

.publish-section { }

.checkin-btn {
  width: 100%;
  height: 88rpx;
  background: #88d8a3;
  color: white;
  border: none;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &.disabled {
    background: #ccc;
    color: #999;
  }
  
  &:not(.disabled):active {
    transform: scale(0.98);
  }
}

/* 按要求：移除底部栏样式 */
</style>