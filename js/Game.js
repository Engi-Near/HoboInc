class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.gameState = new GameState();
        this.upgradeSystem = new UpgradeSystem();
        this.upgradeUI = new UpgradeUI();
        
        // Initialize these as null until game starts
        this.map = null;
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.coins = [];
        this.lastEnemySpawn = 0;
        this.enemySpawnRate = 1000; // 1 second
        this.scorePerKill = 100;
        this.gameStartTime = 0;
        this.isMouseDown = false;
        this.damageNumbers = [];

        // New threat-based wave system
        this.minThreat = 0;
        this.maxThreat = 1;
        this.lastThreatUpdate = 0;
        this.maxThreatUpdateInterval = 10000; // 10 seconds
        this.minThreatUpdateInterval = 50000; // 50 seconds
        this.threatIncrement = 0.1;
        this.lastMaxThreatUpdate = 0;
        this.lastMinThreatUpdate = 0;

        // Make game instance globally available for weapon system
        window.game = this;

        // Add upgrade state handling
        this.lastState = null;

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

        // Mouse down for shooting
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.gameState.currentState === GameState.PLAYING && this.player) { // Only respond to left click during gameplay
                this.isMouseDown = true;
                const projectiles = this.player.shoot();
                if (projectiles && projectiles.length > 0) {
                    this.projectiles.push(...projectiles);
                }
            }
        });

        // Mouse up to stop shooting
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Only respond to left click
                this.isMouseDown = false;
            }
        });

        // Mouse leave to stop shooting
        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
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
            if (this.gameState.currentState === GameState.UPGRADE) {
                switch(e.code) {
                    case 'ArrowLeft':
                        this.upgradeUI.selectPrevious();
                        break;
                    case 'ArrowRight':
                        this.upgradeUI.selectNext();
                        break;
                    case 'Enter':
                        const selectedUpgrade = this.upgradeUI.getSelectedUpgrade();
                        if (selectedUpgrade) {
                            this.upgradeSystem.applyUpgrade(this.player, selectedUpgrade);
                            this.gameState.upgrade();
                        }
                        break;
                }
                return;
            }

            if (this.gameState.currentState === GameState.PLAYING && this.player) {
                switch(e.key.toLowerCase()) {
                    case 'w': this.player.move('up', true); break;
                    case 's': this.player.move('down', true); break;
                    case 'a': this.player.move('left', true); break;
                    case 'd': this.player.move('right', true); break;
                    case 'f': this.player.switchWeapon(); break;
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
        // This method is no longer used with the new system
        return null;
    }

    spawnWave() {
        const now = Date.now();
        const gameTime = now - this.gameStartTime;

        // Update threat levels
        // Update max threat every 10 seconds
        
        if (now - this.lastMaxThreatUpdate >= this.maxThreatUpdateInterval) {
            this.maxThreat += this.threatIncrement;
            this.lastMaxThreatUpdate = now;
        }
        
        // Update min threat every 50 seconds
        if (now - this.lastMinThreatUpdate >= this.minThreatUpdateInterval) {
            this.minThreat += this.threatIncrement;
            this.lastMinThreatUpdate = now;
        }

        // Check if it's time to spawn a new enemy
        if (now - this.lastEnemySpawn >= this.enemySpawnRate) {
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

            // Generate random threat rating between min and max
            let threatRating;
            do {
                threatRating = Math.round(this.minThreat + Math.random() * (this.maxThreat - this.minThreat));
            } while (threatRating === 0); // Reroll if we get 0

            // Get random enemy type for this threat rating
            const enemyType = Enemy.getRandomEnemyTypeByThreat(threatRating);

            // Generate random position within valid spawn area
            const x = margin + Math.floor(Math.random() * spawnWidth);
            const y = margin + Math.floor(Math.random() * spawnHeight);
            
            if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
                this.enemies.push(new Enemy(x, y, enemyType));
            }

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

    async resetGameState() {
        this.map = new Map(100, 100);
        this.map.generateMap();
        
        // Spawn player in center of map
        const centerX = (this.map.width * this.map.tileSize) / 2;
        const centerY = (this.map.height * this.map.tileSize) / 2;
        this.player = new Player(centerX, centerY);
        this.enemies = [];
        this.projectiles = [];
        this.coins = [];
        this.lastEnemySpawn = 0;
        this.upgradeUI.hide();
        this.lastState = null;
    }

    spawnCoin(x, y) {
        this.coins.push(new Coin(x, y));
    }

    update() {
        // Check for state changes
        if (this.lastState !== this.gameState.currentState) {
            if (this.gameState.currentState === GameState.UPGRADE) {
                // Get random upgrades when entering upgrade state
                const upgrades = this.upgradeSystem.getRandomUpgrades();
                this.upgradeUI.show(upgrades);
            } else if (this.lastState === GameState.UPGRADE) {
                // Hide upgrade UI when leaving upgrade state
                this.upgradeUI.hide();
            }
            this.lastState = this.gameState.currentState;
        }

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

        // Handle continuous shooting
        if (this.isMouseDown && this.player && this.gameState.currentState === GameState.PLAYING) {
            const projectiles = this.player.shoot();
            if (projectiles && projectiles.length > 0) {
                this.projectiles.push(...projectiles);
            }
        }

        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(damageNumber => damageNumber.update());

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
                    if (Array.isArray(projectile)) {
                        this.projectiles.push(...projectile);
                    } else {
                        this.projectiles.push(projectile);
                    }
                }
            });

            // Update projectiles
            const now = Date.now();
            this.projectiles = this.projectiles.filter(projectile => {
                // Skip update if projectile is delayed
                if (projectile.delay && now - this.player.currentWeapon.lastShot < projectile.delay) {
                    return true;
                }
                
                projectile.update();
                
                // Check for collisions
                if (projectile.isFriendly) {
                    // Friendly projectile hitting enemies
                    for (let i = this.enemies.length - 1; i >= 0; i--) {
                        if (projectile.isColliding(this.enemies[i])) {
                            // Apply knockback before damage
                            projectile.applyKnockback(this.enemies[i]);
                            
                            // Add damage number for all hits
                            const isCritical = this.player.hasCritical && Math.random() < this.player.criticalChance;
                            this.damageNumbers.push(new DamageNumber(
                                this.enemies[i].x + this.enemies[i].width / 2,
                                this.enemies[i].y,
                                projectile.damage,
                                isCritical
                            ));
                            
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
        this.renderer.render(this.gameState, this.map, this.player, this.enemies, this.projectiles, this.coins, this.upgradeUI, this.damageNumbers);
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 