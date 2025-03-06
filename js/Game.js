class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        
        // Initialize game objects
        this.map = new Map(100, 100); // 100x100 tile map
        this.player = new Player(1600, 1600); // Start player in middle of map
        this.enemies = [];
        this.projectiles = [];
        
        // Game state
        this.isRunning = false;
        this.score = 0;
        this.wave = 1;
        
        // Input handling
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.setupInputHandlers();
        
        // Start game loop
        this.start();
    }

    setupInputHandlers() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            switch(e.key.toLowerCase()) {
                case 'w':
                    this.player.move('up', true);
                    break;
                case 's':
                    this.player.move('down', true);
                    break;
                case 'a':
                    this.player.move('left', true);
                    break;
                case 'd':
                    this.player.move('right', true);
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            switch(e.key.toLowerCase()) {
                case 'w':
                    this.player.move('up', false);
                    break;
                case 's':
                    this.player.move('down', false);
                    break;
                case 'a':
                    this.player.move('left', false);
                    break;
                case 'd':
                    this.player.move('right', false);
                    break;
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            
            // Calculate angle between player and mouse
            const dx = this.mouseX - (this.player.x + this.player.width / 2);
            const dy = this.mouseY - (this.player.y + this.player.height / 2);
            this.player.angle = Math.atan2(dy, dx);
        });

        window.addEventListener('click', () => {
            const projectile = this.player.shoot(this.mouseX, this.mouseY);
            if (projectile) {
                projectile.setDirection(this.player.angle);
                this.projectiles.push(projectile);
            }
        });
    }

    start() {
        this.isRunning = true;
        this.spawnEnemies();
        this.gameLoop();
    }

    spawnEnemies() {
        const numEnemies = 5 + this.wave * 2;
        for (let i = 0; i < numEnemies; i++) {
            // Spawn enemies at random positions around the edges of the map
            const side = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(side) {
                case 0: // Top
                    x = Math.random() * this.map.width * this.map.tileSize;
                    y = -32;
                    break;
                case 1: // Right
                    x = this.map.width * this.map.tileSize + 32;
                    y = Math.random() * this.map.height * this.map.tileSize;
                    break;
                case 2: // Bottom
                    x = Math.random() * this.map.width * this.map.tileSize;
                    y = this.map.height * this.map.tileSize + 32;
                    break;
                case 3: // Left
                    x = -32;
                    y = Math.random() * this.map.height * this.map.tileSize;
                    break;
            }
            
            const enemyTypes = ['basic', 'tank', 'ranged'];
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.enemies.push(new Enemy(x, y, type));
        }
    }

    update() {
        // Update player movement and collision
        this.player.update(this.map);

        // Update enemies with collision handling
        this.enemies.forEach(enemy => {
            enemy.update(this.player, this.enemies);
            
            // Check for enemy attacks
            if (enemy.canAttack(this.player)) {
                const damage = enemy.attack(this.player);
                if (damage > 0) {
                    if (this.player.takeDamage(damage)) {
                        this.gameOver();
                    }
                }
            }
        });

        // Update projectiles with penetration and knockback
        this.projectiles = this.projectiles.filter(projectile => {
            if (!projectile.update()) return false;

            // Check for projectile collisions with enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                if (projectile.isColliding(this.enemies[i]) && !projectile.hasHitEnemy(this.enemies[i])) {
                    if (this.enemies[i].takeDamage(projectile.damage)) {
                        this.enemies.splice(i, 1);
                        this.score += 100;
                    } else {
                        projectile.applyKnockback(this.enemies[i]);
                    }
                    projectile.markEnemyHit(this.enemies[i]);
                    
                    // Remove projectile if it can't penetrate anymore
                    if (!projectile.canPenetrate()) {
                        return false;
                    }
                }
            }

            // Check for projectile collisions with walls
            const tileX = Math.floor(projectile.x / this.map.tileSize);
            const tileY = Math.floor(projectile.y / this.map.tileSize);
            if (this.map.isWall(tileX, tileY)) {
                return false;
            }

            return true;
        });

        // Check if wave is complete
        if (this.enemies.length === 0) {
            this.wave++;
            this.spawnEnemies();
        }
    }

    gameOver() {
        this.isRunning = false;
        alert(`Game Over! Score: ${this.score}`);
        location.reload();
    }

    gameLoop() {
        if (!this.isRunning) return;

        this.update();
        this.renderer.render(this.map, this.player, this.enemies, this.projectiles);
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 
