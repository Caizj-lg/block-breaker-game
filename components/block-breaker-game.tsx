"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

const PADDLE_WIDTH = 100
const PADDLE_HEIGHT = 14
const BALL_RADIUS = 6
const BALL_SPEED = 5
const BLOCK_ROWS = 10
const BLOCK_COLS = 12
const BLOCK_WIDTH = 36
const BLOCK_HEIGHT = 16
const BLOCK_PADDING = 3
const BLOCK_TOP_OFFSET = 60
const ITEM_SIZE = 20
const ITEM_SPEED = 3
const DROP_CHANCE = 0.15

// Colors - 经典打砖块配色
const COLORS = {
  background: "#1a1a2e",
  paddle: "#00d4ff",
  paddleGlow: "#00d4ff",
  ball: "#ffffff",
  ballGlow: "#00d4ff",
  // 方块颜色 - 按行递进
  blocks: ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#ff9ff3", "#54a0ff", "#5f27cd", "#ff9f43"],
  wall: "#4a4a5e", // 灰色墙壁
  wallHighlight: "#6a6a7e",
  itemSplit: "#a855f7",
  itemScatter: "#ec4899",
  particle: "#fbbf24",
  text: "#ffffff",
  textMuted: "#888899",
}

interface Ball {
  x: number
  y: number
  dx: number
  dy: number
  attached: boolean
}

interface Block {
  x: number
  y: number
  width: number
  height: number
  color: string
  destroyed: boolean
  isWall: boolean // 灰色墙壁不可破坏
  hits: number // 需要击打次数
}

interface Item {
  x: number
  y: number
  type: "split" | "scatter"
}

interface Particle {
  x: number
  y: number
  dx: number
  dy: number
  life: number
  color: string
}

type GameState = "menu" | "playing" | "paused" | "gameover" | "levelup"

export default function BlockBreakerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>("menu")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)

  const gameRef = useRef({
    paddle: { x: 0, width: PADDLE_WIDTH },
    balls: [] as Ball[],
    blocks: [] as Block[],
    items: [] as Item[],
    particles: [] as Particle[],
    canvasWidth: 0,
    canvasHeight: 0,
  })

  const initBlocks = useCallback((lvl: number, canvasWidth: number) => {
    const blocks: Block[] = []

    const cols = BLOCK_COLS
    const rows = Math.min(BLOCK_ROWS + Math.floor(lvl / 2), 12)

    const totalBlocksWidth = cols * BLOCK_WIDTH + (cols - 1) * BLOCK_PADDING
    const startX = (canvasWidth - totalBlocksWidth) / 2

    // 生成普通方块阵列
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        blocks.push({
          x: startX + col * (BLOCK_WIDTH + BLOCK_PADDING),
          y: BLOCK_TOP_OFFSET + row * (BLOCK_HEIGHT + BLOCK_PADDING),
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          color: COLORS.blocks[row % COLORS.blocks.length],
          destroyed: false,
          isWall: false,
          hits: 1,
        })
      }
    }

    const wallCount = Math.min(3 + lvl, 8)
    const wallPositions: { row: number; col: number }[] = []

    // 在方块区域中间位置随机放置墙壁
    for (let i = 0; i < wallCount; i++) {
      const row = Math.floor(Math.random() * Math.min(rows - 2, 6)) + 2
      const col = Math.floor(Math.random() * (cols - 2)) + 1

      // 检查是否已有墙壁
      const exists = wallPositions.some((p) => p.row === row && p.col === col)
      if (!exists) {
        wallPositions.push({ row, col })

        // 找到对应的方块并转换为墙壁
        const blockIndex = row * cols + col
        if (blockIndex < blocks.length) {
          blocks[blockIndex].isWall = true
          blocks[blockIndex].color = COLORS.wall
          blocks[blockIndex].hits = -1 // 不可摧毁
        }
      }
    }

    return blocks
  }, [])

  const initGame = useCallback(
    (lvl = 1, keepScore = false) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const game = gameRef.current
      game.canvasWidth = canvas.width
      game.canvasHeight = canvas.height
      game.paddle.x = canvas.width / 2 - PADDLE_WIDTH / 2
      game.paddle.width = PADDLE_WIDTH

      game.balls = [
        {
          x: canvas.width / 2,
          y: canvas.height - 50,
          dx: 0,
          dy: 0,
          attached: true,
        },
      ]
      game.blocks = initBlocks(lvl, canvas.width)
      game.items = []
      game.particles = []

      if (!keepScore) {
        setScore(0)
        setLives(3)
        setLevel(1)
      }
    },
    [initBlocks],
  )

  const createParticles = (x: number, y: number, color: string, count = 8) => {
    const game = gameRef.current
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      game.particles.push({
        x,
        y,
        dx: Math.cos(angle) * (2 + Math.random() * 2),
        dy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 25,
        color,
      })
    }
  }

  const handleItemPickup = (item: Item) => {
    const game = gameRef.current

    if (item.type === "split") {
      const newBalls: Ball[] = []
      game.balls.forEach((ball) => {
        if (!ball.attached) {
          const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)
          const angle1 = Math.atan2(ball.dy, ball.dx) - 0.3
          const angle2 = Math.atan2(ball.dy, ball.dx) + 0.3

          newBalls.push({
            x: ball.x,
            y: ball.y,
            dx: Math.cos(angle1) * speed,
            dy: Math.sin(angle1) * speed,
            attached: false,
          })
          newBalls.push({
            x: ball.x,
            y: ball.y,
            dx: Math.cos(angle2) * speed,
            dy: Math.sin(angle2) * speed,
            attached: false,
          })
        } else {
          newBalls.push(ball)
        }
      })
      game.balls = newBalls
    } else if (item.type === "scatter") {
      const paddleCenter = game.paddle.x + game.paddle.width / 2
      const paddleTop = game.canvasHeight - 40

      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (Math.PI / 8) * (i - 2)
        game.balls.push({
          x: paddleCenter,
          y: paddleTop,
          dx: Math.cos(angle) * BALL_SPEED,
          dy: Math.sin(angle) * BALL_SPEED,
          attached: false,
        })
      }
    }

    createParticles(item.x, item.y, item.type === "split" ? COLORS.itemSplit : COLORS.itemScatter, 12)
  }

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const game = gameRef.current

    // 深色背景
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // UI - 顶部信息栏
    ctx.fillStyle = "#0d0d1a"
    ctx.fillRect(0, 0, canvas.width, 45)

    ctx.fillStyle = COLORS.text
    ctx.font = "bold 16px Geist, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(`分数: ${score}`, 16, 28)
    ctx.textAlign = "center"
    ctx.fillText(`第 ${level} 关`, canvas.width / 2, 28)
    ctx.textAlign = "right"

    // 生命显示为心形图标
    const heartsText = "❤".repeat(lives) + "♡".repeat(Math.max(0, 3 - lives))
    ctx.fillStyle = lives > 1 ? "#ff6b6b" : "#ff0000"
    ctx.fillText(heartsText, canvas.width - 16, 28)

    game.blocks.forEach((block) => {
      if (block.destroyed) return

      if (block.isWall) {
        // 墙壁 - 灰色带纹理
        ctx.fillStyle = COLORS.wall
        ctx.fillRect(block.x, block.y, block.width, block.height)

        // 墙壁纹理线条
        ctx.strokeStyle = COLORS.wallHighlight
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
        // 普通方块 - 带高光效果
        ctx.fillStyle = block.color
        ctx.beginPath()
        ctx.roundRect(block.x, block.y, block.width, block.height, 2)
        ctx.fill()

        // 顶部高光
        ctx.fillStyle = "rgba(255,255,255,0.3)"
        ctx.fillRect(block.x + 1, block.y + 1, block.width - 2, 3)

        // 底部阴影
        ctx.fillStyle = "rgba(0,0,0,0.2)"
        ctx.fillRect(block.x + 1, block.y + block.height - 3, block.width - 2, 2)
      }
    })

    // 绘制挡板 - 带发光效果
    const paddleY = canvas.height - 35
    ctx.shadowColor = COLORS.paddleGlow
    ctx.shadowBlur = 15
    ctx.fillStyle = COLORS.paddle
    ctx.beginPath()
    ctx.roundRect(game.paddle.x, paddleY, game.paddle.width, PADDLE_HEIGHT, 7)
    ctx.fill()

    // 挡板高光
    ctx.shadowBlur = 0
    ctx.fillStyle = "rgba(255,255,255,0.4)"
    ctx.beginPath()
    ctx.roundRect(game.paddle.x + 3, paddleY + 2, game.paddle.width - 6, 4, 2)
    ctx.fill()

    // 绘制小球
    game.balls.forEach((ball) => {
      ctx.shadowColor = COLORS.ballGlow
      ctx.shadowBlur = 12
      ctx.fillStyle = COLORS.ball
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    })

    // 绘制道具
    game.items.forEach((item) => {
      const gradient = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, ITEM_SIZE / 2)
      if (item.type === "split") {
        gradient.addColorStop(0, "#d946ef")
        gradient.addColorStop(1, "#a855f7")
      } else {
        gradient.addColorStop(0, "#f472b6")
        gradient.addColorStop(1, "#ec4899")
      }

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(item.x, item.y, ITEM_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 11px Geist, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(item.type === "split" ? "S" : "W", item.x, item.y)
    })

    // 绘制粒子
    game.particles.forEach((p) => {
      const alpha = p.life / 25
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }, [score, lives, level])

  const updateGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const game = gameRef.current
    let scoreIncrease = 0
    let livesChange = 0
    const paddleY = canvas.height - 35

    // 更新小球
    game.balls = game.balls.filter((ball) => {
      if (ball.attached) {
        ball.x = game.paddle.x + game.paddle.width / 2
        ball.y = paddleY - BALL_RADIUS - 2
        return true
      }

      ball.x += ball.dx
      ball.y += ball.dy

      // 墙壁碰撞（左、右、上）
      if (ball.x - BALL_RADIUS <= 0) {
        ball.dx = Math.abs(ball.dx)
        ball.x = BALL_RADIUS
      }
      if (ball.x + BALL_RADIUS >= canvas.width) {
        ball.dx = -Math.abs(ball.dx)
        ball.x = canvas.width - BALL_RADIUS
      }
      if (ball.y - BALL_RADIUS <= 45) {
        ball.dy = Math.abs(ball.dy)
        ball.y = 45 + BALL_RADIUS
      }

      // 挡板碰撞
      if (
        ball.y + BALL_RADIUS >= paddleY &&
        ball.y - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
        ball.x >= game.paddle.x - BALL_RADIUS &&
        ball.x <= game.paddle.x + game.paddle.width + BALL_RADIUS &&
        ball.dy > 0
      ) {
        const hitPos = (ball.x - game.paddle.x) / game.paddle.width
        const angle = (hitPos - 0.5) * Math.PI * 0.7
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)
        ball.dx = Math.sin(angle) * speed
        ball.dy = -Math.abs(Math.cos(angle) * speed)
        ball.y = paddleY - BALL_RADIUS
        createParticles(ball.x, ball.y, COLORS.paddle, 4)
      }

      // 方块碰撞
      game.blocks.forEach((block) => {
        if (block.destroyed) return

        if (
          ball.x + BALL_RADIUS > block.x &&
          ball.x - BALL_RADIUS < block.x + block.width &&
          ball.y + BALL_RADIUS > block.y &&
          ball.y - BALL_RADIUS < block.y + block.height
        ) {
          // 计算碰撞方向
          const overlapLeft = ball.x + BALL_RADIUS - block.x
          const overlapRight = block.x + block.width - (ball.x - BALL_RADIUS)
          const overlapTop = ball.y + BALL_RADIUS - block.y
          const overlapBottom = block.y + block.height - (ball.y - BALL_RADIUS)

          const minOverlapX = Math.min(overlapLeft, overlapRight)
          const minOverlapY = Math.min(overlapTop, overlapBottom)

          if (minOverlapX < minOverlapY) {
            ball.dx = -ball.dx
          } else {
            ball.dy = -ball.dy
          }

          // 如果不是墙壁，则摧毁
          if (!block.isWall) {
            block.destroyed = true
            scoreIncrease += 10
            createParticles(block.x + block.width / 2, block.y + block.height / 2, block.color)

            // 掉落道具
            if (Math.random() < DROP_CHANCE) {
              game.items.push({
                x: block.x + block.width / 2,
                y: block.y + block.height / 2,
                type: Math.random() < 0.5 ? "split" : "scatter",
              })
            }
          } else {
            // 墙壁反弹特效
            createParticles(ball.x, ball.y, COLORS.wall, 3)
          }
        }
      })

      // 小球掉落
      if (ball.y > canvas.height + BALL_RADIUS) {
        return false
      }

      return true
    })

    // 检查是否所有小球都丢失
    if (game.balls.length === 0) {
      livesChange = -1
      game.balls = [
        {
          x: game.paddle.x + game.paddle.width / 2,
          y: paddleY - BALL_RADIUS - 2,
          dx: 0,
          dy: 0,
          attached: true,
        },
      ]
    }

    // 更新道具
    game.items = game.items.filter((item) => {
      item.y += ITEM_SPEED

      if (item.y + ITEM_SIZE / 2 >= paddleY && item.x >= game.paddle.x && item.x <= game.paddle.x + game.paddle.width) {
        handleItemPickup(item)
        return false
      }

      return item.y < canvas.height + ITEM_SIZE
    })

    // 更新粒子
    game.particles = game.particles.filter((p) => {
      p.x += p.dx
      p.y += p.dy
      p.dy += 0.1 // 重力
      p.life--
      return p.life > 0
    })

    if (scoreIncrease > 0) {
      setScore((s) => s + scoreIncrease)
    }
    if (livesChange !== 0) {
      setLives((l) => {
        const newLives = l + livesChange
        if (newLives <= 0) {
          setGameState("gameover")
        }
        return Math.max(0, newLives)
      })
    }

    // 检查是否通关 - 只检查非墙壁方块
    const remainingBlocks = game.blocks.filter((b) => !b.destroyed && !b.isWall)
    if (remainingBlocks.length === 0) {
      setGameState("levelup")
    }
  }, [])

  useEffect(() => {
    if (gameState !== "playing") return

    let animationId: number

    const tick = () => {
      updateGame()
      gameLoop()
      animationId = requestAnimationFrame(tick)
    }

    animationId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationId)
  }, [gameState, gameLoop, updateGame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const container = canvas.parentElement
      if (!container) return
      canvas.width = Math.min(480, container.clientWidth)
      canvas.height = Math.min(640, container.clientHeight)

      if (gameState === "menu") {
        initGame()
      }
    }

    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [initGame, gameState])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (gameState !== "playing") return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const game = gameRef.current

      game.paddle.x = Math.max(0, Math.min(canvas.width - game.paddle.width, x - game.paddle.width / 2))
    },
    [gameState],
  )

  const handleClick = useCallback(() => {
    if (gameState !== "playing") return

    const game = gameRef.current
    const attachedBall = game.balls.find((b) => b.attached)
    if (attachedBall) {
      attachedBall.attached = false
      attachedBall.dx = (Math.random() - 0.5) * 3
      attachedBall.dy = -BALL_SPEED
    }
  }, [gameState])

  const startGame = () => {
    initGame(1, false)
    setGameState("playing")
  }

  const nextLevel = () => {
    const newLevel = level + 1
    setLevel(newLevel)
    initGame(newLevel, true)
    setGameState("playing")
  }

  const restart = () => {
    initGame(1, false)
    setGameState("playing")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d1a] p-4">
      <div className="relative w-full max-w-[480px]">
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg border-2 border-[#2a2a4a] touch-none"
          style={{ aspectRatio: "3/4" }}
          onPointerMove={handlePointerMove}
          onClick={handleClick}
        />

        {gameState === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d1a]/95 rounded-lg">
            <h1 className="text-4xl font-bold text-[#00d4ff] mb-1 tracking-wider">方块破坏王</h1>
            <p className="text-[#888899] mb-8 text-sm">Block Breaker King</p>
            <Button
              onClick={startGame}
              size="lg"
              className="bg-[#00d4ff] hover:bg-[#00b8e6] text-[#0d0d1a] font-bold px-8"
            >
              开始游戏
            </Button>
            <div className="text-[#888899] text-sm mt-8 text-center space-y-1">
              <p>移动手指/鼠标控制挡板</p>
              <p>点击屏幕发射小球</p>
              <p className="text-[#a855f7] mt-4">S = 分裂球 | W = 散射球</p>
            </div>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d1a]/95 rounded-lg">
            <h2 className="text-3xl font-bold text-[#ff6b6b] mb-2">游戏结束</h2>
            <p className="text-white text-xl mb-1">得分: {score}</p>
            <p className="text-[#888899] mb-8">到达第 {level} 关</p>
            <Button
              onClick={restart}
              size="lg"
              className="bg-[#00d4ff] hover:bg-[#00b8e6] text-[#0d0d1a] font-bold px-8"
            >
              再来一局
            </Button>
          </div>
        )}

        {gameState === "levelup" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d1a]/95 rounded-lg">
            <h2 className="text-3xl font-bold text-[#1dd1a1] mb-2">恭喜通关!</h2>
            <p className="text-white text-xl mb-1">得分: {score}</p>
            <p className="text-[#888899] mb-8">下一关: 第 {level + 1} 关</p>
            <Button
              onClick={nextLevel}
              size="lg"
              className="bg-[#1dd1a1] hover:bg-[#10b981] text-[#0d0d1a] font-bold px-8"
            >
              继续挑战
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
