import {
	createSSRApp
} from "vue";
import App from "./App.vue";

// 简化错误处理 - 只在H5环境下处理sessionStorage问题
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
	// 防止 sessionStorage 访问错误
	try {
		window.sessionStorage;
	} catch (e) {
		console.warn('sessionStorage 不可用，使用替代方案');
		// 创建一个模拟的 sessionStorage
		window.sessionStorage = {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {}
		};
	}
}

// 监听 localStorage 变化，用于跨标签页数据同步
if (typeof window !== 'undefined') {
	window.addEventListener('storage', (event) => {
		// 检测到 duty_schedule_data（值班表）变化
		if (event.key === 'duty_schedule_data' && event.newValue) {
			console.log('[全局监听] 检测到值班表更新')
			try {
				const newData = JSON.parse(event.newValue)
				// 触发全局事件，通知所有成员页面
				if (typeof uni !== 'undefined') {
					uni.$emit('dutyScheduleStorageUpdated', newData)
				}
				console.log('[全局监听] 已发送更新事件给成员页面')
			} catch (e) {
				console.error('[全局监听] 解析值班表数据失败:', e)
			}
		}
		
		// 检测到 duty_mode（值日模式）变化
		if (event.key === 'duty_mode' && event.newValue) {
			console.log('[全局监听] 检测到值日模式更新为:', event.newValue)
			if (typeof uni !== 'undefined') {
				uni.$emit('dutyModeStorageUpdated', event.newValue)
			}
		}
	});
}

export function createApp() {
	const app = createSSRApp(App);
	return {
		app,
	};
}
