<template>
  <view class="auto-container">
    <view class="bg-gradient"></view>
    <!-- 返回图标 -->
    <view class="back-icon" @tap="goBack">
      <text class="arrow">‹</text>
    </view>

    

    <view class="auto-card">
      <!-- 标题 -->
      <view class="header">
        <text class="title">J人模式</text>
        <text class="subtitle">请设置参数后生成值班表</text>
      </view>

      <!-- 排版模式 -->
      <view class="form-group">
        <text class="form-label">排版模式</text>
        <view class="segment">
          <view class="seg-item" :class="{active: form.mode==='auto'}" @tap="form.mode='auto'">自动排班</view>
          <view class="seg-item" :class="{active: form.mode==='manual'}" @tap="form.mode='manual'">手动排班</view>
        </view>
      </view>

      <!-- 自动排班设置 -->
      <view v-if="form.mode==='auto'">

      <!-- 开始时间 -->
      <view class="form-group">
        <text class="form-label">开始日期</text>
        <view class="input-wrapper" @tap="openDatePicker('start')">
          <text class="input-text">{{ form.startDate || '请选择开始日期' }}</text>
        </view>
      </view>

      <!-- 结束时间 -->
      <view class="form-group">
        <text class="form-label">结束日期</text>
        <view class="input-wrapper" @tap="openDatePicker('end')">
          <text class="input-text">{{ form.endDate || '请选择结束日期' }}</text>
        </view>
      </view>

      <!-- 轮换频率（每隔 N 天轮换） -->
      <view class="form-group">
        <text class="form-label">轮换频率</text>
        <picker mode="selector" :range="freqOptions" :value="freqIndex" @change="onFreqChange">
          <view class="input-wrapper">
            <text class="input-text">每 {{ form.frequency }} 天</text>
          </view>
        </picker>
      </view>

      <!-- 值班人员（每行一个名字，留空则用本地缓存或默认） -->
      <view class="form-group">
        <text class="form-label">值班人员（每行一个）</text>
        <view class="input-wrapper">
          <textarea class="form-input textarea" v-model="form.membersText" :auto-height="true" placeholder="例如\n张三\n李四\n王五" placeholder-class="placeholder" />
        </view>
        <view style="display:flex; gap: 16rpx; margin-top: 16rpx;">
          <button class="ghost-btn" @tap="fillAutoMembersFromDorm">用宿舍成员填充</button>
          <button class="ghost-btn" @tap="sortAutoMembersAZ">按名称排序</button>
        </view>
        <view class="member-grid" style="margin-top: 12rpx;">
          <view class="member-chip" v-for="(m,i) in autoMembers" :key="m + i" :class="{active: m===autoActive}" @tap="autoActive=m">
            {{ m }}
            <text style="margin-left:10rpx; color:#2e7d32;" @tap.stop="moveAutoMemberUp(i)">↑</text>
            <text style="margin-left:6rpx; color:#2e7d32;" @tap.stop="moveAutoMemberDown(i)">↓</text>
          </view>
        </view>
      </view>

      

      <!-- 生成按钮 -->
      <button class="primary-btn" v-if="form.mode==='auto'" @tap="generateSchedule">生成值班表</button>

      <!-- 日历预览（自动排班生成后展示） - 单月视图 -->
      <view v-if="form.mode==='auto' && generatedMonths.length" class="calendar-preview">
        <text class="preview-title">排班预览</text>
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
            <view class="cell" v-for="(c,idx) in currentMonthCells" :key="idx">
              <text class="daynum" v-if="c.day">{{ c.day }}</text>
              <text class="duty" v-if="c.title">{{ c.title }}</text>
            </view>
          </view>
        </view>
        <text class="month-info">{{ currentMonthIndex + 1 }} / {{ generatedMonths.length }} 月</text>
      </view>

      </view>

      <!-- 手动排班视图 -->
      <view v-if="form.mode==='manual'" class="manual-wrap">
        <view class="form-group">
          <text class="form-label">宿舍成员（每行一个）</text>
          <view class="input-wrapper">
            <textarea class="form-input textarea" v-model="manualMembersText" :auto-height="true" placeholder="例如\n张三\n李四\n王五" placeholder-class="placeholder" />
          </view>
          <button class="ghost-btn" style="margin-top: 16rpx" @tap="updateManualMembers">更新成员</button>
        </view>
        <view class="member-board">
          <text class="member-title">宿舍成员（点击后再点日期）</text>
          <view class="member-grid">
            <view class="member-chip" v-for="m in manualMembers" :key="m" :class="{active: m===activeMember}" @tap="selectMember(m)">{{ m }}</view>
          </view>
          <view style="display:flex; gap: 16rpx; margin-top: 16rpx;">
            <button class="ghost-btn" @tap="fillManualMembersFromDorm">用宿舍成员填充</button>
            <button class="ghost-btn" @tap="moveActiveManualUp">上移当前</button>
            <button class="ghost-btn" @tap="moveActiveManualDown">下移当前</button>
          </view>
        </view>
        <view class="calendar-card">
          <view class="calendar-header with-nav">
            <text class="nav-arrow" @tap="manualPrevMonth">‹</text>
            <text>{{ manualYear }}年{{ manualMonth }}月</text>
            <text class="nav-arrow" @tap="manualNextMonth">›</text>
          </view>
          <view class="weekday-row">
            <text class="weekday" v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</text>
          </view>
          <view class="calendar-grid">
            <view 
              class="cell" 
              v-for="(c,idx) in manualCells" 
              :key="idx" 
              :class="{ 
                'today': isToday(c.day),
                'has-duty': c.title
              }"
              @tap="c.day && manualAssign(c.day)"
              @longpress="c.day && clearManualCell(c.day)"
            >
              <text class="daynum" v-if="c.day">{{ c.day }}</text>
              <text class="duty" v-if="c.title">{{ c.title }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 发布按钮 -->
      <button class="publish-btn" @tap="publish">发布</button>
      
      <!-- 重新排班按钮 -->
      <button class="reschedule-btn" @tap="clearSchedule">重新排班</button>
    </view>
  </view>

  <!-- 自定义数字滚轮日期选择器 -->
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
import { reactive, ref, computed, onUnmounted, onMounted } from 'vue'

const form = reactive({
  mode: 'auto',
  startDate: '',
  endDate: '',
  frequency: 1,
  membersText: ''
})

// 北京时间工具与默认开始时间
function getBeijingNow() {
  const now = new Date()
  const utcTs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcTs + 8 * 3600000)
}
function formatISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

// 初始化表单数据
form.startDate = form.startDate || formatISO(getBeijingNow())

// 自定义数字滚轮日期选择器状态
const datePicker = reactive({ show: false, type: 'start' })

const freqOptions = Array.from({length: 7}, (_,i)=> i+1)
const freqIndex = ref(0)

const generatedMonths = ref([])
// 手动排班数据
const manualYear = ref(getBeijingNow().getFullYear())
const manualMonth = ref(getBeijingNow().getMonth()+1)
const manualCells = ref([])
const manualMembers = ref([])
const manualMembersText = ref('')
const activeMember = ref('')

// 自动排班成员调序
const autoMembers = ref([])
const autoActive = ref('')

// 单月视图相关
const currentMonthIndex = ref(0)
const currentDisplayMonth = computed(() => {
  if (generatedMonths.value.length === 0) return ''
  const month = generatedMonths.value[currentMonthIndex.value]
  return `${month.year}年${month.month}月`
})
const currentMonthCells = computed(() => {
  if (generatedMonths.value.length === 0) return []
  return generatedMonths.value[currentMonthIndex.value]?.cells || []
})

const wheelYears = ref([])
const wheelMonths = ref([])
const wheelDays = ref([])
const wheelIndex = ref([0,0,0])

const initWheel = (baseDate) => {
  // 提供更宽的年份范围，避免可选年份受限
  const startYear = 1900
  const endYear = 2100
  const len = endYear - startYear + 1
  wheelYears.value = Array.from({length: len}, (_,i)=> startYear + i)
  wheelMonths.value = Array.from({length: 12}, (_,i)=> i+1)
  // 直接使用 baseDate 的年月来计算天数，避免依赖 wheelIndex 导致的年份错乱
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth() + 1
  const dim = new Date(year, month, 0).getDate()
  wheelDays.value = Array.from({length: dim}, (_,i)=> i+1)
}

const openDatePicker = (type) => {
  datePicker.show = true
  datePicker.type = type
  const base = (type==='start' && form.startDate) ? new Date(form.startDate.replace(/-/g,'/'))
              : (type==='end' && form.endDate) ? new Date(form.endDate.replace(/-/g,'/'))
              : getBeijingNow()
  const by = base.getFullYear()
  const bm = base.getMonth()+1
  const bd = base.getDate()
  initWheel(base)
  const yIdx = Math.max(0, wheelYears.value.indexOf(by))
  const mIdx = bm-1
  wheelIndex.value = [yIdx, mIdx, Math.min(bd-1, (new Date(by,bm,0).getDate())-1)]
  // 重新根据年月刷新天数
  onWheelChange({ detail: { value: wheelIndex.value } })
}

const closeDatePicker = () => { datePicker.show = false }

const onWheelChange = (e) => {
  const [yIdx, mIdx, dIdx] = e.detail.value
  wheelIndex.value = [yIdx, mIdx, dIdx]
  const year = wheelYears.value[yIdx]
  const month = wheelMonths.value[mIdx]
  const dim = new Date(year, month, 0).getDate()
  wheelDays.value = Array.from({length: dim}, (_,i)=> i+1)
  // 修正天索引越界
  if (dIdx > dim-1) wheelIndex.value[2] = dim-1
}

const confirmWheel = () => {
  const [yIdx, mIdx, dIdx] = wheelIndex.value
  const y = wheelYears.value[yIdx]
  const m = wheelMonths.value[mIdx]
  const d = wheelDays.value[dIdx]
  const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  if (datePicker.type==='start') form.startDate = iso
  if (datePicker.type==='end') form.endDate = iso
  closeDatePicker()
}

// 手动排班：成员与日历
function ensureManualMembers() {
  const listFromText = (manualMembersText.value||'').split(/\n+/).map(s=>s.trim()).filter(Boolean)
  const list = listFromText.length ? listFromText : parseMembers()
  manualMembers.value = list
  if (!activeMember.value && list.length) activeMember.value = list[0]
}

function buildManualCells() {
  const y = manualYear.value, m = manualMonth.value
  const first = new Date(y, m-1, 1)
  const firstWeekday = first.getDay() // Sunday=0
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells = []
  for (let i=0;i<firstWeekday;i++) cells.push({})
  for (let d=1; d<=daysInMonth; d++) cells.push({ day:d, title:'' })
  const remainder = cells.length % 7
  if (remainder) for (let i=0;i<7-remainder;i++) cells.push({})
  manualCells.value = cells
}

const selectMember = (m) => { activeMember.value = m }

// 保存当前月份的数据
const saveCurrentMonthData = () => {
  const monthKey = `${manualYear.value}-${String(manualMonth.value).padStart(2, '0')}`
  const monthData = {
    key: monthKey,
    year: manualYear.value,
    month: manualMonth.value,
    cells: [...manualCells.value] // 深拷贝当前单元格数据
  }
  
  // 保存到本地存储
  try {
    let existingData = uni.getStorageSync('duty_schedule_data')
    let existingGeneratedMonths = []
    
    // 如果没有现有数据，创建新的数据结构
    if (!existingData) {
      existingData = {
        mode: 'J',
        scheduleType: 'manual',
        schedule: [],
        generatedMonths: [],
        members: manualMembers.value,
        publishTime: new Date().toISOString()
      }
    } else if (existingData.scheduleType === 'manual') {
      existingGeneratedMonths = existingData.generatedMonths || []
    } else {
      // 如果之前是自动排班，转换为手动排班
      existingData = {
        mode: 'J',
        scheduleType: 'manual',
        schedule: [],
        generatedMonths: [],
        members: manualMembers.value,
        publishTime: new Date().toISOString()
      }
    }
    
    // 检查是否已存在该月份的数据
    const existingIndex = existingGeneratedMonths.findIndex(m => m.key === monthKey)
    if (existingIndex >= 0) {
      // 更新已存在的月份数据
      existingGeneratedMonths[existingIndex] = monthData
    } else {
      // 添加新的月份数据
      existingGeneratedMonths.push(monthData)
    }
    
    // 更新数据结构
    existingData.generatedMonths = existingGeneratedMonths
    existingData.members = manualMembers.value
    
    // 保存到本地存储
    uni.setStorageSync('duty_schedule_data', existingData)
    console.log('保存月份数据成功:', monthKey, monthData)
  } catch (e) {
    console.error('保存月份数据失败:', e)
  }
}

// 加载指定月份的数据
const loadMonthData = (year, month) => {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  
  try {
    const existingData = uni.getStorageSync('duty_schedule_data')
    if (existingData && existingData.scheduleType === 'manual') {
      const existingGeneratedMonths = existingData.generatedMonths || []
      const monthData = existingGeneratedMonths.find(m => m.key === monthKey)
      
      if (monthData && monthData.cells) {
        // 恢复已保存的月份数据
        manualCells.value = [...monthData.cells]
        console.log('加载月份数据成功:', monthKey, monthData)
        return
      }
    }
  } catch (e) {
    console.error('加载月份数据失败:', e)
  }
  
  // 如果没有找到已保存的数据，生成新的空日历
  console.log('未找到月份数据，生成新日历:', monthKey)
  buildManualCells()
}

const manualPrevMonth = () => { 
  // 保存当前月份数据
  saveCurrentMonthData()
  
  // 切换到上个月
  if (--manualMonth.value < 1) { 
    manualMonth.value = 12
    manualYear.value-- 
  }
  
  // 加载上个月的数据
  loadMonthData(manualYear.value, manualMonth.value)
}

const manualNextMonth = () => { 
  // 保存当前月份数据
  saveCurrentMonthData()
  
  // 切换到下个月
  if (++manualMonth.value > 12) { 
    manualMonth.value = 1
    manualYear.value++ 
  }
  
  // 加载下个月的数据
  loadMonthData(manualYear.value, manualMonth.value)
}
const manualAssign = (day) => {
  if (!activeMember.value) { uni.showToast({ title:'请先选择成员', icon:'none' }); return }
  const idxStart = new Date(manualYear.value, manualMonth.value-1, 1).getDay()
  const idx = idxStart + day - 1
  if (manualCells.value[idx]) manualCells.value[idx].title = activeMember.value
}

// 清除某一天的排班（长按）
const clearManualCell = (day) => {
  const idxStart = new Date(manualYear.value, manualMonth.value-1, 1).getDay()
  const idx = idxStart + day - 1
  if (manualCells.value[idx]) manualCells.value[idx].title = ''
}

// 判断是否为今天
const isToday = (day) => {
  if (!day) return false
  const today = getBeijingNow()
  return manualYear.value === today.getFullYear() && 
         manualMonth.value === today.getMonth() + 1 && 
         day === today.getDate()
}

const updateManualMembers = () => {
  ensureManualMembers()
}

// 初始化手动排班数据
ensureManualMembers()
buildManualCells()

const onFreqChange = e => {
  const idx = Number(e.detail.value)
  freqIndex.value = idx
  form.frequency = freqOptions[idx]
}

const goBack = () => {
  uni.navigateBack()
}

// 加载已保存的值日表数据
const loadExistingSchedule = () => {
  try {
    const storedData = uni.getStorageSync('duty_schedule_data')
    if (storedData && storedData.mode === 'J') {
      // 根据排班类型加载对应的数据
      if (storedData.scheduleType === 'auto') {
        // 自动排班数据
        if (storedData.startDate) form.startDate = storedData.startDate
        if (storedData.endDate) form.endDate = storedData.endDate
        if (storedData.frequency) form.frequency = storedData.frequency
        if (storedData.members) {
          form.membersText = storedData.members.join('\n')
        }
        if (storedData.generatedMonths) {
          generatedMonths.value = storedData.generatedMonths
        }
        form.mode = 'auto'
      } else if (storedData.scheduleType === 'manual') {
        // 手动排班数据
        manualMembers.value = storedData.members || []
        manualMembersText.value = (storedData.members || []).join('\n')
        form.mode = 'manual'
        
        // 加载当前月份的数据
        loadMonthData(manualYear.value, manualMonth.value)
      }
      
      console.log('已加载保存的值日表数据')
    }
  } catch (e) {
    console.error('加载值日表数据失败:', e)
  }
}

// 页面加载时恢复数据
loadExistingSchedule()
// 初次进入手动排班也尝试从本地载入当前月缓存
if (form.mode === 'manual') {
  loadMonthData(manualYear.value, manualMonth.value)
}

// 页面显示时隐藏 tabBar
onMounted(() => {
  uni.hideTabBar()
})

// 页面卸载时保存当前数据并恢复 tabBar
onUnmounted(() => {
  if (form.mode === 'manual') {
    saveCurrentMonthData()
  }
  // 恢复 tabBar（当返回 tabBar 页面时会自动显示）
})

function parseMembers() {
  const fromCache = uni.getStorageSync('selectedMembers') || []
  // 优先使用自动成员调序结果
  const fromAuto = autoMembers.value && autoMembers.value.length ? autoMembers.value : []
  const input = (form.membersText||'').split(/\n+/).map(s=>s.trim()).filter(Boolean)
  const dormMembers = getDormMembers()
  const list = input.length ? input 
    : (fromAuto.length ? fromAuto 
      : (dormMembers.length ? dormMembers 
        : (Array.isArray(fromCache)&&fromCache.length?fromCache: ['甲','乙','丙','丁','戊'])))
  return list
}

function eachDate(startStr, endStr) {
  const out = []
  if (!startStr || !endStr) return out
  const s = new Date(startStr.replace(/-/g,'/'))
  const e = new Date(endStr.replace(/-/g,'/'))
  if (isNaN(s) || isNaN(e) || s>e) return out
  for (let d=new Date(s); d<=e; d.setDate(d.getDate()+1)) {
    const y = d.getFullYear()
    const m = d.getMonth()+1
    const day = d.getDate()
    const iso = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    out.push({ y,m,day,iso, weekday: d.getDay() }) // Sunday=0
  }
  return out
}

function buildSchedule() {
  const people = parseMembers()
  const dates = eachDate(form.startDate, form.endDate)
  const schedule = new Map()
  if (!dates.length || !people.length) return schedule

  // 每隔 N 天轮换
  let personIdx = 0
  let stayCount = 0
  for (const d of dates) {
    schedule.set(d.iso, people[personIdx])
    stayCount += 1
    if (stayCount >= Number(form.frequency||1)) {
      stayCount = 0
      personIdx = (personIdx+1) % people.length
    }
  }
  return schedule
}

// 读宿舍成员（包含管理者与已加入的成员）
function getDormMembers() {
  try {
    const manager = uni.getStorageSync('manager_profile') || {}
    const members = uni.getStorageSync('dormitory_members') || []
    const names = []
    if (manager && manager.userName) names.push(manager.userName)
    for (const m of members) {
      if (m && m.name) names.push(m.name)
    }
    // 去重
    return Array.from(new Set(names))
  } catch (e) { return [] }
}

// 自动排班区域：填充与排序控制
function fillAutoMembersFromDorm() {
  const list = getDormMembers()
  if (!list.length) { uni.showToast({ title:'暂无宿舍成员', icon:'none' }); return }
  autoMembers.value = [...list]
  autoActive.value = autoMembers.value[0]
  form.membersText = autoMembers.value.join('\n')
}
function sortAutoMembersAZ() {
  if (!autoMembers.value.length) return
  autoMembers.value = [...autoMembers.value].sort((a,b)=>a.localeCompare(b))
  form.membersText = autoMembers.value.join('\n')
}
function moveAutoMemberUp(index){
  if (index<=0) return
  const arr = [...autoMembers.value]
  ;[arr[index-1], arr[index]] = [arr[index], arr[index-1]]
  autoMembers.value = arr
  form.membersText = arr.join('\n')
}
function moveAutoMemberDown(index){
  const arr = [...autoMembers.value]
  if (index>=arr.length-1) return
  ;[arr[index+1], arr[index]] = [arr[index], arr[index+1]]
  autoMembers.value = arr
  form.membersText = arr.join('\n')
}

// 手动排班区域：填充宿舍成员与顺序调整
function fillManualMembersFromDorm() {
  const list = getDormMembers()
  if (!list.length) { uni.showToast({ title:'暂无宿舍成员', icon:'none' }); return }
  manualMembers.value = [...list]
  manualMembersText.value = manualMembers.value.join('\n')
  if (!activeMember.value && manualMembers.value.length) activeMember.value = manualMembers.value[0]
}
function moveActiveManualUp(){
  const idx = manualMembers.value.indexOf(activeMember.value)
  if (idx<=0) return
  const arr = [...manualMembers.value]
  ;[arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]]
  manualMembers.value = arr
  manualMembersText.value = arr.join('\n')
}
function moveActiveManualDown(){
  const idx = manualMembers.value.indexOf(activeMember.value)
  if (idx<0 || idx>=manualMembers.value.length-1) return
  const arr = [...manualMembers.value]
  ;[arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]]
  manualMembers.value = arr
  manualMembersText.value = arr.join('\n')
}

function toMonthKey(y,m){ return `${y}-${String(m).padStart(2,'0')}` }

function makeMonthCells(year, month, schedule) {
  const first = new Date(year, month-1, 1)
  const firstWeekday = first.getDay() // Sunday=0
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i=0;i<firstWeekday;i++) cells.push({})
  for (let d=1; d<=daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    cells.push({ day: d, title: schedule.get(iso) || '' })
  }
  const remainder = cells.length % 7
  if (remainder) for (let i=0;i<7-remainder;i++) cells.push({})
  return cells
}

const generateSchedule = () => {
  const schedule = buildSchedule()
  if (!schedule.size) {
    uni.showToast({ title: '请先选择有效的开始/结束日期', icon: 'none' })
    return
  }
  const dates = eachDate(form.startDate, form.endDate)
  const monthMap = new Map()
  for (const d of dates) {
    const mk = toMonthKey(d.y, d.m)
    if (!monthMap.has(mk)) monthMap.set(mk, { year: d.y, month: d.m })
  }
  const months = Array.from(monthMap.values())
  generatedMonths.value = months.map(m => ({
    key: toMonthKey(m.year,m.month),
    year: m.year,
    month: m.month,
    cells: makeMonthCells(m.year, m.month, schedule)
  }))
  uni.showToast({ title: '已生成预览', icon: 'success' })
}

// 月份导航功能
const prevMonth = () => {
  if (currentMonthIndex.value > 0) {
    currentMonthIndex.value--
  }
}

const nextMonth = () => {
  if (currentMonthIndex.value < generatedMonths.value.length - 1) {
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
        // 清空所有排班数据
        generatedMonths.value = []
        manualCells.value = []
        
        // 清空表单数据
        form.startDate = ''
        form.endDate = ''
        form.frequency = 1
        form.membersText = ''
        
        // 清空本地存储的排班数据
        uni.removeStorageSync('duty_schedule_data')
        
        // 重新构建手动排班单元格
        buildManualCells()
        
        uni.showToast({ title: '已清空，请重新排班', icon: 'success' })
      }
    }
  })
}

const publish = () => {
  if (form.mode === 'auto') {
    if (!generatedMonths.value.length) {
      // 自动排班需要先生成
      uni.showToast({ title: '请先生成值班表', icon: 'none' })
      return
    }
  } else if (form.mode === 'manual') {
    // 手动排班需要检查是否有排班数据
    const hasSchedule = manualCells.value.some(cell => cell.title)
    if (!hasSchedule) {
      uni.showToast({ title: '请先进行排班', icon: 'none' })
      return
    }
  }
  
  // 保存值日表数据到本地存储
  try {
    let schedule, generatedMonthsData
    
    if (form.mode === 'auto') {
      schedule = buildSchedule()
      generatedMonthsData = generatedMonths.value
    } else {
      // 手动排班模式 - 先保存当前月份数据，然后获取所有已保存的月份数据
      saveCurrentMonthData()
      
      // 获取所有已保存的数据
      const existingData = uni.getStorageSync('duty_schedule_data')
      let existingSchedule = new Map()
      let existingGeneratedMonths = []
      
      if (existingData && existingData.scheduleType === 'manual') {
        existingSchedule = new Map(existingData.schedule || [])
        existingGeneratedMonths = existingData.generatedMonths || []
      }
      
      // 从所有已保存的月份数据中构建完整的排班表
      existingGeneratedMonths.forEach(monthData => {
        if (monthData.cells) {
          monthData.cells.forEach(cell => {
            if (cell.day && cell.title) {
              const date = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
              existingSchedule.set(date, cell.title)
            }
          })
        }
      })
      
      schedule = existingSchedule
      generatedMonthsData = existingGeneratedMonths
    }
    
    const dutyData = {
      mode: 'J',
      scheduleType: form.mode, // 'auto' 或 'manual'
      schedule: Array.from(schedule.entries()),
      generatedMonths: generatedMonthsData,
      startDate: form.mode === 'auto' ? form.startDate : `${manualYear.value}-${String(manualMonth.value).padStart(2, '0')}-01`,
      endDate: form.mode === 'auto' ? form.endDate : `${manualYear.value}-${String(manualMonth.value).padStart(2, '0')}-${new Date(manualYear.value, manualMonth.value, 0).getDate()}`,
      members: form.mode === 'auto' ? parseMembers() : manualMembers.value,
      frequency: form.frequency || 1,
      publishTime: new Date().toISOString()
    }
    // 同步设置当前模式为J，防止其他页面误判
    uni.setStorageSync('duty_mode', 'J')
    uni.setStorageSync('duty_schedule_data', dutyData)
    
    // 【重要】触发全局事件，通知所有成员页面有新的值班表
    uni.$emit('dutyScheduleStorageUpdated', dutyData)
    console.log('[J人模式] 已发送值班表更新事件给成员页面')
  } catch (e) {
    console.error('保存值日表数据失败:', e)
  }
  
  uni.showToast({ 
    title: '已发布', 
    icon: 'success',
    success: () => {
      // 发布成功后跳转到值日表页面
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/manager-duty-table/manager-duty-table' })
      }, 1000)
    }
  })
}
</script>

<style lang="scss" scoped>
.auto-container {
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.bg-gradient { position: fixed; inset: 0; background: linear-gradient(135deg, #a8e6cf, #88d8a3); z-index: -1; }

.back-icon { position: absolute; left: 24rpx; top: 24rpx; width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,.9); display:flex; align-items:center; justify-content:center; box-shadow: 0 8rpx 20rpx rgba(0,0,0,.08); }
.arrow { font-size: 52rpx; line-height: 1; color:#2e7d32; transform: translateX(-4rpx); }

.auto-card {
  width: 100%; max-width: 750rpx;
  background: rgba(255,255,255,.95);
  border-radius: 50rpx;
  padding: 60rpx;
  box-shadow: 0 50rpx 100rpx rgba(0,0,0,.15);
  box-sizing: border-box;
}

.header { text-align: center; margin-bottom: 40rpx; }
.title { display:block; font-size: 44rpx; font-weight: 700; color:#333; }
.subtitle { display:block; color:#888; font-size: 28rpx; margin-top: 6rpx; }

.form-group { margin-bottom: 30rpx; }
.form-label { display:block; color:#555; font-size: 28rpx; margin-bottom: 12rpx; }

.segment { display:flex; gap: 20rpx; }
.seg-item {
  flex: 1; text-align:center; padding: 20rpx 0;
  border-radius: 24rpx; background:#f1f3f5; color:#666; border: 4rpx solid #e1e5e9;
}
.seg-item.active { background: rgba(136,216,163,.15); border-color:#88d8a3; color:#2e7d32; font-weight: 600; }

.week-chip-group { display:flex; gap: 14rpx; flex-wrap: wrap; }
.week-chip { min-width: 88rpx; text-align:center; padding: 16rpx 0; border-radius: 24rpx; background:#f1f3f5; color:#666; border: 4rpx solid #e1e5e9; }
.week-chip.active { background: rgba(136,216,163,.15); border-color:#88d8a3; color:#2e7d32; font-weight: 600; }

.input-wrapper { border:4rpx solid #e1e5e9; border-radius: 24rpx; background:#f8f9fa; padding: 26rpx 30rpx; }
.input-text { color:#333; font-size: 30rpx; }
.form-input { width:100%; font-size:30rpx; color:#333; background:transparent; }
.textarea { min-height: 160rpx; line-height: 1.6; }
.placeholder { color:#999; }

.ghost-btn { width: 300rpx; padding: 22rpx 0; background:#f1f3f5; border-radius: 24rpx; color:#333; }
.primary-btn { width:100%; padding: 30rpx 0; margin: 10rpx 0 30rpx; border-radius: 30rpx; background: linear-gradient(135deg, #a8e6cf, #88d8a3); color:#fff; font-size: 32rpx; font-weight: 600; }

.calendar-preview {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 20rpx;
}

.preview-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  text-align: center;
}

.more-hint {
  display: block;
  font-size: 24rpx;
  color: #666;
  text-align: center;
  margin-top: 10rpx;
}

.single-month-view { 
  background: #fff; 
  border-radius: 16rpx; 
  padding: 20rpx; 
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.calendar-header { 
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 0 10rpx;
}

.month-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
  flex: 1;
}

.nav-arrow { 
  font-size: 36rpx; 
  color: #88d8a3; 
  padding: 8rpx 16rpx;
  cursor: pointer;
  user-select: none;
  border-radius: 8rpx;
  transition: background-color 0.2s;
}

.nav-arrow:active {
  background-color: rgba(136, 216, 163, 0.1);
}

.month-info {
  display: block;
  font-size: 24rpx;
  color: #666;
  text-align: center;
  margin-top: 10rpx;
}
.weekday-row { display:grid; grid-template-columns: repeat(7, 1fr); gap: 6rpx; margin-bottom: 6rpx; }
.weekday { text-align:center; color:#888; font-size: 22rpx; }
.calendar-grid { display:grid; grid-template-columns: repeat(7, 1fr); gap: 6rpx; }
.cell { background:#fff; border: 2rpx solid #e5e7eb; border-radius: 10rpx; padding: 6rpx; min-height: 70rpx; display:flex; flex-direction: column; align-items:center; justify-content:flex-start; overflow: hidden; }
.cell.today { border: 3rpx solid #88d8a3; }
.cell.has-duty { background: rgba(136, 216, 163, 0.15); border-color: #88d8a3; }
.daynum { color:#333; font-size: 22rpx; font-weight: 500; }
.duty { margin-top: 4rpx; color:#2e7d32; font-size: 18rpx; text-align:center; word-break: break-all; line-height: 1.2; }

.publish-btn { width:100%; padding: 28rpx 0; border-radius: 30rpx; background:#f1f3f5; color:#333; font-weight: 600; margin-bottom: 20rpx; }
.reschedule-btn { width:100%; padding: 28rpx 0; border-radius: 30rpx; background: linear-gradient(135deg, #a8e6cf, #88d8a3); color:#fff; font-weight: 600; }

/* 日期选择器弹窗样式 */
.dp-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display:flex; align-items:flex-end; justify-content:center; padding: 30rpx; box-sizing: border-box; }
.dp-panel { width: 100%; max-width: 750rpx; background:#fff; border-radius: 24rpx; padding: 20rpx; box-sizing: border-box; }
.dp-header { display:flex; align-items:center; justify-content:center; padding: 10rpx 6rpx 14rpx; }
.dp-title { font-size: 30rpx; color:#333; }
.dp-actions { margin-top: 16rpx; display:flex; justify-content:flex-end; }
.wheel { width: 100%; height: 420rpx; }
.wheel-item { height: 72rpx; line-height: 72rpx; text-align:center; font-size: 30rpx; color:#333; }

/* 手动排班样式 */
.manual-wrap { display:flex; flex-direction: column; gap: 20rpx; }
.member-board { background:#f8f9fa; border-radius: 24rpx; padding: 24rpx; }
.member-title { display:block; color:#555; font-size: 28rpx; margin-bottom: 12rpx; }
.member-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.member-chip { text-align:center; padding: 18rpx 0; border-radius: 18rpx; background:#e9ecef; color:#333; border: 2rpx solid #dee2e6; }
.member-chip.active { background: rgba(136,216,163,.15); border-color:#88d8a3; color:#2e7d32; font-weight:600; }

@media screen and (max-width: 750rpx) {
  .auto-card { padding: 50rpx 40rpx; }
  .title { font-size: 40rpx; }
}
</style>


