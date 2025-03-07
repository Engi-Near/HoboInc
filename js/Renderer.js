class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.font = 'Arial';
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth * 0.8;
        this.canvas.height = window.innerHeight * 0.8;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(gameState, map, player, enemies, projectiles, coins) {
        this.clear();

        switch (gameState.currentState) {
            case GameState.MENU:
                this.renderMenu();
                break;
            case GameState.PLAYING:
            case GameState.UPGRADE:
                if (map && player) {
                    this.renderGame(map, player, enemies, projectiles, coins);
                    this.renderScore(gameState.score);
                    this.renderUpgradeBar(gameState.coins, gameState.upgradeCost);
                    if (gameState.currentState === GameState.UPGRADE) {
                        this.renderUpgradePrompt();
                    }
                }
                break;
            case GameState.GAME_OVER:
                if (map && player) {
                    this.renderGame(map, player, enemies, projectiles, coins);
                }
                this.renderGameOver();
                break;
            case GameState.VICTORY:
                if (map && player) {
                    this.renderGame(map, player, enemies, projectiles, coins);
                }
                this.renderVictory();
                break;
        }
    }

    renderMenu() {
        // Draw title
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px ' + this.font;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Commander Shoot', this.canvas.width / 2, this.canvas.height / 3);

        // Draw buttons
        this.drawButton('Normal Mode', this.canvas.width / 2, this.canvas.height / 2);
        this.drawButton('Endless Mode', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    renderGameOver() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px ' + this.font;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('You Died!', this.canvas.width / 2, this.canvas.height / 2);
        
        this.drawButton('Play Again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    renderVictory() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px ' + this.font;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Survived!', this.canvas.width / 2, this.canvas.height / 2);
        
        this.drawButton('Play Again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    drawButton(text, x, y) {
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = x - buttonWidth / 2;
        const buttonY = y - buttonHeight / 2;

        // Draw button background
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Draw button text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px ' + this.font;
        this.ctx.fillText(text, x, y + 8);
    }

    renderScore(score) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px ' + this.font;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${score}`, 20, 30);
    }

    renderUpgradeBar(coins, upgradeCost) {
        const barWidth = 200;
        const barHeight = 20;
        const x = this.canvas.width / 2 - barWidth / 2;
        const y = 20;

        // Draw gold border
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, barWidth, barHeight);

        // Draw fill
        const fillWidth = (coins / upgradeCost) * barWidth;
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(x, y, fillWidth, barHeight);

        // Draw text
        this.ctx.fillStyle = '#000';
        this.ctx.font = '14px ' + this.font;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${coins}/${upgradeCost}`, this.canvas.width / 2, y + 15);
    }

    renderUpgradePrompt() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px ' + this.font;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press SPACE to upgrade!', this.canvas.width / 2, this.canvas.height / 2);
    }

    renderGame(map, player, enemies, projectiles, coins) {
        // Calculate camera position to keep player centered
        this.cameraX = player.x - this.canvas.width / 2;
        this.cameraY = player.y - this.canvas.height / 2;

        // Save the current context state
        this.ctx.save();
        
        // Move the context to account for camera position
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // Render map tiles
        this.renderMap(map, this.cameraX, this.cameraY);

        // Render coins (between map and other objects)
        this.renderCoins(coins, this.cameraX, this.cameraY);

        // Render enemies
        this.renderEnemies(enemies, this.cameraX, this.cameraY);

        // Render projectiles
        this.renderProjectiles(projectiles, this.cameraX, this.cameraY);

        // Render player
        this.renderPlayer(player);

        // Restore the context state
        this.ctx.restore();

        // Render UI elements on top
        this.renderHealthBoxes(player);
    }

    renderMap(map, cameraX, cameraY) {
        const visibleTiles = map.getVisibleTiles(
            cameraX,
            cameraY,
            this.canvas.width,
            this.canvas.height
        );

        this.ctx.fillStyle = '#666';
        visibleTiles.forEach(tile => {
            this.ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        });
    }

    renderPlayer(player) {
        const ctx = this.ctx;
        
        // Save context for rotation
        ctx.save();
        
        // Translate to player position
        ctx.translate(player.x, player.y);
        ctx.translate(player.width / 2, player.height / 2);
        
        // Rotate context
        ctx.rotate(player.angle);
        
        // Draw player sprite/rectangle
        ctx.translate(-player.width / 2, -player.height / 2);
        player.sprite.render(ctx, 0, 0);
        
        // Draw aim line
        ctx.beginPath();
        ctx.moveTo(player.width / 2, player.height / 2);
        ctx.lineTo(player.width / 2 + player.aimLineLength, player.height / 2);
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        
        ctx.restore();

        // Draw immunity flash if player is immune
        if (player.isImmune && player.immunityFlashAlpha > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${player.immunityFlashAlpha})`;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.restore();
        }
    }

    renderEnemies(enemies, cameraX, cameraY) {
        enemies.forEach(enemy => {
            // Only render enemies within the visible area
            if (this.isInView(enemy, cameraX, cameraY)) {
                // Draw enemy sprite
                enemy.render(this.ctx);
                
                // Render enemy health bar
                this.ctx.fillStyle = '#f00';
                this.ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5);
                this.ctx.fillStyle = '#0f0';
                this.ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * (enemy.health / enemy.getHealthByType()), 5);
            }
        });
    }

    renderProjectiles(projectiles, cameraX, cameraY) {
        projectiles.forEach(projectile => {
            if (this.isInView(projectile, cameraX, cameraY)) {
                projectile.render(this.ctx);
            }
        });
    }

    renderCoins(coins, cameraX, cameraY) {
        coins.forEach(coin => {
            if (this.isInView(coin, cameraX, cameraY)) {
                coin.render(this.ctx);
            }
        });
    }

    isInView(object, cameraX, cameraY) {
        return object.x >= cameraX &&
               object.x <= cameraX + this.canvas.width &&
               object.y >= cameraY &&
               object.y <= cameraY + this.canvas.height;
    }

    renderHealthBoxes(player) {
        const ctx = this.ctx;
        const boxSize = 30;
        const margin = 10;
        const spacing = 5;
        const startX = this.canvas.width - (boxSize + margin);
        const startY = this.canvas.height - (boxSize + margin);

        for (let i = 0; i < player.maxHealth; i++) {
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                startX - (i * (boxSize + spacing)),
                startY,
                boxSize,
                boxSize
            );

            if (i < player.health) {
                ctx.fillStyle = '#f00';
                ctx.fillRect(
                    startX - (i * (boxSize + spacing)),
                    startY,
                    boxSize,
                    boxSize
                );
            }
        }
    }
} 
