<template>
  <view class="page-container">
    <view class="bg-gradient"></view>
    <!-- 返回图标 -->
    <view class="back-icon" @tap="goBack">
      <text class="arrow">‹</text>
    </view>

    <view class="card">
      <view class="header">
        <view class="logo">
          <text class="logo-text">⏰</text>
        </view>
        <text class="title">设置提醒时间</text>
        <text class="subtitle">请选择你希望的提醒方式与时间</text>
      </view>

      <view class="form">
        <view class="form-group">
          <text class="label">提醒类型</text>
          <picker mode="selector" :range="remindTypes" @change="onTypeChange">
            <view class="picker-value">{{ remindTypes[typeIndex] }}</view>
          </picker>
        </view>

        <view class="form-group">
          <text class="label">提醒时间</text>
          <picker mode="time" :value="time" start="00:00" end="23:59" @change="onTimeChange">
            <view class="picker-value">{{ time }}</view>
          </picker>
        </view>

        <view class="form-group">
          <text class="label">重复</text>
          <view class="repeat-grid">
            <view v-for="(d, i) in days" :key="i" class="repeat-item" :class="{ active: repeat[i] }" @tap="toggleRepeat(i)">
              <text class="repeat-text">{{ d }}</text>
            </view>
          </view>
        </view>

        <view class="form-group">
          <text class="label">提醒方式</text>
          <view class="switch-row">
            <text class="switch-text">应用内提醒</text>
            <switch :checked="inApp" color="#88d8a3" @change="e => inApp = e.detail.value" />
          </view>
          <view class="switch-row">
            <text class="switch-text">振动提示</text>
            <switch :checked="vibrate" color="#88d8a3" @change="e => vibrate = e.detail.value" />
          </view>
        </view>

        <button class="save-btn" @tap="save">保存设置</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const remindTypes = ['值日前提醒', '固定时间提醒', '仅今日提醒']
const typeIndex = ref(0)
const time = ref('08:00')
const days = ['一','二','三','四','五','六','日']
const repeat = ref([true,true,true,true,true,false,false])
let inApp = ref(true)
let vibrate = ref(false)

const onTypeChange = (e) => { typeIndex.value = Number(e.detail.value || 0) }
const onTimeChange = (e) => { time.value = e.detail.value }
const toggleRepeat = (i) => { repeat.value[i] = !repeat.value[i] }

const goBack = () => {
  uni.navigateBack()
}

const save = () => {
  try {
    const settings = {
      typeIndex: typeIndex.value,
      time: time.value,
      repeat: repeat.value,
      inApp: inApp.value,
      vibrate: vibrate.value,
      enabled: true,
      lastSetTime: new Date().toISOString()
    }
    uni.setStorageSync('remind_settings', settings)
    
    // 设置定时提醒
    setupReminder(settings)
  } catch (e) {
    console.error('保存提醒设置失败:', e)
  }
  uni.showToast({ title: '已保存', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 600)
}

// 设置定时提醒
const setupReminder = (settings) => {
  try {
    // 清除之前的定时器
    const existingTimer = uni.getStorageSync('reminder_timer_id')
    if (existingTimer) {
      clearInterval(existingTimer)
    }
    
    if (!settings.enabled) return
    
    // 计算下次提醒时间
    const now = new Date()
    const [hours, minutes] = settings.time.split(':').map(Number)
    const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
    
    // 如果今天的时间已过，设置为明天
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1)
    }
    
    const timeUntilReminder = reminderTime.getTime() - now.getTime()
    
    // 设置定时器
    const timerId = setTimeout(() => {
      checkAndSendReminder(settings)
      // 设置每日重复
      const dailyTimer = setInterval(() => {
        checkAndSendReminder(settings)
      }, 24 * 60 * 60 * 1000) // 24小时后重复
      
      uni.setStorageSync('reminder_daily_timer_id', dailyTimer)
    }, timeUntilReminder)
    
    uni.setStorageSync('reminder_timer_id', timerId)
    console.log('提醒设置成功，将在', reminderTime, '发送提醒')
  } catch (e) {
    console.error('设置提醒失败:', e)
  }
}

// 检查并发送提醒
const checkAndSendReminder = (settings) => {
  try {
    // 检查今天是否需要值日
    const dutyData = uni.getStorageSync('duty_schedule_data')
    if (!dutyData) return
    
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    // 检查今天是否有值日安排
    const schedule = dutyData.schedule || []
    const todayDuty = schedule.find(([date]) => date === todayStr)
    
    if (todayDuty) {
      const dutyPerson = todayDuty[1]
      
      // 发送应用内提醒
      if (settings.inApp) {
        uni.showModal({
          title: '值日提醒',
          content: `今天是${dutyPerson}值日，记得完成值日任务哦！`,
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            // 可以在这里添加其他逻辑，比如跳转到值日表页面
          }
        })
      }
      
      // 振动提醒
      if (settings.vibrate) {
        uni.vibrateShort()
      }
      
      // 显示Toast提醒
      uni.showToast({
        title: `今天是${dutyPerson}值日`,
        icon: 'none',
        duration: 3000
      })
    }
  } catch (e) {
    console.error('发送提醒失败:', e)
  }
}
</script>

<style scoped lang="scss">
.page-container { min-height:100vh; position:relative; display:flex; align-items:center; justify-content:center; padding:40rpx; }
.bg-gradient { position:fixed; inset:0; background: linear-gradient(135deg,#a8e6cf 0%, #88d8a3 100%); z-index:-1; }

.back-icon { position: absolute; left: 24rpx; top: 24rpx; width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,.9); display:flex; align-items:center; justify-content:center; box-shadow: 0 8rpx 20rpx rgba(0,0,0,.08); }
.arrow { font-size: 52rpx; line-height: 1; color:#2e7d32; transform: translateX(-4rpx); }
.card { width:100%; max-width:750rpx; background: rgba(255,255,255,.95); border-radius: 50rpx; padding: 80rpx 60rpx; box-shadow: 0 50rpx 100rpx rgba(0,0,0,.15); box-sizing: border-box; }
.header { text-align:center; margin-bottom: 60rpx; }
.logo { width: 160rpx; height:160rpx; background: linear-gradient(135deg,#a8e6cf,#88d8a3); border-radius: 40rpx; margin: 0 auto 24rpx; display:flex; align-items:center; justify-content:center; }
.logo-text { font-size: 72rpx; }
.title { display:block; font-size: 48rpx; font-weight: 600; color:#333; }
.subtitle { display:block; color:#888; font-size: 28rpx; margin-top: 8rpx; }
.form { }
.form-group { margin-bottom: 36rpx; }
.label { display:block; color:#555; font-size: 28rpx; font-weight: 500; margin-bottom: 16rpx; }
.picker-value { padding: 30rpx; background:#f8f9fa; border: 4rpx solid #e1e5e9; border-radius: 30rpx; color:#333; font-size: 32rpx; }
.repeat-grid { display:grid; grid-template-columns: repeat(7, 1fr); gap: 12rpx; }
.repeat-item { background:#f8f9fa; border: 4rpx solid #e1e5e9; border-radius: 20rpx; padding: 18rpx 0; text-align:center; }
.repeat-item.active { background: rgba(136,216,163,.12); border-color:#88d8a3; }
.repeat-text { font-size: 26rpx; color:#333; }
.switch-row { display:flex; align-items:center; justify-content:space-between; padding: 20rpx 24rpx; background:#f8f9fa; border: 4rpx solid #e1e5e9; border-radius: 20rpx; margin-top: 12rpx; }
.switch-text { color:#333; font-size: 28rpx; }
.save-btn { width:100%; padding: 36rpx; background: linear-gradient(135deg,#a8e6cf,#88d8a3); color:#fff; border:none; border-radius: 30rpx; font-size: 36rpx; font-weight: 600; margin-top: 20rpx; }
</style>


