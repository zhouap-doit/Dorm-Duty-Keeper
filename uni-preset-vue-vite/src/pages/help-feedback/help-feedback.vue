<template>
  <view class="feedback-container">
    <view class="bg-gradient"></view>

    <view class="feedback-card">
      <!-- 标题栏 -->
      <view class="header">
        <view class="header-left" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="title">帮助与反馈</text>
        <view class="header-right"></view>
      </view>

      <!-- 帮助内容 -->
      <view class="help-section">
        <text class="section-title">常见问题</text>
        <view class="help-list">
          <view class="help-item" @tap="toggleHelp(0)">
            <view class="help-question">
              <text class="question-text">如何创建宿舍？</text>
              <text class="toggle-icon" :class="{active: expandedHelp[0]}">›</text>
            </view>
            <view v-if="expandedHelp[0]" class="help-answer">
              <text class="answer-text">在选择页面点击"创建宿舍"，填写宿舍名称和您的昵称，选择值日模式即可创建。</text>
            </view>
          </view>

          <view class="help-item" @tap="toggleHelp(1)">
            <view class="help-question">
              <text class="question-text">如何加入宿舍？</text>
              <text class="toggle-icon" :class="{active: expandedHelp[1]}">›</text>
            </view>
            <view v-if="expandedHelp[1]" class="help-answer">
              <text class="answer-text">在选择页面点击"加入宿舍"，输入宿舍名称提交申请，等待宿舍长审核通过即可。</text>
            </view>
          </view>

          <view class="help-item" @tap="toggleHelp(2)">
            <view class="help-question">
              <text class="question-text">J人模式和P人模式有什么区别？</text>
              <text class="toggle-icon" :class="{active: expandedHelp[2]}">›</text>
            </view>
            <view v-if="expandedHelp[2]" class="help-answer">
              <text class="answer-text">J人模式：自动排班，成员无需手动打卡；P人模式：手动排班，成员需要上传值日照片和描述。</text>
            </view>
          </view>

          <view class="help-item" @tap="toggleHelp(3)">
            <view class="help-question">
              <text class="question-text">如何设置提醒时间？</text>
              <text class="toggle-icon" :class="{active: expandedHelp[3]}">›</text>
            </view>
            <view v-if="expandedHelp[3]" class="help-answer">
              <text class="answer-text">在管理人员首页点击"设置提醒时间"，选择提醒时间即可。只有J人模式下可以使用此功能。</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 反馈表单 -->
      <view class="feedback-section">
        <text class="section-title">意见反馈</text>
        <view class="feedback-form">
          <view class="input-group">
            <text class="label">反馈类型</text>
            <view class="type-selector">
              <view 
                v-for="(type, index) in feedbackTypes" 
                :key="index"
                class="type-item"
                :class="{active: selectedType === index}"
                @tap="selectType(index)"
              >
                <text class="type-text">{{ type }}</text>
              </view>
            </view>
          </view>

          <view class="input-group">
            <text class="label">反馈内容</text>
            <textarea 
              class="textarea" 
              v-model="feedbackContent" 
              placeholder="请详细描述您遇到的问题或建议..." 
              placeholder-class="placeholder"
              maxlength="500"
            />
            <text class="char-count">{{ feedbackContent.length }}/500</text>
          </view>

          <view class="input-group">
            <text class="label">联系方式（可选）</text>
            <input 
              class="input" 
              v-model="contactInfo" 
              placeholder="请输入您的联系方式，方便我们回复" 
              placeholder-class="placeholder"
              maxlength="50"
            />
          </view>
        </view>

        <view class="submit-section">
          <button 
            class="submit-btn" 
            :disabled="!canSubmit" 
            :class="{disabled: !canSubmit}" 
            @tap="submitFeedback"
          >
            提交反馈
          </button>
          <text class="hint">我们会认真处理您的反馈</text>
        </view>
      </view>
    </view>

    <!-- 加载遮罩 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-content">
        <text class="loading-text">提交中...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

// 响应式数据
const expandedHelp = ref([false, false, false, false])
const feedbackTypes = ref(['功能建议', '问题反馈', '界面优化', '其他'])
const selectedType = ref(0)
const feedbackContent = ref('')
const contactInfo = ref('')
const loading = ref(false)

// 计算属性：是否可以提交
const canSubmit = computed(() => {
  return feedbackContent.value.trim().length >= 10
})

// 切换帮助展开状态
const toggleHelp = (index) => {
  expandedHelp.value[index] = !expandedHelp.value[index]
}

// 选择反馈类型
const selectType = (index) => {
  selectedType.value = index
}

// 提交反馈
const submitFeedback = async () => {
  if (!canSubmit.value) {
    uni.showToast({ title: '请至少输入10个字符', icon: 'none' })
    return
  }

  loading.value = true

  try {
    // 模拟提交反馈（实际需要调用后端API）
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 保存反馈信息到本地存储（模拟）
    const feedbackData = {
      type: feedbackTypes.value[selectedType.value],
      content: feedbackContent.value.trim(),
      contact: contactInfo.value.trim(),
      submitTime: new Date().toISOString(),
      status: 'pending' // pending, processed
    }
    
    // 获取现有反馈列表
    let feedbacks = []
    try {
      feedbacks = uni.getStorageSync('user_feedbacks') || []
    } catch (e) {}
    
    feedbacks.push(feedbackData)
    uni.setStorageSync('user_feedbacks', feedbacks)
    
    uni.showToast({ 
      title: '反馈已提交', 
      icon: 'success',
      duration: 2000
    })
    
    // 清空表单
    feedbackContent.value = ''
    contactInfo.value = ''
    selectedType.value = 0
    
  } catch (error) {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 返回
const goBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.feedback-container {
  min-height: 100vh;
  position: relative;
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

.feedback-card {
  width: 100%;
  max-width: 750rpx;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 50rpx;
  padding: 40rpx;
  box-shadow: 0 50rpx 100rpx rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.header-left {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #333;
  font-weight: bold;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
}

.header-right {
  width: 80rpx;
}

.help-section {
  margin-bottom: 60rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

.help-list {
  background: #f8f9fa;
  border-radius: 24rpx;
  overflow: hidden;
  border: 4rpx solid #e1e5e9;
}

.help-item {
  border-bottom: 2rpx solid #eef2f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.help-question {
  padding: 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
  
  &:active {
    background-color: #f0f0f0;
  }
}

.question-text {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.toggle-icon {
  font-size: 32rpx;
  color: #999;
  transition: transform 0.3s ease;
  
  &.active {
    transform: rotate(90deg);
  }
}

.help-answer {
  padding: 0 32rpx 32rpx;
  background: #fff;
}

.answer-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.feedback-section {
  margin-bottom: 40rpx;
}

.feedback-form {
  margin-bottom: 40rpx;
}

.input-group {
  margin-bottom: 32rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.type-item {
  padding: 16rpx 24rpx;
  background: #f8f9fa;
  border: 2rpx solid #e1e5e9;
  border-radius: 20rpx;
  transition: all 0.2s ease;
  
  &.active {
    background: #88d8a3;
    border-color: #88d8a3;
  }
}

.type-text {
  font-size: 26rpx;
  color: #333;
  
  .type-item.active & {
    color: white;
  }
}

.textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 24rpx;
  background: #f8f9fa;
  border: 4rpx solid #e1e5e9;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  resize: none;
  
  &:focus {
    border-color: #88d8a3;
    background: #fff;
  }
}

.input {
  width: 100%;
  padding: 24rpx;
  background: #f8f9fa;
  border: 4rpx solid #e1e5e9;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  
  &:focus {
    border-color: #88d8a3;
    background: #fff;
  }
}

.placeholder {
  color: #999;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

.submit-section {
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 32rpx 0;
  background: linear-gradient(135deg, #a8e6cf, #88d8a3);
  color: #333;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  border-radius: 24rpx;
  margin-bottom: 16rpx;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
  
  &.disabled {
    opacity: 0.6;
    background: #e9ecef;
    color: #999;
  }
}

.hint {
  display: block;
  font-size: 24rpx;
  color: #999;
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
  .feedback-card {
    padding: 30rpx;
  }
  
  .type-selector {
    gap: 12rpx;
  }
  
  .type-item {
    padding: 12rpx 20rpx;
  }
  
  .type-text {
    font-size: 24rpx;
  }
}
</style>
