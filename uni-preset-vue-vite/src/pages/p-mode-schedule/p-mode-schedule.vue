<template>
  <view class="p-container">
    <view class="bg-gradient"></view>
    
    <!-- 返回图标 -->
    <view class="back-icon" @tap="goBack">
      <text class="arrow">‹</text>
    </view>

    <view class="p-card">
      <view class="header">
        <text class="title">P人模式</text>
        <text class="subtitle">请选择开始与结束日期</text>
      </view>

      <!-- 表单区域 -->
      <view class="form-section">
        <view class="form-group">
          <text class="form-label">开始日期</text>
          <view class="input-wrapper" @tap="openDatePicker('start')">
            <text class="input-text">{{ startDate || '请选择开始日期' }}</text>
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">结束日期</text>
          <view class="input-wrapper" @tap="openDatePicker('end')">
            <text class="input-text">{{ endDate || '请选择结束日期' }}</text>
          </view>
        </view>

        <button class="primary-btn" @tap="publish">发布排班</button>
      </view>

      <!-- 日历预览区域 -->
      <view v-if="scheduleData" class="preview-section">
        <text class="preview-title">排班表预览</text>
        <view class="single-month-view">
          <view class="calendar-header">
            <text class="nav-arrow" @tap="prevMonth">‹</text>
            <text class="month-text">{{ currentDisplayMonth }}</text>
            <text class="nav-arrow" @tap="nextMonth">›</text>
          </view>
          <view class="weekday-row">
            <text class="weekday" v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</text>
          </view>
          <view class="calendar-grid">
            <view 
              class="calendar-day" 
              v-for="day in currentMonthDays" 
              :key="day.date"
              :class="{ 'in-range': day.inRange }"
            >
              <text class="day-number">{{ day.day }}</text>
            </view>
          </view>
        </view>
        <text class="month-info">{{ currentMonthIndex + 1 }} / {{ totalMonths }} 月</text>
        
        <!-- 重新排班按钮 -->
        <button class="reschedule-btn" @tap="clearSchedule">重新排班</button>
      </view>
    </view>
  </view>

  <!-- 数字滚轮日期选择器，与J人模式保持一致体验 -->
  <view v-if="datePicker.show" class="dp-mask" @tap="closeDatePicker">
    <view class="dp-panel" @tap.stop>
      <view class="dp-header">
        <text class="dp-title">请选择日期</text>
      </view>
      <picker-view class="wheel" :value="wheelIndex" indicator-style="height: 72rpx;" @change="onWheelChange">
        <picker-view-column>
          <view class="wheel-item" v-for="(y, i) in wheelYears" :key="'y'+i">{{ y }}年</view>
        </picker-view-column>
        <picker-view-column>
          <view class="wheel-item" v-for="(m, i) in wheelMonths" :key="'m'+i">{{ m }}月</view>
        </picker-view-column>
        <picker-view-column>
          <view class="wheel-item" v-for="(d, i) in wheelDays" :key="'d'+i">{{ d }}日</view>
        </picker-view-column>
      </picker-view>
      <view class="dp-actions">
        <button class="ghost-btn" @tap="closeDatePicker">取消</button>
        <button class="primary-btn" style="width: 220rpx; margin:0 0 0 16rpx" @tap="confirmWheel">确定</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { supabase } from '@/utils/supabase.js'

const startDate = ref('')
const endDate = ref('')
const scheduleData = ref(null)

// 单月视图相关
const currentMonthIndex = ref(0)
const currentDisplayMonth = computed(() => {
  if (!scheduleData.value || !startDate.value || !endDate.value) return ''
  const start = new Date(startDate.value)
  const current = new Date(start)
  current.setMonth(current.getMonth() + currentMonthIndex.value)
  return `${current.getFullYear()}年${current.getMonth() + 1}月`
})
const totalMonths = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
})
const currentMonthDays = computed(() => {
  if (!scheduleData.value || !startDate.value || !endDate.value) return []
  
  const start = new Date(startDate.value)
  const current = new Date(start)
  current.setMonth(current.getMonth() + currentMonthIndex.value)
  
  const year = current.getFullYear()
  const month = current.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  
  const days = []
  
  // 添加空白单元格
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ day: '', date: '', inRange: false })
  }
  
  // 添加月份中的每一天
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const inRange = date >= startDate.value && date <= endDate.value
    days.push({ day, date, inRange })
  }
  
  return days
})

// 初始化开始时间为北京时间
onMounted(() => {
  const beijingNow = getBeijingNow()
  const year = beijingNow.getFullYear()
  const month = String(beijingNow.getMonth() + 1).padStart(2, '0')
  const day = String(beijingNow.getDate()).padStart(2, '0')
  startDate.value = `${year}-${month}-${day}`
  
  // 加载已保存的数据
  loadExistingData()
})

// 加载已保存的数据
const loadExistingData = () => {
  try {
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData && storedData.mode === 'P') {
      // 恢复表单数据
      if (storedData.startDate) startDate.value = storedData.startDate
      if (storedData.endDate) endDate.value = storedData.endDate
      console.log('已加载保存的P人模式数据')
    }
  } catch (e) {
    console.error('加载P人模式数据失败:', e)
  }
}

const datePicker = reactive({ show: false, type: 'start' })
const wheelYears = ref([])
const wheelMonths = ref([])
const wheelDays = ref([])
const wheelIndex = ref([0,0,0])

function getBeijingNow() {
  const now = new Date()
  const utcTs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcTs + 8 * 3600000)
}

const initWheel = (baseDate) => {
  const startYear = 1900
  const endYear = 2100
  const len = endYear - startYear + 1
  wheelYears.value = Array.from({ length: len }, (_, i) => startYear + i)
  wheelMonths.value = Array.from({ length: 12 }, (_, i) => i + 1)
  // 直接使用 baseDate 的年月来计算天数，避免依赖 wheelIndex 导致的年份错乱
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth() + 1
  const dim = new Date(year, month, 0).getDate()
  wheelDays.value = Array.from({ length: dim }, (_, i) => i + 1)
}

const openDatePicker = (type) => {
  datePicker.show = true
  datePicker.type = type
  const baseStr = type === 'start' ? startDate.value : endDate.value
  const base = baseStr ? new Date(baseStr.replace(/-/g, '/')) : getBeijingNow()
  initWheel(base)
  const by = base.getFullYear()
  const bm = base.getMonth() + 1
  const bd = base.getDate()
  const yIdx = Math.max(0, wheelYears.value.indexOf(by))
  const mIdx = bm - 1
  wheelIndex.value = [yIdx, mIdx, Math.min(bd - 1, (new Date(by, bm, 0).getDate()) - 1)]
  onWheelChange({ detail: { value: wheelIndex.value } })
}

const closeDatePicker = () => { datePicker.show = false }

const onWheelChange = (e) => {
  const [yIdx, mIdx, dIdx] = e.detail.value
  wheelIndex.value = [yIdx, mIdx, dIdx]
  const year = wheelYears.value[yIdx]
  const month = wheelMonths.value[mIdx]
  const dim = new Date(year, month, 0).getDate()
  wheelDays.value = Array.from({ length: dim }, (_, i) => i + 1)
  if (dIdx > dim - 1) wheelIndex.value[2] = dim - 1
}

const confirmWheel = () => {
  const [yIdx, mIdx, dIdx] = wheelIndex.value
  const y = wheelYears.value[yIdx]
  const m = wheelMonths.value[mIdx]
  const d = wheelDays.value[dIdx]
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  if (datePicker.type === 'start') startDate.value = iso
  if (datePicker.type === 'end') endDate.value = iso
  closeDatePicker()
}

// ... existing code ...
const goBack = () => {
  uni.navigateBack()
}

// 月份导航功能
const prevMonth = () => {
  if (currentMonthIndex.value > 0) {
    currentMonthIndex.value--
  }
}

const nextMonth = () => {
  if (currentMonthIndex.value < totalMonths.value - 1) {
    currentMonthIndex.value++
  }
}

// 重新排班
const clearSchedule = () => {
  uni.showModal({
    title: '重新排班',
    content: '确定要清空当前排班重新开始吗？',
    success: (res) => {
      if (res.confirm) {
        // 清空页面数据
        scheduleData.value = null
        startDate.value = ''
        endDate.value = ''
        currentMonthIndex.value = 0
        
        // 清空本地存储的排班数据
        uni.removeStorageSync('duty_schedule_data')
        
        uni.showToast({ title: '已清空，请重新排班', icon: 'success' })
      }
    }
  })
}

const publish = async () => {
  if (!startDate.value || !endDate.value) {
    uni.showToast({ title: '请选择完整日期', icon: 'none' })
    return
  }
  
  uni.showLoading({ title: '正在发布...' })
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('用户未登录')

    // 1. 获取宿舍ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('dormitory_id')
      .eq('id', user.id)
      .single()

    if (!profile?.dormitory_id) throw new Error('未找到宿舍信息')

    // 【新增】重新发布前清空历史打卡记录，确保新排班表是干净的
    const { error: clearError } = await supabase
      .from('checkins')
      .delete()
      .eq('dormitory_id', profile.dormitory_id)
    
    if (clearError) console.error('清空旧打卡记录失败:', clearError)

    // 2. 构造数据
    const dutyData = {
      mode: 'P',
      startDate: startDate.value,
      endDate: endDate.value,
      publishTime: new Date().toISOString(),
      schedule: [], 
      checkins: [], // 初始打卡为空，由checkins表动态加载
      members: [],  // 由系统动态获取
      cycleStatus: 'active'
    }

    // 3. 写入云端 schedules 表
    const { error: upsertError } = await supabase
      .from('schedules')
      .upsert({
        dormitory_id: profile.dormitory_id,
        schedule_data: dutyData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'dormitory_id' })

    if (upsertError) throw upsertError

    // 4. 同步更新宿舍表的模式（防御性操作）
    await supabase
      .from('dormitories')
      .update({ duty_mode: 'P' })
      .eq('id', profile.dormitory_id)

    // 5. 保存本地缓存并触发事件
    uni.setStorageSync('duty_schedule_data', dutyData)
    uni.setStorageSync('duty_mode', 'P')
    scheduleData.value = dutyData
    
    uni.$emit('dutyScheduleStorageUpdated', dutyData)
    
    uni.hideLoading()
    uni.showToast({ 
      title: '发布成功', 
      icon: 'success',
      success: () => {
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/manager-duty-table/manager-duty-table' })
        }, 1500)
      }
    })
  } catch (e) {
    uni.hideLoading()
    console.error('发布失败:', e)
    uni.showToast({ title: e.message || '发布失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.p-container { min-height: 100vh; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 80rpx 40rpx 40rpx; overflow-y: auto; }
.bg-gradient { position: fixed; inset: 0; background: linear-gradient(135deg, #a8e6cf, #88d8a3); z-index: -1; }

.back-icon { position: fixed; left: 24rpx; top: 24rpx; width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,.9); display:flex; align-items:center; justify-content:center; box-shadow: 0 8rpx 20rpx rgba(0,0,0,.08); z-index: 10; }
.arrow { font-size: 52rpx; line-height: 1; color:#2e7d32; transform: translateX(-4rpx); }
.p-card { width: 100%; max-width: 750rpx; background: rgba(255,255,255,.95); border-radius: 40rpx; padding: 40rpx; box-shadow: 0 20rpx 60rpx rgba(0,0,0,.1); box-sizing: border-box; margin-bottom: 20rpx; }
.header { text-align: center; margin-bottom: 30rpx; }
.title { display:block; font-size: 40rpx; font-weight: 700; color:#333; }
.subtitle { display:block; color:#888; font-size: 26rpx; margin-top: 6rpx; }

/* 表单区域 */
.form-section { display: flex; flex-direction: column; gap: 20rpx; }
.form-group { margin-bottom: 0; }
.form-label { display:block; color:#555; font-size: 26rpx; margin-bottom: 10rpx; font-weight: 500; }
.input-wrapper { border:3rpx solid #e1e5e9; border-radius: 20rpx; background:#f8f9fa; padding: 22rpx 26rpx; }
.input-text { color:#333; font-size: 28rpx; }
.primary-btn { width:100%; padding: 26rpx 0; border-radius: 28rpx; background: linear-gradient(135deg, #a8e6cf, #88d8a3); color:#fff; font-size: 30rpx; font-weight: 600; margin-top: 10rpx; }

/* 预览区域 */
.preview-section { display: flex; flex-direction: column; gap: 16rpx; }
.preview-title { display: block; font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; text-align: center; }
.single-month-view { background: #fff; border-radius: 16rpx; padding: 16rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.08); }
.calendar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; padding: 0 8rpx; }
.month-text { font-size: 30rpx; font-weight: 600; color: #333; text-align: center; flex: 1; }
.nav-arrow { font-size: 32rpx; color: #88d8a3; padding: 6rpx 12rpx; cursor: pointer; user-select: none; border-radius: 6rpx; transition: background-color 0.2s; }
.nav-arrow:active { background-color: rgba(136, 216, 163, 0.1); }
.weekday-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6rpx; margin-bottom: 6rpx; }
.weekday { text-align: center; color: #888; font-size: 20rpx; font-weight: 500; padding: 6rpx 0; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6rpx; }
.calendar-day { min-height: 60rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6rpx; position: relative; }
.day-number { font-size: 20rpx; color: #333; font-weight: 500; }
.in-range { background: rgba(136, 216, 163, 0.15); border-radius: 6rpx; }
.month-info { display: block; font-size: 22rpx; color: #888; text-align: center; margin-top: 8rpx; }
.reschedule-btn { width: 100%; padding: 20rpx 0; background: linear-gradient(135deg, #a8e6cf, #88d8a3); border-radius: 24rpx; color: #fff; font-size: 28rpx; font-weight: 600; margin-top: 16rpx; }

/* 日期选择器弹窗样式 */
.dp-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display:flex; align-items:flex-end; justify-content:center; padding: 30rpx; box-sizing: border-box; }
.dp-panel { width: 100%; max-width: 750rpx; background:#fff; border-radius: 24rpx; padding: 20rpx; box-sizing: border-box; }
.dp-header { display:flex; align-items:center; justify-content:center; padding: 10rpx 6rpx 14rpx; }
.dp-title { font-size: 30rpx; color:#333; }
.dp-actions { margin-top: 16rpx; display:flex; justify-content:flex-end; }
.wheel { width: 100%; height: 420rpx; }
.wheel-item { height: 72rpx; line-height: 72rpx; text-align:center; font-size: 30rpx; color:#333; }
</style>


