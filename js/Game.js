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
        this.enemySpawnInterval = 10000; // 10 seconds
        this.scorePerKill = 100;
        this.gameStartTime = 0;

        // Wave definitions for normal mode
        this.normalModeWaves = [
            {
                time: 0,
                enemies: [
                    { type: 'basic', count: 5 }
                ]
            },
            {
                time: 60,
                enemies: [
                    { type: 'basic', count: 4 },
                    { type: 'tank', count: 1 }
                ]
            },
            {
                time: 120,
                enemies: [
                    { type: 'basic', count: 2 },
                    { type: 'tank', count: 2 },
                    { type: 'ranged', count: 1 }
                ]
            }
        ];

        // Wave definitions for endless mode
        this.endlessModeWaves = [
            {
                time: 0,
                enemies: [
                    { type: 'basic', count: 5 }
                ]
            },
            {
                time: 30,
                enemies: [
                    { type: 'basic', count: 7 }
                ]
            },
            {
                time: 60,
                enemies: [
                    { type: 'basic', count: 6 },
                    { type: 'tank', count: 1 }
                ]
            },
            {
                time: 90,
                enemies: [
                    { type: 'basic', count: 8 }
                ]
            },
            {
                time: 120,
                enemies: [
                    { type: 'basic', count: 7 },
                    { type: 'tank', count: 2 },
                    { type: 'ranged', count: 1 }
                ]
            },
            {
                time: 150,
                enemies: [
                    { type: 'basic', count: 8 },
                    { type: 'tank', count: 3 },
                    { type: 'ranged', count: 2 }
                ]
            },
            {
                time: 200,
                enemies: [
                    { type: 'basic', count: 10 },
                    { type: 'tank', count: 5 },
                    { type: 'ranged', count: 3 }
                ]
            }
        ];

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
                // Instead of resetting coins, just decrement by the upgrade cost
                const upgradeCost = this.gameState.getUpgradeCost();
                this.gameState.coins -= upgradeCost; // Decrement coins by the cost
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

    getCurrentWave() {
        if (this.gameState.currentState !== GameState.PLAYING) return null;
        
        const gameTime = (Date.now() - this.gameStartTime) / 1000; // Convert to seconds
        let currentWave = null;
        
        // Get the appropriate wave table based on game mode
        const waveTable = this.gameState.gameMode === 'endless' ? this.endlessModeWaves : this.normalModeWaves;

        // Find the latest wave for the current time
        for (const wave of waveTable) {
            if (gameTime >= wave.time) {
                currentWave = {...wave};
            } else {
                break;
            }
        }

        // For endless mode, add scaling enemies after 200 seconds
        if (this.gameState.gameMode === 'endless' && gameTime > 200) {
            const extraWaves = Math.floor((gameTime - 200) / 30); // How many 30-second intervals past 200s
            if (extraWaves > 0) {
                // Add scaling enemies
                currentWave.enemies = currentWave.enemies.map(enemy => ({...enemy})); // Clone the enemies array
                
                // Find or create enemy types
                let basicEnemy = currentWave.enemies.find(e => e.type === 'basic');
                let tankEnemy = currentWave.enemies.find(e => e.type === 'tank');
                let rangedEnemy = currentWave.enemies.find(e => e.type === 'ranged');

                if (!basicEnemy) {
                    basicEnemy = { type: 'basic', count: 0 };
                    currentWave.enemies.push(basicEnemy);
                }
                if (!tankEnemy) {
                    tankEnemy = { type: 'tank', count: 0 };
                    currentWave.enemies.push(tankEnemy);
                }
                if (!rangedEnemy) {
                    rangedEnemy = { type: 'ranged', count: 0 };
                    currentWave.enemies.push(rangedEnemy);
                }

                // Add scaling enemies for each 30-second interval
                basicEnemy.count += extraWaves * 2;  // +2 basic per interval
                tankEnemy.count += extraWaves;       // +1 tank per interval
                rangedEnemy.count += extraWaves;     // +1 ranged per interval
            }
        }

        return currentWave;
    }

    spawnWave() {
        const wave = this.getCurrentWave();
        if (!wave) return;

        const now = Date.now();
        if (now - this.lastEnemySpawn >= this.enemySpawnInterval) {
            // Calculate map boundaries
            const mapWidth = this.map.width * this.map.tileSize;
            const mapHeight = this.map.height * this.map.tileSize;
            const margin = 64;
            
            // Calculate spawn area
            const spawnWidth = mapWidth - (margin * 2);
            const spawnHeight = mapHeight - (margin * 2);
            
            if (spawnWidth <= 0 || spawnHeight <= 0) {
                console.warn('Map too small for enemy spawn');
                return;
            }

            // Count current enemies by type
            const currentCounts = {};
            this.enemies.forEach(enemy => {
                currentCounts[enemy.type] = (currentCounts[enemy.type] || 0) + 1;
            });

            // Spawn missing enemies
            wave.enemies.forEach(enemyType => {
                const currentCount = currentCounts[enemyType.type] || 0;
                if (currentCount < enemyType.count) {
                    // Generate random position within valid spawn area
                    const x = margin + Math.floor(Math.random() * spawnWidth);
                    const y = margin + Math.floor(Math.random() * spawnHeight);
                    
                    if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
                        this.enemies.push(new Enemy(x, y, enemyType.type));
                    }
                }
            });

            this.lastEnemySpawn = now;
        }
    }

    startGame(mode) {
        this.gameState.startGame(mode);
        this.resetGameState();
        this.gameStartTime = Date.now();
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
            // Spawn enemies based on current wave
            this.spawnWave();

            // Update enemies
            this.enemies.forEach(enemy => {
                enemy.update(this.player, this.enemies, this.map);
                
                // Enemy shooting logic
                const projectile = enemy.shootProjectile(this.player.x, this.player.y);
                if (projectile) {
                    projectile.isFromPlayer = false;
                    projectile.isFriendly = false;
                    this.projectiles.push(projectile);
                }
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