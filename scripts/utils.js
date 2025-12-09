/**
 * 工具函数模块
 * 包含碰撞检测、粒子系统、数学工具等
 */

// ==================== 碰撞检测 ====================

/**
 * 圆形与矩形碰撞检测
 * @param {number} circleX - 圆心X
 * @param {number} circleY - 圆心Y
 * @param {number} radius - 圆半径
 * @param {number} rectX - 矩形左上角X
 * @param {number} rectY - 矩形左上角Y
 * @param {number} rectW - 矩形宽度
 * @param {number} rectH - 矩形高度
 * @returns {boolean} 是否碰撞
 */
function circleRectCollision(circleX, circleY, radius, rectX, rectY, rectW, rectH) {
  const closestX = Math.max(rectX, Math.min(circleX, rectX + rectW))
  const closestY = Math.max(rectY, Math.min(circleY, rectY + rectH))
  const distX = circleX - closestX
  const distY = circleY - closestY
  return distX * distX + distY * distY < radius * radius
}

/**
 * 计算圆形与矩形碰撞的反弹方向
 * @param {Object} ball - 小球对象 {x, y, dx, dy}
 * @param {Object} rect - 矩形对象 {x, y, width, height}
 * @param {number} radius - 小球半径
 * @returns {Object} 新的速度 {dx, dy}
 */
function calculateBounce(ball, rect, radius) {
  const overlapLeft = ball.x + radius - rect.x
  const overlapRight = rect.x + rect.width - (ball.x - radius)
  const overlapTop = ball.y + radius - rect.y
  const overlapBottom = rect.y + rect.height - (ball.y - radius)

  const minOverlapX = Math.min(overlapLeft, overlapRight)
  const minOverlapY = Math.min(overlapTop, overlapBottom)

  let newDx = ball.dx
  let newDy = ball.dy

  if (minOverlapX < minOverlapY) {
    newDx = -ball.dx
  } else {
    newDy = -ball.dy
  }

  return { dx: newDx, dy: newDy }
}

// ==================== 粒子系统 ====================

/**
 * 创建爆炸粒子
 * @param {number} x - 爆炸中心X
 * @param {number} y - 爆炸中心Y
 * @param {string} color - 粒子颜色
 * @param {number} count - 粒子数量
 * @returns {Array} 粒子数组
 */
function createExplosionParticles(x, y, color, count = 8) {
  const particles = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count
    particles.push({
      x: x,
      y: y,
      dx: Math.cos(angle) * (2 + Math.random() * 2),
      dy: Math.sin(angle) * (2 + Math.random() * 2),
      life: 25,
      maxLife: 25,
      color: color,
    })
  }
  return particles
}

/**
 * 更新粒子状态
 * @param {Array} particles - 粒子数组
 * @param {number} gravity - 重力加速度
 * @returns {Array} 更新后的存活粒子
 */
function updateParticles(particles, gravity = 0.1) {
  return particles.filter((p) => {
    p.x += p.dx
    p.y += p.dy
    p.dy += gravity
    p.life--
    return p.life > 0
  })
}

// ==================== 数学工具 ====================

/**
 * 限制数值在指定范围内
 * @param {number} value - 输入值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的值
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * 随机整数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机整数
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 随机浮点数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机浮点数
 */
function randomFloat(min, max) {
  return Math.random() * (max - min) + min
}

// ==================== 绘图工具 ====================

/**
 * 绘制圆角矩形
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {number} x - 左上角X
 * @param {number} y - 左上角Y
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {number} radius - 圆角半径
 */
function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * 绘制发光效果
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {string} color - 发光颜色
 * @param {number} blur - 模糊程度
 */
function setGlow(ctx, color, blur) {
  ctx.shadowColor = color
  ctx.shadowBlur = blur
}

/**
 * 清除发光效果
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 */
function clearGlow(ctx) {
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
}
