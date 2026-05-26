package com.example.pspu_ball_game

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

class GameView(context: Context) : View(context) {

    private val backgroundPaint = Paint()
    private val platformPaint = Paint()
    private val ballPaint = Paint()
    private val blockPaint = Paint()
    private val bonusPaint = Paint()
    private val textPaint = Paint()
    private val buttonPaint = Paint()
    private val buttonTextPaint = Paint()

    private val balls = mutableListOf<Ball>()
    private val blocks = mutableListOf<Block>()
    private val bonuses = mutableListOf<Bonus>()

    private val platform = RectF()
    private val restartButton = RectF()

    private var gameState = GameState.PLAYING
    private var wasGameCreated = false

    private var platformWidth = 0f
    private var platformHeight = 0f
    private var platformY = 0f
    private var ballRadius = 0f
    private var blockGap = 0f
    private var blockTopPadding = 0f
    private var blockSidePadding = 0f
    private var blockWidth = 0f
    private var blockHeight = 0f
    private var blockMoveSpeed = 0f
    private var lastFrameTime = 0L
    private var lastNewRowTime = 0L
    private var lastBonusDropTime = 0L

    private val blockRows = 6
    private val blockColumns = 8
    private val newRowTime = 8000L
    private val bonusDropChance = 12
    private val bonusDropCooldown = 2500L
    private val maxBalls = 12
    private val maxBonusesOnScreen = 3

    private val gameRunnable = object : Runnable {
        override fun run() {
            updateGame()
            invalidate()
            postDelayed(this, 16L)
        }
    }

    init {
        backgroundPaint.color = Color.rgb(20, 25, 35)

        platformPaint.color = Color.rgb(80, 180, 255)

        ballPaint.color = Color.WHITE
        ballPaint.isAntiAlias = true

        blockPaint.color = Color.rgb(255, 170, 70)

        bonusPaint.color = Color.rgb(120, 230, 120)
        bonusPaint.isAntiAlias = true

        textPaint.color = Color.WHITE
        textPaint.textAlign = Paint.Align.CENTER
        textPaint.isAntiAlias = true

        buttonPaint.color = Color.rgb(80, 180, 255)

        buttonTextPaint.color = Color.BLACK
        buttonTextPaint.textAlign = Paint.Align.CENTER
        buttonTextPaint.isAntiAlias = true

        post(gameRunnable)
    }

    override fun onDetachedFromWindow() {
        removeCallbacks(gameRunnable)
        super.onDetachedFromWindow()
    }

    override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
        super.onSizeChanged(width, height, oldWidth, oldHeight)

        if (width > 0 && height > 0) {
            resetGame()
            wasGameCreated = true
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), backgroundPaint)

        drawBlocks(canvas)
        drawBonuses(canvas)
        drawBalls(canvas)
        canvas.drawRoundRect(platform, 18f, 18f, platformPaint)
        drawGameText(canvas)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN && gameState != GameState.PLAYING) {
            if (restartButton.contains(event.x, event.y)) {
                resetGame()
            }
            return true
        }

        if (gameState == GameState.PLAYING) {
            when (event.action) {
                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> movePlatform(event.x)
            }
        }

        return true
    }

    private fun resetGame() {
        if (width == 0 || height == 0) {
            return
        }

        gameState = GameState.PLAYING
        balls.clear()
        blocks.clear()
        bonuses.clear()
        lastFrameTime = System.currentTimeMillis()
        lastNewRowTime = lastFrameTime
        lastBonusDropTime = 0L

        platformWidth = width * 0.28f
        platformHeight = height * 0.025f
        platformY = height * 0.88f
        ballRadius = width * 0.025f
        blockGap = width * 0.015f
        blockSidePadding = width * 0.06f
        blockTopPadding = height * 0.11f
        blockWidth = (width - blockSidePadding * 2f - blockGap * (blockColumns - 1)) / blockColumns
        blockHeight = height * 0.035f
        blockMoveSpeed = (blockHeight + blockGap) / (newRowTime / 1000f)

        val platformLeft = width / 2f - platformWidth / 2f
        platform.set(
            platformLeft,
            platformY,
            platformLeft + platformWidth,
            platformY + platformHeight
        )

        balls.add(
            Ball(
                x = width / 2f,
                y = height * 0.62f,
                dx = width * 0.006f,
                dy = height * 0.007f,
                radius = ballRadius
            )
        )

        createBlocks()

        val buttonWidth = width * 0.58f
        val buttonHeight = height * 0.075f
        val buttonLeft = width / 2f - buttonWidth / 2f
        val buttonTop = height * 0.56f
        restartButton.set(buttonLeft, buttonTop, buttonLeft + buttonWidth, buttonTop + buttonHeight)
    }

    private fun createBlocks() {
        for (row in 0 until blockRows) {
            addBlockRow(blockTopPadding + row * (blockHeight + blockGap))
        }
    }

    private fun addBlockRow(top: Float) {
        for (column in 0 until blockColumns) {
            val left = blockSidePadding + column * (blockWidth + blockGap)
            blocks.add(Block(RectF(left, top, left + blockWidth, top + blockHeight)))
        }
    }

    private fun updateGame() {
        if (!wasGameCreated || gameState != GameState.PLAYING) {
            return
        }

        val now = System.currentTimeMillis()
        val secondsPassed = (now - lastFrameTime) / 1000f
        lastFrameTime = now

        moveBlocks(secondsPassed)
        updateBalls()
        updateBonuses()

        if (blocks.all { it.isBroken }) {
            gameState = GameState.WIN
            return
        }

        addNewBlockRowIfNeeded(now)

        if (isAnyBlockTooLow()) {
            gameState = GameState.LOSE
            return
        }

        if (balls.isEmpty()) {
            gameState = GameState.LOSE
        }
    }

    private fun moveBlocks(secondsPassed: Float) {
        for (block in blocks) {
            if (!block.isBroken) {
                block.rect.offset(0f, blockMoveSpeed * secondsPassed)
            }
        }
    }

    private fun addNewBlockRowIfNeeded(now: Long) {
        if (now - lastNewRowTime >= newRowTime) {
            addBlockRow(blockTopPadding)
            lastNewRowTime = now
        }
    }

    private fun isAnyBlockTooLow(): Boolean {
        return blocks.any { !it.isBroken && it.rect.bottom >= platform.top }
    }

    private fun updateBalls() {
        val ballsToRemove = mutableListOf<Ball>()

        for (ball in balls) {
            ball.x += ball.dx
            ball.y += ball.dy

            checkWallCollision(ball)
            checkPlatformCollision(ball)
            checkBlockCollision(ball)

            if (ball.y - ball.radius > height) {
                ballsToRemove.add(ball)
            }
        }

        balls.removeAll(ballsToRemove)
    }

    private fun checkWallCollision(ball: Ball) {
        if (ball.x - ball.radius < 0f) {
            ball.x = ball.radius
            ball.dx = abs(ball.dx)
        }

        if (ball.x + ball.radius > width) {
            ball.x = width - ball.radius
            ball.dx = -abs(ball.dx)
        }

        if (ball.y - ball.radius < 0f) {
            ball.y = ball.radius
            ball.dy = abs(ball.dy)
        }
    }

    private fun checkPlatformCollision(ball: Ball) {
        val ballRect = RectF(
            ball.x - ball.radius,
            ball.y - ball.radius,
            ball.x + ball.radius,
            ball.y + ball.radius
        )

        if (ball.dy > 0f && RectF.intersects(ballRect, platform)) {
            val platformCenter = platform.centerX()
            val hitPlace = (ball.x - platformCenter) / (platform.width() / 2f)
            val speed = max(width * 0.006f, abs(ball.dy))

            ball.y = platform.top - ball.radius
            ball.dx = hitPlace * speed
            ball.dy = -abs(speed)
        }
    }

    private fun checkBlockCollision(ball: Ball) {
        val ballRect = RectF(
            ball.x - ball.radius,
            ball.y - ball.radius,
            ball.x + ball.radius,
            ball.y + ball.radius
        )

        for (block in blocks) {
            if (!block.isBroken && RectF.intersects(ballRect, block.rect)) {
                block.isBroken = true
                ball.dy = -ball.dy
                maybeCreateBonus(block.rect.centerX(), block.rect.centerY())
                break
            }
        }
    }

    private fun maybeCreateBonus(x: Float, y: Float) {
        val now = System.currentTimeMillis()

        if (bonuses.size >= maxBonusesOnScreen || now - lastBonusDropTime < bonusDropCooldown) {
            return
        }

        val chance = Random.nextInt(100)

        if (chance >= bonusDropChance) {
            return
        }

        val type = when (Random.nextInt(100)) {
            in 0..59 -> BonusType.PLUS_ONE
            in 60..84 -> BonusType.PLUS_TWO
            in 85..94 -> BonusType.TRIPLE
            else -> BonusType.PLUS_FIVE
        }

        bonuses.add(
            Bonus(
                x = x,
                y = y,
                type = type,
                size = width * 0.055f,
                speed = height * 0.004f
            )
        )
        lastBonusDropTime = now
    }

    private fun updateBonuses() {
        val bonusesToRemove = mutableListOf<Bonus>()

        for (bonus in bonuses) {
            bonus.y += bonus.speed

            if (RectF.intersects(bonus.rect(), platform)) {
                applyBonus(bonus.type)
                bonusesToRemove.add(bonus)
            } else if (bonus.y - bonus.size / 2f > height) {
                bonusesToRemove.add(bonus)
            }
        }

        bonuses.removeAll(bonusesToRemove)
    }

    private fun applyBonus(type: BonusType) {
        when (type) {
            BonusType.PLUS_ONE -> addExtraBalls(1)
            BonusType.PLUS_TWO -> addExtraBalls(2)
            BonusType.TRIPLE -> tripleBalls()
            BonusType.PLUS_FIVE -> addExtraBalls(5)
        }
    }

    private fun tripleBalls() {
        val currentBalls = balls.toList()
        var addedBalls = 0

        for (ball in currentBalls) {
            if (balls.size >= maxBalls || addedBalls >= 4) {
                return
            }
            createBallFrom(ball, -1f)

            if (balls.size >= maxBalls || addedBalls >= 3) {
                return
            }
            createBallFrom(ball, 1f)
            addedBalls += 2
        }
    }

    private fun addExtraBalls(count: Int) {
        val sourceBall = balls.firstOrNull()
            ?: Ball(platform.centerX(), platform.top - ballRadius, width * 0.005f, -height * 0.006f, ballRadius)

        for (number in 0 until count) {
            if (balls.size >= maxBalls) {
                return
            }

            val direction = if (number % 2 == 0) -1f else 1f
            createBallFrom(sourceBall, direction)
        }
    }

    private fun createBallFrom(sourceBall: Ball, direction: Float) {
        if (balls.size >= maxBalls) {
            return
        }

        val speedX = max(width * 0.004f, abs(sourceBall.dx))
        val speedY = max(height * 0.006f, abs(sourceBall.dy))

        balls.add(
            Ball(
                x = sourceBall.x,
                y = sourceBall.y,
                dx = speedX * direction,
                dy = -speedY,
                radius = ballRadius
            )
        )
    }

    private fun movePlatform(touchX: Float) {
        val halfWidth = platformWidth / 2f
        val left = min(max(touchX - halfWidth, 0f), width - platformWidth)
        platform.set(left, platformY, left + platformWidth, platformY + platformHeight)
    }

    private fun drawBlocks(canvas: Canvas) {
        for (block in blocks) {
            if (!block.isBroken) {
                canvas.drawRoundRect(block.rect, 8f, 8f, blockPaint)
            }
        }
    }

    private fun drawBalls(canvas: Canvas) {
        for (ball in balls) {
            canvas.drawCircle(ball.x, ball.y, ball.radius, ballPaint)
        }
    }

    private fun drawBonuses(canvas: Canvas) {
        textPaint.textSize = height * 0.022f

        for (bonus in bonuses) {
            val rect = bonus.rect()
            canvas.drawRoundRect(rect, 10f, 10f, bonusPaint)

            val label = when (bonus.type) {
                BonusType.PLUS_ONE -> "+1"
                BonusType.PLUS_TWO -> "+2"
                BonusType.TRIPLE -> "x3"
                BonusType.PLUS_FIVE -> "+5"
            }

            canvas.drawText(label, rect.centerX(), rect.centerY() + textPaint.textSize / 3f, textPaint)
        }
    }

    private fun drawGameText(canvas: Canvas) {
        textPaint.textSize = height * 0.028f
        canvas.drawText("Блоки: ${blocks.count { !it.isBroken }}", width / 2f, height * 0.055f, textPaint)

        if (gameState == GameState.PLAYING) {
            return
        }

        val title = if (gameState == GameState.WIN) "Победа!" else "Проигрыш"

        textPaint.textSize = height * 0.055f
        canvas.drawText(title, width / 2f, height * 0.45f, textPaint)

        buttonTextPaint.textSize = height * 0.027f
        canvas.drawRoundRect(restartButton, 18f, 18f, buttonPaint)
        canvas.drawText(
            "Начать заново",
            restartButton.centerX(),
            restartButton.centerY() + buttonTextPaint.textSize / 3f,
            buttonTextPaint
        )
    }
}
