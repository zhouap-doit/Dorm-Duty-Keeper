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
            <text class="upload-hint">支持JPG、PNG格式，最多9张</text>
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
import { supabase } from '@/utils/supabase.js'

// 响应式数据
const uploadedImages = ref([])
const description = ref('')

const isLoadingData = ref(true)
const hasCompletedThisRound = ref(false)

onMounted(async () => {
  await checkRoundStatus()
})

// 检查本轮状态
const checkRoundStatus = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('dormitory_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dormitory_id) return

    // 1. 获取最后一次“全员完成”的时间
    const { data: lastCycle } = await supabase
      .from('dormitory_status_logs')
      .select('created_at')
      .eq('dormitory_id', profile.dormitory_id)
      .eq('type', 'cycle_complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastCycleTime = lastCycle?.created_at || '1970-01-01T00:00:00Z'
    const lastCycleDate = lastCycleTime.slice(0, 10)
    const todayStr = new Date().toISOString().slice(0, 10)

    // 1.5 如果本轮今天刚刚完成，则提示明天开始
    if (lastCycleDate === todayStr) {
      hasCompletedThisRound.value = true
      uni.showModal({
        title: '本轮已结束',
        content: '本宿舍所有人已完成本轮值日，新一轮值日将于明天开始。',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    // 2. 检查用户在最后一次完成时间之后是否有打卡记录
    const { data: checkin } = await supabase
      .from('checkins')
      .select('id')
      .eq('dormitory_id', profile.dormitory_id)
      .eq('user_id', user.id)
      .gt('created_at', lastCycleTime)
      .limit(1)
      .maybeSingle()

    if (checkin) {
      hasCompletedThisRound.value = true
      uni.showModal({
        title: '温馨提示',
        content: '您已完成本轮值日，请等待其他室友完成。',
        showCancel: false,
        confirmText: '知道了'
      })
    }
  } catch (e) {
    console.error('检查状态失败:', e)
  } finally {
    isLoadingData.value = false
  }
}

// 计算属性：是否可以打卡
const canCheckin = computed(() => {
  return uploadedImages.value.length > 0 && !hasCompletedThisRound.value && !isLoadingData.value
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
const handleCheckin = async () => {
  if (!canCheckin.value) {
    uni.showToast({ title: '请至少上传一张照片', icon: 'none' })
    return
  }

  uni.showLoading({ title: '打卡中...' })

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, dormitory_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dormitory_id) {
      uni.showToast({ title: '未找到宿舍信息', icon: 'none' })
      return
    }

    // 1. 上传照片到 Supabase Storage
    const imageUrls = []
    for (const imagePath of uploadedImages.value) {
      const fileName = `${profile.dormitory_id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
      
      let blob;
      // #ifdef H5
      // H5 环境通过 fetch 获取 blob
      const res = await fetch(imagePath)
      blob = await res.blob()
      // #endif

      // #ifndef H5
      // 小程序环境通过 FileSystemManager 读取
      const base64 = await new Promise((resolve, reject) => {
        uni.getFileSystemManager().readFile({
          filePath: imagePath,
          encoding: 'base64',
          success: (res) => resolve(res.data),
          fail: (e) => reject(e)
        })
      })
      blob = base64ToBlob(base64, 'image/jpeg')
      // #endif

      const { data, error } = await supabase.storage
        .from('duty-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('duty-photos')
        .getPublicUrl(fileName)

      imageUrls.push(urlData.publicUrl)
    }

    // 2. 保存打卡记录到数据库
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const { error: checkinError } = await supabase
      .from('checkins')
      .insert({
        dormitory_id: profile.dormitory_id,
        user_id: user.id,
        person_name: profile.username, // 显式保存用户名
        description: description.value,
        photo_urls: imageUrls, // 统一使用 photo_urls
        checkin_date: todayStr
      })

    if (checkinError) throw checkinError

    // 3. 【新增】计算并发送全员动态通知
    await notifyDormitory(profile.dormitory_id, profile.username, user.id)

    uni.hideLoading()
    uni.showToast({ title: '打卡成功', icon: 'success' })

    uploadedImages.value = []
    description.value = ''

    setTimeout(() => {
      goBackToSource()
    }, 1500)

  } catch (error) {
    uni.hideLoading()
    console.error('打卡失败:', error)
    uni.showToast({ title: '打卡失败', icon: 'error' })
  }
}

// Base64转Blob
const base64ToBlob = (base64, type) => {
  // ... existing code ...
}

// 【新增】宿舍通知逻辑
const notifyDormitory = async (dormId, senderName, userId) => {
  try {
    // 1. 获取最后一次全员完成的时间
    const { data: lastCycle } = await supabase
      .from('dormitory_status_logs')
      .select('created_at')
      .eq('dormitory_id', dormId)
      .eq('type', 'cycle_complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastCycleTime = lastCycle?.created_at || '1970-01-01T00:00:00Z'

    // 2. 获取本轮已打卡的独立人数
    const { data: thisRoundCheckins } = await supabase
      .from('checkins')
      .select('user_id')
      .eq('dormitory_id', dormId)
      .gt('created_at', lastCycleTime)

    const checkedInUserIds = new Set(thisRoundCheckins?.map(c => c.user_id) || [])
    const checkedInCount = checkedInUserIds.size

    // 3. 获取宿舍当前总人数
    const { count: totalMembers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('dormitory_id', dormId)

    const remaining = Math.max(0, totalMembers - checkedInCount)
    let message = ''
    let type = 'checkin'

    if (remaining === 0) {
      message = `🎉 太棒了！本宿舍所有人均已完成一轮值日，新一轮值日明天开始！`
      type = 'cycle_complete'
    } else {
      message = `📢 ${senderName} 已完成值日！目前还剩 ${remaining} 人未完成，请大家及时值日。`
    }

    // 4. 写入动态表
    await supabase.from('dormitory_status_logs').insert({
      dormitory_id: dormId,
      sender_id: userId,
      content: message,
      type: type
    })
  } catch (e) {
    console.error('发送通知失败:', e)
  }
}

// 更新值日表打卡数据
const updateDutyCheckinData = () => {
  try {
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData) {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      
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
          if (options.from === 'member') currentUser = member.userName || manager.userName || '我'
          else if (options.from === 'manager') currentUser = manager.userName || member.userName || '我'
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
      }
    }
  } catch (e) {
    console.error('更新值日表数据失败:', e)
  }
}

// 返回来源页面
const goBackToSource = () => {
  // 获取来源页面信息
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  
  // 根据来源页面返回对应页面
  if (options.from === 'member') {
    // 从成员首页来的，返回成员值班表
    uni.navigateTo({ url: '/pages/member-duty-table/member-duty-table' })
  } else {
    // 默认返回成员首页
    uni.navigateBack()
  }
}

// 返回成员首页
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

.back-icon { 
  position: absolute; 
  left: 24rpx; 
  top: 24rpx; 
  width: 72rpx; 
  height: 72rpx; 
  border-radius: 50%; 
  background: rgba(255,255,255,.9); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  box-shadow: 0 8rpx 20rpx rgba(0,0,0,.08); 
}

.arrow { 
  font-size: 52rpx; 
  line-height: 1; 
  color: #2e7d32; 
  transform: translateX(-4rpx); 
}

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

.upload-section { 
  margin-bottom: 40rpx; 
}

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

.description-section { 
  margin-bottom: 20rpx; 
}

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

.publish-section { 
  margin-top: 40rpx;
}

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
</style>
