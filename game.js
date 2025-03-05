const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const OBSTACLE_SPEED = 5;
const OBSTACLE_WIDTH = 20;
const OBSTACLE_HEIGHT = 40;
const PLAYER_SIZE = 30;

// Game state
let player = {
    x: 50,
    y: canvas.height - PLAYER_SIZE,
    velocityY: 0,
    isJumping: false
};

let obstacles = [];
let score = 0;
let gameOver = false;

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
    score = 0;
    gameOver = false;
}

function createObstacle() {
    obstacles.push({
        x: canvas.width,
        y: canvas.height - OBSTACLE_HEIGHT,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT
    });
}

function update() {
    if (gameOver) return;

    // Update player
    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    // Ground collision
    if (player.y > canvas.height - PLAYER_SIZE) {
        player.y = canvas.height - PLAYER_SIZE;
        player.velocityY = 0;
        player.isJumping = false;
    }

    // Create obstacles
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 300) {
        createObstacle();
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= OBSTACLE_SPEED;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score++;
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
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

    // Draw obstacles
    ctx.fillStyle = 'red';
    for (let obstacle of obstacles) {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);

    // Draw game over message
    if (gameOver) {
        ctx.fillStyle = 'black';
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