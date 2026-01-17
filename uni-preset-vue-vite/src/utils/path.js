// 路径别名配置
export const resolvePath = (path) => {
  // 处理 @ 别名
  if (path.startsWith('@/')) {
    return path.replace('@/', '/src/')
  }
  return path
}

// 常用路径
export const PATHS = {
  API: '/api',
  STATIC: '/static',
  PAGES: '/pages',
  COMPONENTS: '/components'
}
