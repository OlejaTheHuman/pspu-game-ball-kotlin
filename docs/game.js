const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blocksCounter = document.getElementById("blocksCounter");
const ballsCounter = document.getElementById("ballsCounter");
const restartButton = document.getElementById("restartButton");

const state = {
    width: 0,
    height: 0,
    platform: { x: 0, y: 0, width: 0, height: 0 },
    balls: [],
    blocks: [],
    bonuses: [],
    gameState: "playing",
    lastFrameTime: 0,
    lastNewRowTime: 0,
    lastBonusDropTime: 0,
    blockGap: 0,
    blockTopPadding: 0,
    blockSidePadding: 0,
    blockWidth: 0,
    blockHeight: 0,
    blockMoveSpeed: 0,
    ballRadius: 0,
    leftPressed: false,
    rightPressed: false
};

const settings = {
    blockRows: 6,
    blockColumns: 8,
    newRowTime: 8000,
    bonusDropChance: 12,
    bonusDropCooldown: 2500,
    maxBalls: 12,
    maxBonusesOnScreen: 3
};

function fitCanvas() {
    const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const widthValues = [
        window.innerWidth,
        document.documentElement.clientWidth,
        window.outerWidth
    ].filter((value) => value > 0);
    const heightValues = [
        window.innerHeight,
        document.documentElement.clientHeight,
        window.outerHeight
    ].filter((value) => value > 0);
    const viewportWidth = Math.min(...widthValues);
    const viewportHeight = Math.min(...heightValues);

    state.width = Math.max(320, viewportWidth);
    state.height = Math.max(520, viewportHeight);

    canvas.width = Math.floor(state.width * pixelRatio);
    canvas.height = Math.floor(state.height * pixelRatio);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    resetGame();
}

function resetGame() {
    const now = performance.now();

    state.gameState = "playing";
    state.balls = [];
    state.blocks = [];
    state.bonuses = [];
    state.lastFrameTime = now;
    state.lastNewRowTime = now;
    state.lastBonusDropTime = 0;

    state.platform.width = state.width * 0.28;
    state.platform.height = state.height * 0.025;
    state.platform.x = state.width / 2 - state.platform.width / 2;
    state.platform.y = state.height * 0.88;

    state.ballRadius = state.width * 0.025;
    state.blockGap = state.width * 0.015;
    state.blockSidePadding = state.width * 0.06;
    state.blockTopPadding = state.height * 0.11;
    state.blockWidth = (
        state.width -
        state.blockSidePadding * 2 -
        state.blockGap * (settings.blockColumns - 1)
    ) / settings.blockColumns;
    state.blockHeight = state.height * 0.035;
    state.blockMoveSpeed = (state.blockHeight + state.blockGap) / (settings.newRowTime / 1000);

    state.balls.push({
        x: state.width / 2,
        y: state.height * 0.62,
        vx: state.width * 0.36,
        vy: state.height * 0.42,
        radius: state.ballRadius
    });

    createBlocks();
    restartButton.classList.remove("visible");
}

function createBlocks() {
    for (let row = 0; row < settings.blockRows; row += 1) {
        addBlockRow(state.blockTopPadding + row * (state.blockHeight + state.blockGap));
    }
}

function addBlockRow(top) {
    for (let column = 0; column < settings.blockColumns; column += 1) {
        const left = state.blockSidePadding + column * (state.blockWidth + state.blockGap);
        state.blocks.push({
            x: left,
            y: top,
            width: state.blockWidth,
            height: state.blockHeight,
            broken: false
        });
    }
}

function gameLoop(time) {
    const secondsPassed = Math.min((time - state.lastFrameTime) / 1000, 0.033);
    state.lastFrameTime = time;

    updateGame(time, secondsPassed);
    drawGame();
    requestAnimationFrame(gameLoop);
}

function updateGame(now, secondsPassed) {
    if (state.gameState !== "playing") {
        updateHud();
        return;
    }

    updatePlatformWithKeyboard(secondsPassed);
    moveBlocks(secondsPassed);
    updateBalls(secondsPassed);
    updateBonuses(secondsPassed);

    if (state.blocks.length > 0 && state.blocks.every((block) => block.broken)) {
        finishGame("win");
        return;
    }

    addNewBlockRowIfNeeded(now);

    if (state.blocks.some((block) => !block.broken && block.y + block.height >= state.platform.y)) {
        finishGame("lose");
        return;
    }

    if (state.balls.length === 0) {
        finishGame("lose");
        return;
    }

    updateHud();
}

function updatePlatformWithKeyboard(secondsPassed) {
    const speed = state.width * 0.9;

    if (state.leftPressed) {
        movePlatform(state.platform.x + state.platform.width / 2 - speed * secondsPassed);
    }

    if (state.rightPressed) {
        movePlatform(state.platform.x + state.platform.width / 2 + speed * secondsPassed);
    }
}

function moveBlocks(secondsPassed) {
    for (const block of state.blocks) {
        if (!block.broken) {
            block.y += state.blockMoveSpeed * secondsPassed;
        }
    }
}

function addNewBlockRowIfNeeded(now) {
    if (now - state.lastNewRowTime >= settings.newRowTime) {
        addBlockRow(state.blockTopPadding);
        state.lastNewRowTime = now;
    }
}

function updateBalls(secondsPassed) {
    const aliveBalls = [];

    for (const ball of state.balls) {
        ball.x += ball.vx * secondsPassed;
        ball.y += ball.vy * secondsPassed;

        checkWallCollision(ball);
        checkPlatformCollision(ball);
        checkBlockCollision(ball);

        if (ball.y - ball.radius <= state.height) {
            aliveBalls.push(ball);
        }
    }

    state.balls = aliveBalls;
}

function checkWallCollision(ball) {
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
    }

    if (ball.x + ball.radius > state.width) {
        ball.x = state.width - ball.radius;
        ball.vx = -Math.abs(ball.vx);
    }

    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
    }
}

function checkPlatformCollision(ball) {
    if (ball.vy <= 0 || !circleIntersectsRect(ball, state.platform)) {
        return;
    }

    const platformCenter = state.platform.x + state.platform.width / 2;
    const hitPlace = (ball.x - platformCenter) / (state.platform.width / 2);
    const speed = Math.max(state.width * 0.36, Math.abs(ball.vy));

    ball.y = state.platform.y - ball.radius;
    ball.vx = hitPlace * speed;
    ball.vy = -Math.abs(speed);
}

function checkBlockCollision(ball) {
    for (const block of state.blocks) {
        if (!block.broken && circleIntersectsRect(ball, block)) {
            block.broken = true;
            ball.vy = -ball.vy;
            maybeCreateBonus(block.x + block.width / 2, block.y + block.height / 2);
            break;
        }
    }
}

function maybeCreateBonus(x, y) {
    const now = performance.now();

    if (
        state.bonuses.length >= settings.maxBonusesOnScreen ||
        now - state.lastBonusDropTime < settings.bonusDropCooldown
    ) {
        return;
    }

    if (Math.floor(Math.random() * 100) >= settings.bonusDropChance) {
        return;
    }

    state.bonuses.push({
        x,
        y,
        type: pickBonusType(),
        size: state.width * 0.055,
        speed: state.height * 0.24
    });
    state.lastBonusDropTime = now;
}

function pickBonusType() {
    const value = Math.floor(Math.random() * 100);

    if (value < 60) {
        return "plusOne";
    }

    if (value < 85) {
        return "plusTwo";
    }

    if (value < 95) {
        return "triple";
    }

    return "plusFive";
}

function updateBonuses(secondsPassed) {
    const activeBonuses = [];

    for (const bonus of state.bonuses) {
        bonus.y += bonus.speed * secondsPassed;

        if (rectsIntersect(bonusRect(bonus), state.platform)) {
            applyBonus(bonus.type);
        } else if (bonus.y - bonus.size / 2 <= state.height) {
            activeBonuses.push(bonus);
        }
    }

    state.bonuses = activeBonuses;
}

function applyBonus(type) {
    if (type === "plusOne") {
        addExtraBalls(1);
    } else if (type === "plusTwo") {
        addExtraBalls(2);
    } else if (type === "triple") {
        tripleBalls();
    } else if (type === "plusFive") {
        addExtraBalls(5);
    }
}

function tripleBalls() {
    const currentBalls = [...state.balls];
    const count = Math.min(4, settings.maxBalls - state.balls.length, currentBalls.length * 2);

    for (let index = 0; index < count; index += 1) {
        const source = currentBalls[index % currentBalls.length];
        const direction = index % 2 === 0 ? -1 : 1;
        createBallFrom(source, direction);
    }
}

function addExtraBalls(count) {
    const sourceBall = state.balls[0] || {
        x: state.platform.x + state.platform.width / 2,
        y: state.platform.y - state.ballRadius,
        vx: state.width * 0.28,
        vy: -state.height * 0.36,
        radius: state.ballRadius
    };

    for (let index = 0; index < count; index += 1) {
        const direction = index % 2 === 0 ? -1 : 1;
        createBallFrom(sourceBall, direction);
    }
}

function createBallFrom(sourceBall, direction) {
    if (state.balls.length >= settings.maxBalls) {
        return;
    }

    const speedX = Math.max(state.width * 0.24, Math.abs(sourceBall.vx));
    const speedY = Math.max(state.height * 0.36, Math.abs(sourceBall.vy));
    const jitter = 0.75 + Math.random() * 0.35;

    state.balls.push({
        x: sourceBall.x,
        y: sourceBall.y,
        vx: speedX * direction * jitter,
        vy: -speedY,
        radius: state.ballRadius
    });
}

function finishGame(result) {
    state.gameState = result;
    restartButton.classList.add("visible");
    updateHud();
}

function movePlatform(pointerX) {
    state.platform.x = clamp(pointerX - state.platform.width / 2, 0, state.width - state.platform.width);
}

function drawGame() {
    drawBackground();
    drawBlocks();
    drawBonuses();
    drawBalls();
    drawPlatform();
    drawMessage();
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#141923");
    gradient.addColorStop(1, "#0b111a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 1;
    const gridStep = 38;

    for (let x = 0; x < state.width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, state.height);
        ctx.stroke();
    }

    for (let y = 0; y < state.height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(state.width, y);
        ctx.stroke();
    }
}

function drawBlocks() {
    for (const block of state.blocks) {
        if (block.broken) {
            continue;
        }

        const rowTone = clamp((block.y - state.blockTopPadding) / (state.height * 0.62), 0, 1);
        ctx.fillStyle = mixColor([255, 184, 74], [255, 92, 92], rowTone);
        drawRoundRect(block.x, block.y, block.width, block.height, 7);
        ctx.fill();
    }
}

function drawBonuses() {
    ctx.font = "700 14px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const bonus of state.bonuses) {
        const rect = bonusRect(bonus);
        ctx.fillStyle = "#78e678";
        drawRoundRect(rect.x, rect.y, rect.width, rect.height, 8);
        ctx.fill();

        ctx.fillStyle = "#071109";
        ctx.fillText(bonusLabel(bonus.type), bonus.x, bonus.y + 1);
    }
}

function drawBalls() {
    for (const ball of state.balls) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(255, 255, 255, 0.35)";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function drawPlatform() {
    ctx.fillStyle = "#50b4ff";
    drawRoundRect(
        state.platform.x,
        state.platform.y,
        state.platform.width,
        state.platform.height,
        12
    );
    ctx.fill();
}

function drawMessage() {
    if (state.gameState === "playing") {
        return;
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.46)";
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 34px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.gameState === "win" ? "Victory!" : "Game over", state.width / 2, state.height * 0.45);
}

function updateHud() {
    blocksCounter.textContent = `Blocks: ${state.blocks.filter((block) => !block.broken).length}`;
    ballsCounter.textContent = `Balls: ${state.balls.length}`;
}

function bonusLabel(type) {
    if (type === "plusOne") {
        return "+1";
    }

    if (type === "plusTwo") {
        return "+2";
    }

    if (type === "triple") {
        return "x3";
    }

    return "+5";
}

function bonusRect(bonus) {
    return {
        x: bonus.x - bonus.size / 2,
        y: bonus.y - bonus.size / 2,
        width: bonus.size,
        height: bonus.size
    };
}

function circleIntersectsRect(circle, rect) {
    const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function rectsIntersect(first, second) {
    return (
        first.x < second.x + second.width &&
        first.x + first.width > second.x &&
        first.y < second.y + second.height &&
        first.y + first.height > second.y
    );
}

function drawRoundRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    ctx.lineTo(x + safeRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
}

function mixColor(start, end, amount) {
    const red = Math.round(start[0] + (end[0] - start[0]) * amount);
    const green = Math.round(start[1] + (end[1] - start[1]) * amount);
    const blue = Math.round(start[2] + (end[2] - start[2]) * amount);

    return `rgb(${red}, ${green}, ${blue})`;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    movePlatform(event.clientX);
});

canvas.addEventListener("pointermove", (event) => {
    if (event.buttons > 0 || event.pointerType === "touch") {
        movePlatform(event.clientX);
    }
});

window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        state.leftPressed = true;
    }

    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        state.rightPressed = true;
    }

    if (event.key === "Enter" && state.gameState !== "playing") {
        resetGame();
    }
});

window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        state.leftPressed = false;
    }

    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        state.rightPressed = false;
    }
});

restartButton.addEventListener("click", resetGame);
window.addEventListener("resize", fitCanvas);
window.addEventListener("contextmenu", (event) => event.preventDefault());

fitCanvas();
requestAnimationFrame(gameLoop);
