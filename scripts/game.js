/**
 * 方块破坏王 - 游戏主逻辑
 */

// ==================== 游戏配置 ====================
const CONFIG = {
  // 挡板配置
  paddle: {
    width: 100,
    height: 14,
    offsetBottom: 35,
  },

  // 小球配置
  ball: {
    radius: 6,
    speed: 5,
  },

  // 方块配置
  block: {
    rows: 10,
    cols: 12,
    width: 36,
    height: 16,
    padding: 3,
    topOffset: 60,
  },

  // 道具配置
  item: {
    size: 20,
    speed: 3,
    dropChance: 0.15,
  },

  // 颜色配置
  colors: {
    background: "#1a1a2e",
    headerBg: "#0d0d1a",
    paddle: "#00d4ff",
    paddleGlow: "#00d4ff",
    ball: "#ffffff",
    ballGlow: "#00d4ff",
    blocks: ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#ff9ff3", "#54a0ff", "#5f27cd", "#ff9f43"],
    wall: "#4a4a5e",
    wallHighlight: "#6a6a7e",
    itemSplit: "#a855f7",
    itemScatter: "#ec4899",
    text: "#ffffff",
    textMuted: "#888899",
    heart: "#ff6b6b",
    heartEmpty: "#ff0000",
  },
}

// ==================== 游戏状态 ====================
const game = {
  state: "menu", // menu, playing, paused, gameover, levelup
  score: 0,
  lives: 3,
  level: 1,

  // 游戏对象
  paddle: { x: 0, width: CONFIG.paddle.width },
  balls: [],
  blocks: [],
  items: [],
  particles: [],

  // 画布信息
  canvas: null,
  ctx: null,
  canvasWidth: 0,
  canvasHeight: 0,

  // 动画ID
  animationId: null,
}

// ==================== DOM 元素 ====================
let menuScreen, gameoverScreen, levelupScreen
let startBtn, restartBtn, nextlevelBtn
let finalScoreEl, finalLevelEl, levelupScoreEl, nextLevelEl

// ==================== 初始化 ====================

/**
 * 初始化游戏
 */
function init() {
  // 获取DOM元素
  game.canvas = document.getElementById("game-canvas")
  game.ctx = game.canvas.getContext("2d")

  menuScreen = document.getElementById("menu-screen")
  gameoverScreen = document.getElementById("gameover-screen")
  levelupScreen = document.getElementById("levelup-screen")

  startBtn = document.getElementById("start-btn")
  restartBtn = document.getElementById("restart-btn")
  nextlevelBtn = document.getElementById("nextlevel-btn")

  finalScoreEl = document.getElementById("final-score")
  finalLevelEl = document.getElementById("final-level")
  levelupScoreEl = document.getElementById("levelup-score")
  nextLevelEl = document.getElementById("next-level")

  // 绑定事件
  bindEvents()

  // 初始化画布尺寸
  resizeCanvas()

  // 初始化游戏数据
  initGameData()

  // 绘制初始画面
  render()
}

/**
 * 绑定事件监听
 */
function bindEvents() {
  // 按钮事件
  startBtn.addEventListener("click", startGame)
  restartBtn.addEventListener("click", restartGame)
  nextlevelBtn.addEventListener("click", nextLevel)

  // 窗口大小变化
  window.addEventListener("resize", resizeCanvas)

  // 鼠标/触摸事件
  game.canvas.addEventListener("mousemove", handlePointerMove)
  game.canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
  game.canvas.addEventListener("click", handleClick)
  game.canvas.addEventListener("touchstart", handleClick, { passive: false })
}

/**
 * 调整画布尺寸
 */
function resizeCanvas() {
  const container = game.canvas.parentElement
  const maxWidth = Math.min(480, container.clientWidth)
  const maxHeight = maxWidth * (4 / 3)

  game.canvas.width = maxWidth
  game.canvas.height = maxHeight
  game.canvasWidth = maxWidth
  game.canvasHeight = maxHeight

  // 重新定位挡板
  game.paddle.x = (game.canvasWidth - game.paddle.width) / 2
}

/**
 * 初始化游戏数据
 */
function initGameData(keepScore = false) {
  // 重置挡板位置
  game.paddle.x = (game.canvasWidth - CONFIG.paddle.width) / 2
  game.paddle.width = CONFIG.paddle.width

  const paddleY = game.canvasHeight - CONFIG.paddle.offsetBottom

  // 重置小球
  game.balls = [
    {
      x: game.canvasWidth / 2,
      y: paddleY - CONFIG.ball.radius - 2,
      dx: 0,
      dy: 0,
      attached: true,
    },
  ]

  // 生成方块
  game.blocks = createBlocks(game.level)

  // 清空道具和粒子
  game.items = []
  game.particles = []

  // 重置分数和生命（如果不保留）
  if (!keepScore) {
    game.score = 0
    game.lives = 3
    game.level = 1
  }
}

/**
 * 创建方块阵列
 */
function createBlocks(level) {
  const blocks = []
  const { cols, width, height, padding, topOffset, rows } = CONFIG.block

  // 根据关卡增加行数
  const actualRows = Math.min(rows + Math.floor(level / 2), 12)

  // 计算起始位置使方块居中
  const totalWidth = cols * width + (cols - 1) * padding
  const startX = (game.canvasWidth - totalWidth) / 2

  // 生成彩色方块
  for (let row = 0; row < actualRows; row++) {
    for (let col = 0; col < cols; col++) {
      blocks.push({
        x: startX + col * (width + padding),
        y: topOffset + row * (height + padding),
        width: width,
        height: height,
        color: CONFIG.colors.blocks[row % CONFIG.colors.blocks.length],
        destroyed: false,
        isWall: false,
        hits: 1,
      })
    }
  }

  // 添加灰色墙壁
  const wallCount = Math.min(3 + level, 8)
  const usedPositions = new Set()

  for (let i = 0; i < wallCount; i++) {
    const row = randomInt(2, Math.min(actualRows - 2, 6))
    const col = randomInt(1, cols - 2)
    const key = `${row}-${col}`

    if (!usedPositions.has(key)) {
      usedPositions.add(key)
      const blockIndex = row * cols + col

      if (blockIndex < blocks.length) {
        blocks[blockIndex].isWall = true
        blocks[blockIndex].color = CONFIG.colors.wall
        blocks[blockIndex].hits = -1 // 不可摧毁
      }
    }
  }

  return blocks
}

// ==================== 游戏控制 ====================

/**
 * 开始游戏
 */
function startGame() {
  initGameData(false)
  game.state = "playing"
  hideAllScreens()
  startGameLoop()
}

/**
 * 重新开始游戏
 */
function restartGame() {
  game.level = 1
  initGameData(false)
  game.state = "playing"
  hideAllScreens()
  startGameLoop()
}

/**
 * 下一关
 */
function nextLevel() {
  game.level++
  initGameData(true)
  game.state = "playing"
  hideAllScreens()
  startGameLoop()
}

/**
 * 游戏结束
 */
function gameOver() {
  game.state = "gameover"
  stopGameLoop()

  finalScoreEl.textContent = game.score
  finalLevelEl.textContent = game.level

  hideAllScreens()
  gameoverScreen.classList.remove("hidden")
}

/**
 * 通关
 */
function levelComplete() {
  game.state = "levelup"
  stopGameLoop()

  levelupScoreEl.textContent = game.score
  nextLevelEl.textContent = game.level + 1

  hideAllScreens()
  levelupScreen.classList.remove("hidden")
}

/**
 * 隐藏所有覆盖屏幕
 */
function hideAllScreens() {
  menuScreen.classList.add("hidden")
  gameoverScreen.classList.add("hidden")
  levelupScreen.classList.add("hidden")
}

// ==================== 游戏循环 ====================

/**
 * 启动游戏循环
 */
function startGameLoop() {
  if (game.animationId) {
    cancelAnimationFrame(game.animationId)
  }

  function loop() {
    if (game.state === "playing") {
      update()
      render()
      game.animationId = requestAnimationFrame(loop)
    }
  }

  game.animationId = requestAnimationFrame(loop)
}

/**
 * 停止游戏循环
 */
function stopGameLoop() {
  if (game.animationId) {
    cancelAnimationFrame(game.animationId)
    game.animationId = null
  }
}

// ==================== 游戏更新 ====================

/**
 * 更新游戏状态
 */
function update() {
  const paddleY = game.canvasHeight - CONFIG.paddle.offsetBottom

  // 更新小球
  updateBalls(paddleY)

  // 更新道具
  updateItems(paddleY)

  // 更新粒子
  game.particles = updateParticles(game.particles)

  // 检查通关
  checkLevelComplete()
}

/**
 * 更新小球
 */
function updateBalls(paddleY) {
  game.balls = game.balls.filter((ball) => {
    // 附着状态：跟随挡板
    if (ball.attached) {
      ball.x = game.paddle.x + game.paddle.width / 2
      ball.y = paddleY - CONFIG.ball.radius - 2
      return true
    }

    // 移动小球
    ball.x += ball.dx
    ball.y += ball.dy

    // 边界碰撞
    handleWallCollision(ball)

    // 挡板碰撞
    handlePaddleCollision(ball, paddleY)

    // 方块碰撞
    handleBlockCollision(ball)

    // 检查是否掉落
    if (ball.y > game.canvasHeight + CONFIG.ball.radius) {
      return false
    }

    return true
  })

  // 所有球丢失
  if (game.balls.length === 0) {
    game.lives--

    if (game.lives <= 0) {
      gameOver()
      return
    }

    // 重新生成一个球
    game.balls = [
      {
        x: game.paddle.x + game.paddle.width / 2,
        y: paddleY - CONFIG.ball.radius - 2,
        dx: 0,
        dy: 0,
        attached: true,
      },
    ]
  }
}

/**
 * 处理墙壁碰撞
 */
function handleWallCollision(ball) {
  const r = CONFIG.ball.radius

  // 左墙
  if (ball.x - r <= 0) {
    ball.dx = Math.abs(ball.dx)
    ball.x = r
  }

  // 右墙
  if (ball.x + r >= game.canvasWidth) {
    ball.dx = -Math.abs(ball.dx)
    ball.x = game.canvasWidth - r
  }

  // 顶部（信息栏下方）
  if (ball.y - r <= 45) {
    ball.dy = Math.abs(ball.dy)
    ball.y = 45 + r
  }
}

/**
 * 处理挡板碰撞
 */
function handlePaddleCollision(ball, paddleY) {
  const r = CONFIG.ball.radius
  const paddle = game.paddle

  if (
    ball.y + r >= paddleY &&
    ball.y - r <= paddleY + CONFIG.paddle.height &&
    ball.x >= paddle.x - r &&
    ball.x <= paddle.x + paddle.width + r &&
    ball.dy > 0
  ) {
    // 根据碰撞位置计算反弹角度
    const hitPos = (ball.x - paddle.x) / paddle.width
    const angle = (hitPos - 0.5) * Math.PI * 0.7
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)

    ball.dx = Math.sin(angle) * speed
    ball.dy = -Math.abs(Math.cos(angle) * speed)
    ball.y = paddleY - r

    // 添加粒子效果
    game.particles.push(...createExplosionParticles(ball.x, ball.y, CONFIG.colors.paddle, 4))
  }
}

/**
 * 处理方块碰撞
 */
function handleBlockCollision(ball) {
  const r = CONFIG.ball.radius

  for (const block of game.blocks) {
    if (block.destroyed) continue

    if (circleRectCollision(ball.x, ball.y, r, block.x, block.y, block.width, block.height)) {
      // 计算反弹
      const bounce = calculateBounce(ball, block, r)
      ball.dx = bounce.dx
      ball.dy = bounce.dy

      if (!block.isWall) {
        // 摧毁方块
        block.destroyed = true
        game.score += 10

        // 粒子效果
        game.particles.push(
          ...createExplosionParticles(block.x + block.width / 2, block.y + block.height / 2, block.color),
        )

        // 掉落道具
        if (Math.random() < CONFIG.item.dropChance) {
          game.items.push({
            x: block.x + block.width / 2,
            y: block.y + block.height / 2,
            type: Math.random() < 0.5 ? "split" : "scatter",
          })
        }
      } else {
        // 墙壁反弹效果
        game.particles.push(...createExplosionParticles(ball.x, ball.y, CONFIG.colors.wall, 3))
      }

      break // 一次只处理一个碰撞
    }
  }
}

/**
 * 更新道具
 */
function updateItems(paddleY) {
  game.items = game.items.filter((item) => {
    item.y += CONFIG.item.speed

    // 检查是否被挡板接住
    if (
      item.y + CONFIG.item.size / 2 >= paddleY &&
      item.x >= game.paddle.x &&
      item.x <= game.paddle.x + game.paddle.width
    ) {
      activatePowerUp(item)
      return false
    }

    return item.y < game.canvasHeight + CONFIG.item.size
  })
}

/**
 * 激活道具效果
 */
function activatePowerUp(item) {
  const paddleY = game.canvasHeight - CONFIG.paddle.offsetBottom

  if (item.type === "split") {
    // 分裂球：每个球分裂成两个
    const newBalls = []

    game.balls.forEach((ball) => {
      if (!ball.attached) {
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)
        const angle = Math.atan2(ball.dy, ball.dx)

        newBalls.push({
          x: ball.x,
          y: ball.y,
          dx: Math.cos(angle - 0.3) * speed,
          dy: Math.sin(angle - 0.3) * speed,
          attached: false,
        })

        newBalls.push({
          x: ball.x,
          y: ball.y,
          dx: Math.cos(angle + 0.3) * speed,
          dy: Math.sin(angle + 0.3) * speed,
          attached: false,
        })
      } else {
        newBalls.push(ball)
      }
    })

    game.balls = newBalls
  } else if (item.type === "scatter") {
    // 散射球：从挡板发射5个球
    const paddleCenter = game.paddle.x + game.paddle.width / 2

    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (Math.PI / 8) * (i - 2)
      game.balls.push({
        x: paddleCenter,
        y: paddleY - CONFIG.ball.radius - 2,
        dx: Math.cos(angle) * CONFIG.ball.speed,
        dy: Math.sin(angle) * CONFIG.ball.speed,
        attached: false,
      })
    }
  }

  // 道具拾取特效
  game.particles.push(
    ...createExplosionParticles(
      item.x,
      item.y,
      item.type === "split" ? CONFIG.colors.itemSplit : CONFIG.colors.itemScatter,
      12,
    ),
  )
}

/**
 * 检查是否通关
 */
function checkLevelComplete() {
  const remainingBlocks = game.blocks.filter((b) => !b.destroyed && !b.isWall)
  if (remainingBlocks.length === 0) {
    levelComplete()
  }
}

// ==================== 渲染 ====================

/**
 * 渲染游戏画面
 */
function render() {
  const ctx = game.ctx

  // 清空画布
  ctx.fillStyle = CONFIG.colors.background
  ctx.fillRect(0, 0, game.canvasWidth, game.canvasHeight)

  // 绘制顶部信息栏
  renderHeader(ctx)

  // 绘制方块
  renderBlocks(ctx)

  // 绘制挡板
  renderPaddle(ctx)

  // 绘制小球
  renderBalls(ctx)

  // 绘制道具
  renderItems(ctx)

  // 绘制粒子
  renderParticles(ctx)
}

/**
 * 渲染顶部信息栏
 */
function renderHeader(ctx) {
  // 背景
  ctx.fillStyle = CONFIG.colors.headerBg
  ctx.fillRect(0, 0, game.canvasWidth, 45)

  ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, sans-serif"

  // 分数
  ctx.fillStyle = CONFIG.colors.text
  ctx.textAlign = "left"
  ctx.fillText(`分数: ${game.score}`, 16, 28)

  // 关卡
  ctx.textAlign = "center"
  ctx.fillText(`第 ${game.level} 关`, game.canvasWidth / 2, 28)

  // 生命（心形）
  ctx.textAlign = "right"
  const hearts = "❤".repeat(game.lives) + "♡".repeat(Math.max(0, 3 - game.lives))
  ctx.fillStyle = game.lives > 1 ? CONFIG.colors.heart : CONFIG.colors.heartEmpty
  ctx.fillText(hearts, game.canvasWidth - 16, 28)
}

/**
 * 渲染方块
 */
function renderBlocks(ctx) {
  game.blocks.forEach((block) => {
    if (block.destroyed) return

    if (block.isWall) {
      // 墙壁
      ctx.fillStyle = CONFIG.colors.wall
      ctx.fillRect(block.x, block.y, block.width, block.height)

      // 墙壁纹理
      ctx.strokeStyle = CONFIG.colors.wallHighlight
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(block.x, block.y + block.height / 2)
      ctx.lineTo(block.x + block.width, block.y + block.height / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(block.x + block.width / 2, block.y)
      ctx.lineTo(block.x + block.width / 2, block.y + block.height)
      ctx.stroke()
    } else {
      // 普通方块
      ctx.fillStyle = block.color
      drawRoundRect(ctx, block.x, block.y, block.width, block.height, 2)
      ctx.fill()

      // 高光
      ctx.fillStyle = "rgba(255,255,255,0.3)"
      ctx.fillRect(block.x + 1, block.y + 1, block.width - 2, 3)

      // 阴影
      ctx.fillStyle = "rgba(0,0,0,0.2)"
      ctx.fillRect(block.x + 1, block.y + block.height - 3, block.width - 2, 2)
    }
  })
}

/**
 * 渲染挡板
 */
function renderPaddle(ctx) {
  const paddleY = game.canvasHeight - CONFIG.paddle.offsetBottom

  // 发光效果
  setGlow(ctx, CONFIG.colors.paddleGlow, 15)
  ctx.fillStyle = CONFIG.colors.paddle
  drawRoundRect(ctx, game.paddle.x, paddleY, game.paddle.width, CONFIG.paddle.height, 7)
  ctx.fill()
  clearGlow(ctx)

  // 高光
  ctx.fillStyle = "rgba(255,255,255,0.4)"
  drawRoundRect(ctx, game.paddle.x + 3, paddleY + 2, game.paddle.width - 6, 4, 2)
  ctx.fill()
}

/**
 * 渲染小球
 */
function renderBalls(ctx) {
  game.balls.forEach((ball) => {
    setGlow(ctx, CONFIG.colors.ballGlow, 12)
    ctx.fillStyle = CONFIG.colors.ball
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, CONFIG.ball.radius, 0, Math.PI * 2)
    ctx.fill()
    clearGlow(ctx)
  })
}

/**
 * 渲染道具
 */
function renderItems(ctx) {
  game.items.forEach((item) => {
    const gradient = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, CONFIG.item.size / 2)

    if (item.type === "split") {
      gradient.addColorStop(0, "#d946ef")
      gradient.addColorStop(1, "#a855f7")
    } else {
      gradient.addColorStop(0, "#f472b6")
      gradient.addColorStop(1, "#ec4899")
    }

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(item.x, item.y, CONFIG.item.size / 2, 0, Math.PI * 2)
    ctx.fill()

    // 道具文字
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(item.type === "split" ? "S" : "W", item.x, item.y)
  })
}

/**
 * 渲染粒子
 */
function renderParticles(ctx) {
  game.particles.forEach((p) => {
    const alpha = p.life / p.maxLife
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

// ==================== 事件处理 ====================

/**
 * 鼠标移动
 */
function handlePointerMove(e) {
  if (game.state !== "playing") return

  const rect = game.canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const scaleX = game.canvasWidth / rect.width
  const actualX = x * scaleX

  game.paddle.x = clamp(actualX - game.paddle.width / 2, 0, game.canvasWidth - game.paddle.width)
}

/**
 * 触摸移动
 */
function handleTouchMove(e) {
  e.preventDefault()
  if (game.state !== "playing") return

  const touch = e.touches[0]
  const rect = game.canvas.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const scaleX = game.canvasWidth / rect.width
  const actualX = x * scaleX

  game.paddle.x = clamp(actualX - game.paddle.width / 2, 0, game.canvasWidth - game.paddle.width)
}

/**
 * 点击/触摸发射小球
 */
function handleClick(e) {
  if (e.type === "touchstart") {
    e.preventDefault()
  }

  if (game.state !== "playing") return

  // 发射附着的小球
  const attachedBall = game.balls.find((b) => b.attached)
  if (attachedBall) {
    attachedBall.attached = false
    attachedBall.dx = (Math.random() - 0.5) * 3
    attachedBall.dy = -CONFIG.ball.speed
  }
}

// ==================== 启动游戏 ====================
document.addEventListener("DOMContentLoaded", init)

// ==================== 辅助函数 ====================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function updateParticles(particles) {
  return particles.filter((p) => {
    p.life--
    return p.life > 0
  })
}

function createExplosionParticles(x, y, color, count = 10) {
  const particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 2,
      color: color,
      life: 30,
      maxLife: 30,
    })
  }
  return particles
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw)
  const closestY = clamp(cy, ry, ry + rh)

  const distanceX = cx - closestX
  const distanceY = cy - closestY

  const distanceSquared = distanceX * distanceX + distanceY * distanceY

  return distanceSquared < cr * cr
}

function calculateBounce(ball, block, radius) {
  const blockCenterX = block.x + block.width / 2
  const blockCenterY = block.y + block.height / 2

  const distanceX = ball.x - blockCenterX
  const distanceY = ball.y - blockCenterY

  const angle = Math.atan2(distanceY, distanceX)

  return {
    dx: Math.cos(angle) * ball.speed,
    dy: Math.sin(angle) * ball.speed,
  }
}

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

function setGlow(ctx, color, radius) {
  ctx.shadowColor = color
  ctx.shadowBlur = radius
}

function clearGlow(ctx) {
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
