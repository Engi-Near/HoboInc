const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.5;
const MAX_JUMP_FORCE = -15;
const MIN_JUMP_FORCE = -8;
const JUMP_CHARGE_TIME = 50; // milliseconds
const BASE_OBSTACLE_SPEED = 5;
const OBSTACLE_WIDTH = 20;
const OBSTACLE_HEIGHT = 40;
const PLAYER_SIZE = 30;
const BASE_SCORE_INTERVAL = 500; // 0.5 seconds in milliseconds
const SPEED_RAMP_INTERVAL = 250; // 0.25 seconds in milliseconds
const MAX_SPEED_MULTIPLIER = 5;
const TIME_TO_MAX_SPEED = 120000; // 2 minutes in milliseconds

// Image loading
const playerImage = new Image();
playerImage.src = 'player.png'; // You'll need to add this image file

const obstacleImage = new Image();
obstacleImage.src = 'obstacle.png'; // You'll need to add this image file

// Game state
let player = {
    x: 50,
    y: canvas.height - PLAYER_SIZE,
    velocityY: 0,
    isJumping: false,
    jumpStartTime: 0
};

let obstacles = [];
let score = 0;
let gameOver = false;
let lastScoreTime = 0;
let lastObstacleTime = 0;
let gameStartTime = 0;
let currentSpeedMultiplier = 1;

// Event listeners
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (gameOver) {
            resetGame();
        } else if (!player.isJumping) {
            player.jumpStartTime = Date.now();
        }
    }
});

document.addEventListener('keyup', (event) => {
    if (event.code === 'Space' && !player.isJumping) {
        const holdTime = Date.now() - player.jumpStartTime;
        const chargeRatio = Math.min(holdTime / JUMP_CHARGE_TIME, 1);
        const jumpForce = MIN_JUMP_FORCE + (chargeRatio * (MAX_JUMP_FORCE - MIN_JUMP_FORCE));
        player.velocityY = jumpForce;
        player.isJumping = true;
    }
});

// Game functions
function resetGame() {
    player.y = canvas.height - PLAYER_SIZE;
    player.velocityY = 0;
    player.isJumping = false;
    player.jumpStartTime = 0;
    obstacles = [];
    score = 0;
    gameOver = false;
    lastScoreTime = 0;
    lastObstacleTime = 0;
    gameStartTime = Date.now();
    currentSpeedMultiplier = 1;
}

function createObstacle() {
    obstacles.push({
        x: canvas.width,
        y: canvas.height - OBSTACLE_HEIGHT,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT
    });
}

function updateSpeedMultiplier() {
    const gameTime = Date.now() - gameStartTime;
    currentSpeedMultiplier = 1 + (gameTime / TIME_TO_MAX_SPEED) * (MAX_SPEED_MULTIPLIER - 1);
    currentSpeedMultiplier = Math.min(currentSpeedMultiplier, MAX_SPEED_MULTIPLIER);
}

function update() {
    if (gameOver) return;

    // Update speed multiplier
    updateSpeedMultiplier();

    // Update player
    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    // Ground collision
    if (player.y > canvas.height - PLAYER_SIZE) {
        player.y = canvas.height - PLAYER_SIZE;
        player.velocityY = 0;
        player.isJumping = false;
    }

    // Update time-based score (scaled with speed)
    const currentTime = Date.now();
    const scaledScoreInterval = BASE_SCORE_INTERVAL / currentSpeedMultiplier;
    if (currentTime - lastScoreTime >= scaledScoreInterval) {
        score++;
        lastScoreTime = currentTime;
    }

    // Create obstacles at random intervals (scaled with speed)
    const baseInterval = 2250; // Base random interval (750-3000ms)
    const scaledInterval = baseInterval / currentSpeedMultiplier;
    if (currentTime - lastObstacleTime >= Math.random() * scaledInterval + (750 / currentSpeedMultiplier)) {
        createObstacle();
        lastObstacleTime = currentTime;
    }

    // Update obstacles with current speed
    const currentObstacleSpeed = BASE_OBSTACLE_SPEED * currentSpeedMultiplier;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= currentObstacleSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Collision detection
    for (let obstacle of obstacles) {
        if (player.x < obstacle.x + obstacle.width &&
            player.x + PLAYER_SIZE > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + PLAYER_SIZE > obstacle.y) {
            gameOver = true;
            break;
        }
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    if (playerImage.complete) {
        ctx.drawImage(playerImage, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
    }

    // Draw obstacles
    for (let obstacle of obstacles) {
        if (obstacleImage.complete) {
            ctx.drawImage(obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    }

    // Draw score
    ctx.fillStyle = 'blue';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);

    // Draw game over message
    if (gameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '40px Arial';
        ctx.fillText('Game Over!', canvas.width/2 - 100, canvas.height/2);
        ctx.font = '20px Arial';
        ctx.fillText('Press Space to Restart', canvas.width/2 - 100, canvas.height/2 + 40);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop(); 
