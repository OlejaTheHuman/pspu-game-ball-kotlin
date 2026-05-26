package com.example.pspu_ball_game

import android.graphics.RectF

data class Ball(
    var x: Float,
    var y: Float,
    var dx: Float,
    var dy: Float,
    val radius: Float
)

data class Block(
    val rect: RectF,
    var isBroken: Boolean = false
)

data class Bonus(
    var x: Float,
    var y: Float,
    val type: BonusType,
    val size: Float,
    val speed: Float
) {
    fun rect(): RectF {
        return RectF(x - size / 2f, y - size / 2f, x + size / 2f, y + size / 2f)
    }
}

enum class BonusType {
    PLUS_ONE,
    PLUS_TWO,
    TRIPLE,
    PLUS_FIVE
}

enum class GameState {
    PLAYING,
    WIN,
    LOSE
}
