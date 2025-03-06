class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.gameState = new GameState();
        
        // Initialize these as null until game starts
        this.map = null;
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.coins = [];
        this.lastEnemySpawn = 0;
        this.enemySpawnInterval = 2000; // 2 seconds
        this.scorePerKill = 100;

        // Make game instance globally available for weapon system
        window.game = this;

        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        // Mouse movement for aiming
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameState.currentState === GameState.PLAYING && this.player) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // Calculate camera position (centered on player)
                const cameraX = this.player.x - this.canvas.width / 2;
                const cameraY = this.player.y - this.canvas.height / 2;
                
                this.player.aim(mouseX, mouseY, cameraX, cameraY);
            }
        });

        // Mouse click for shooting
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState.currentState === GameState.PLAYING && this.player) {
                const projectiles = this.player.shoot();
                if (projectiles && projectiles.length > 0) {
                    this.projectiles.push(...projectiles);
                }
            }
        });

        // Menu and button interactions
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (this.gameState.currentState === GameState.MENU) {
                this.handleMenuClick(mouseX, mouseY);
            } else if (this.gameState.currentState === GameState.GAME_OVER || 
                      this.gameState.currentState === GameState.VICTORY) {
                this.handleGameOverClick(mouseX, mouseY);
            }
        });

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (this.gameState.currentState === GameState.PLAYING && this.player) {
                switch(e.key.toLowerCase()) {
                    case 'w': this.player.move('up', true); break;
                    case 's': this.player.move('down', true); break;
                    case 'a': this.player.move('left', true); break;
                    case 'd': this.player.move('right', true); break;
                    // Weapon switching
                    case '1': this.player.switchWeapon('pistol'); break;
                    case '2': this.player.switchWeapon('shotgun'); break;
                    case '3': this.player.switchWeapon('machinegun'); break;
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.gameState.currentState === GameState.PLAYING) {
                switch(e.key.toLowerCase()) {
                    case 'w': this.player.move('up', false); break;
                    case 's': this.player.move('down', false); break;
                    case 'a': this.player.move('left', false); break;
                    case 'd': this.player.move('right', false); break;
                }
            }
        });

        // Add space key listener for upgrades
        window.addEventListener('keydown', (e) => {
            if (this.gameState.currentState === GameState.UPGRADE && e.code === 'Space') {
                this.gameState.upgrade();
            }
        });
    }

    handleMenuClick(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const buttonHeight = 50;
        const buttonWidth = 200;

        // Check if click is within button bounds
        if (x >= centerX - buttonWidth/2 && x <= centerX + buttonWidth/2) {
            if (y >= centerY - buttonHeight/2 && y <= centerY + buttonHeight/2) {
                this.startGame('normal');
            } else if (y >= centerY + 60 - buttonHeight/2 && y <= centerY + 60 + buttonHeight/2) {
                this.startGame('endless');
            }
        }
    }

    handleGameOverClick(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const buttonHeight = 50;
        const buttonWidth = 200;

        if (x >= centerX - buttonWidth/2 && x <= centerX + buttonWidth/2 &&
            y >= centerY + 60 - buttonHeight/2 && y <= centerY + 60 + buttonHeight/2) {
            this.resetGame();
        }
    }

    startGame(mode) {
        this.gameState.startGame(mode);
        this.resetGameState();
    }

    resetGame() {
        this.gameState.reset();
        this.resetGameState();
    }

    resetGameState() {
        this.map = new Map(100, 100);
        // Spawn player in center of map
        const centerX = (this.map.width * this.map.tileSize) / 2;
        const centerY = (this.map.height * this.map.tileSize) / 2;
        this.player = new Player(centerX, centerY);
        this.enemies = [];
        this.projectiles = [];
        this.coins = [];
        this.lastEnemySpawn = 0;
    }

    spawnEnemy() {
        const now = Date.now();
        if (now - this.lastEnemySpawn >= this.enemySpawnInterval) {
            const enemyTypes = ['basic', 'tank', 'ranged'];
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            
            // Calculate actual map boundaries in pixels
            const mapWidth = this.map.width * this.map.tileSize;
            const mapHeight = this.map.height * this.map.tileSize;
            
            // Add margin to keep enemies away from edges
            const margin = 64;
            
            // Ensure spawn area is valid
            const spawnWidth = mapWidth - (margin * 2);
            const spawnHeight = mapHeight - (margin * 2);
            
            if (spawnWidth <= 0 || spawnHeight <= 0) {
                console.warn('Map too small for enemy spawn');
                return;
            }

            // Generate random position within valid spawn area
            const x = margin + Math.floor(Math.random() * spawnWidth);
            const y = margin + Math.floor(Math.random() * spawnHeight);
            
            // Validate position is within map
            if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
                this.enemies.push(new Enemy(x, y, type));
                this.lastEnemySpawn = now;
            } else {
                console.warn('Invalid enemy spawn position calculated:', x, y);
            }
        }
    }

    spawnCoin(x, y) {
        this.coins.push(new Coin(x, y));
    }

    update() {
        if (this.gameState.currentState !== GameState.PLAYING && 
            this.gameState.currentState !== GameState.UPGRADE) return;

        if (!this.player || !this.map) return;

        // Update player only if in PLAYING state
        if (this.gameState.currentState === GameState.PLAYING) {
            this.player.update(this.map);
        } else if (this.gameState.currentState === GameState.UPGRADE) {
            // Stop player movement in upgrade state
            this.player.velocityX = 0;
            this.player.velocityY = 0;
            // Reset movement keys to prevent movement when returning to PLAYING
            this.player.movementKeys = {
                up: false,
                down: false,
                left: false,
                right: false
            };
        }

        // Update coins
        this.coins = this.coins.filter(coin => {
            coin.update(this.player);
            
            // Check for coin pickup
            if (coin.isColliding(this.player)) {
                this.gameState.addCoin();
                return false;
            }
            return true;
        });

        // Only update game objects if not in upgrade state
        if (this.gameState.currentState === GameState.PLAYING) {
            // Spawn enemies
            this.spawnEnemy();

            // Update enemies
            this.enemies.forEach(enemy => {
                enemy.update(this.player, this.enemies, this.map);
                
                // Enemy shooting logic removed
            });

            // Update projectiles
            this.projectiles = this.projectiles.filter(projectile => {
                projectile.update();
                
                // Check for collisions
                if (projectile.isFriendly) {
                    // Friendly projectile hitting enemies
                    for (let i = this.enemies.length - 1; i >= 0; i--) {
                        if (projectile.isColliding(this.enemies[i])) {
                            if (this.enemies[i].takeDamage(projectile.damage)) {
                                this.gameState.updateScore(this.scorePerKill);
                                // Spawn coin when enemy dies
                                this.spawnCoin(this.enemies[i].x, this.enemies[i].y);
                                this.enemies.splice(i, 1);
                            }
                            return false;
                        }
                    }
                } else {
                    // Enemy projectile hitting player
                    if (projectile.isColliding(this.player)) {
                        if (this.player.takeDamage(projectile.damage)) {
                            this.gameState.playerDied();
                        }
                        return false;
                    }
                }

                // Remove projectiles that are out of bounds
                return projectile.x >= 0 && 
                       projectile.x <= this.map.width * this.map.tileSize &&
                       projectile.y >= 0 && 
                       projectile.y <= this.map.height * this.map.tileSize;
            });

            // Check for enemy collisions with player
            this.enemies.forEach(enemy => {
                if (enemy.canAttack(this.player)) {
                    if (this.player.takeDamage(enemy.attack(this.player))) {
                        this.gameState.playerDied();
                    }
                }
            });
        }
    }

    gameLoop() {
        this.update();
        this.renderer.render(this.gameState, this.map, this.player, this.enemies, this.projectiles, this.coins);
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 