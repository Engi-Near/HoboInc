const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const BASE_OBSTACLE_SPEED = 5;
const OBSTACLE_WIDTH = 20;
const OBSTACLE_HEIGHT = 40;
const PLAYER_SIZE = 30;
const BASE_SCORE_INTERVAL = 500; // 0.5 seconds in milliseconds
const SPEED_RAMP_INTERVAL = 250; // 0.25 seconds in milliseconds
const MAX_SPEED_MULTIPLIER = 5;
const TIME_TO_MAX_SPEED = 120000; // 2 minutes in milliseconds
const SHOOTER_ACTIVATION_SCORE = 10;
const SHOOTER_MOVE_TIME = 50; // milliseconds for smooth movement
const BULLET_SPEED_MULTIPLIER = 1.25;
const BULLET_RADIUS = 5;

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
    isJumping: false
};

let obstacles = [];
let bullets = [];
let shooter = {
    active: false,
    x: canvas.width,
    y: canvas.height / 2,
    targetY: canvas.height / 2,
    moveStartTime: 0,
    isMoving: false
};
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
            player.velocityY = JUMP_FORCE;
            player.isJumping = true;
        }
    }
});

// Game functions
function resetGame() {
    player.y = canvas.height - PLAYER_SIZE;
    player.velocityY = 0;
    player.isJumping = false;
    obstacles = [];
    bullets = [];
    shooter = {
        active: false,
        x: canvas.width,
        y: canvas.height / 2,
        targetY: canvas.height / 2,
        moveStartTime: 0,
        isMoving: false
    };
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

function createBullet() {
    bullets.push({
        x: shooter.x,
        y: shooter.y,
        radius: BULLET_RADIUS
    });
}

function updateSpeedMultiplier() {
    const gameTime = Date.now() - gameStartTime;
    currentSpeedMultiplier = 1 + (gameTime / TIME_TO_MAX_SPEED) * (MAX_SPEED_MULTIPLIER - 1);
    currentSpeedMultiplier = Math.min(currentSpeedMultiplier, MAX_SPEED_MULTIPLIER);
}

function updateShooter() {
    if (!shooter.active) {
        if (score >= SHOOTER_ACTIVATION_SCORE) {
            shooter.active = true;
            shooter.moveStartTime = Date.now();
            shooter.y = canvas.height / 2;
            shooter.targetY = canvas.height / 2;
            shooter.isMoving = false;
            console.log('Shooter activated at score:', score);
        }
        return;
    }

    const currentTime = Date.now();
    
    // If not moving and no bullets, start moving to new position
    if (!shooter.isMoving && bullets.length === 0) {
        shooter.isMoving = true;
        shooter.moveStartTime = currentTime;
        // Choose random position between 20% and 80% of screen height
        shooter.targetY = canvas.height * (0.2 + Math.random() * 0.6);
    }

    // Handle movement
    if (shooter.isMoving) {
        const moveProgress = Math.min((currentTime - shooter.moveStartTime) / SHOOTER_MOVE_TIME, 1);
        
        // Smooth movement using easeInOutQuad
        const t = moveProgress;
        const easeProgress = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        shooter.y = shooter.y + (shooter.targetY - shooter.y) * easeProgress;

        // When movement is complete, create bullet
        if (moveProgress >= 1) {
            shooter.isMoving = false;
            createBullet();
        }
    }
}

function update() {
    if (gameOver) return;

    // Update speed multiplier
    updateSpeedMultiplier();

    // Update shooter
    updateShooter();

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

    // Update bullets
    const bulletSpeed = currentObstacleSpeed * BULLET_SPEED_MULTIPLIER;
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x -= bulletSpeed;
        if (bullets[i].x + bullets[i].radius < 0) {
            bullets.splice(i, 1);
        }
    }

    // Collision detection with bullets
    for (let bullet of bullets) {
        const dx = (player.x + PLAYER_SIZE/2) - bullet.x;
        const dy = (player.y + PLAYER_SIZE/2) - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < PLAYER_SIZE/2 + bullet.radius) {
            gameOver = true;
            break;
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

    // Draw shooter
    if (shooter.active) {
        ctx.fillStyle = 'white';
        ctx.fillRect(shooter.x - 10, shooter.y - 20, 20, 40);
        // Debug log to verify shooter is being drawn
        console.log('Drawing shooter at y:', shooter.y);
    }

    // Draw bullets
    for (let bullet of bullets) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
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
