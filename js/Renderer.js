class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.font = 'Arial';
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(gameState, map, player, enemies, projectiles, coins, upgradeUI, damageNumbers) {
        this.clear();

        switch (gameState.currentState) {
            case GameState.MENU:
                this.renderMenu();
                break;
            case GameState.PLAYING:
            case GameState.UPGRADE:
                if (map && player) {
                    this.renderGame(map, player, enemies, projectiles, coins);
                    this.renderDamageNumbers(damageNumbers);
                    this.renderUI(gameState, player);
                    if (gameState.currentState === GameState.UPGRADE) {
                        upgradeUI.draw(this.ctx, this.canvas.width, this.canvas.height);
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
        // This method is now unused - functionality moved to renderUI
    }

    renderUpgradeBar(coins, upgradeCost) {
        // This method is now unused - functionality moved to renderUI
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
        this.cameraX = Math.floor(player.x - this.canvas.width / 2);
        this.cameraY = Math.floor(player.y - this.canvas.height / 2);

        // Clear the entire canvas
        this.clear();

        // Draw background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render all game elements
        this.renderMap(map, this.cameraX, this.cameraY);
        this.renderCoins(coins);
        this.renderEnemies(enemies);
        this.renderProjectiles(projectiles);
        this.renderPlayer(player);

        // Render UI elements (these are in screen space)
        this.renderHealthBoxes(player);
        
        // Render weapon name above health boxes
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'right';
        const weaponY = this.canvas.height - 45 - 10; // 45 pixels above health boxes (30px box + 15px margin)
        this.ctx.fillText(player.currentWeapon.name, this.canvas.width - 10, weaponY);
    }

    worldToScreen(x, y) {
        return {
            x: Math.floor(x - this.cameraX),
            y: Math.floor(y - this.cameraY)
        };
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
            const pos = this.worldToScreen(tile.x, tile.y);
            this.ctx.fillRect(pos.x, pos.y, tile.width, tile.height);
        });
    }

    renderPlayer(player) {
        const ctx = this.ctx;
        const pos = this.worldToScreen(player.x, player.y);
        
        // Save context for rotation
        ctx.save();
        
        // Move to player position and center
        ctx.translate(pos.x + player.width / 2, pos.y + player.height / 2);
        
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
            ctx.fillRect(pos.x, pos.y, player.width, player.height);
            ctx.restore();
        }
    }

    renderEnemies(enemies) {
        enemies.forEach(enemy => {
            if (this.isInView(enemy, this.cameraX, this.cameraY)) {
                const pos = this.worldToScreen(enemy.x, enemy.y);
                
                // Draw enemy sprite
                this.ctx.save();
                this.ctx.translate(pos.x, pos.y);
                enemy.sprite.render(this.ctx, 0, 0);
                this.ctx.restore();
                
                // Render enemy health bar
                this.ctx.fillStyle = '#f00';
                this.ctx.fillRect(pos.x, pos.y - 10, enemy.width, 5);
                this.ctx.fillStyle = '#0f0';
                this.ctx.fillRect(pos.x, pos.y - 10, enemy.width * (enemy.health / enemy.getHealthByType()), 5);
            }
        });
    }

    renderProjectiles(projectiles) {
        projectiles.forEach(projectile => {
            if (this.isInView(projectile, this.cameraX, this.cameraY)) {
                const pos = this.worldToScreen(projectile.x, projectile.y);
                
                this.ctx.save();
                this.ctx.translate(pos.x, pos.y);
                projectile.sprite.render(this.ctx, 0, 0);
                this.ctx.restore();
            }
        });
    }

    renderCoins(coins) {
        coins.forEach(coin => {
            if (this.isInView(coin, this.cameraX, this.cameraY)) {
                const pos = this.worldToScreen(coin.x, coin.y);
                
                this.ctx.save();
                this.ctx.translate(pos.x, pos.y);
                coin.sprite.render(this.ctx, 0, 0);
                this.ctx.restore();
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

    renderDamageNumbers(damageNumbers) {
        damageNumbers.forEach(damageNumber => {
            damageNumber.render(this.ctx, this.cameraX, this.cameraY);
        });
    }

    renderUI(gameState, player) {
        // Set font properties
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';

        // Render score
        this.ctx.fillText(`Score: ${gameState.score}`, 10, 30);

        // Render coin progress bar
        const barWidth = 200;
        const barHeight = 20;
        const barX = this.canvas.width - barWidth - 10;
        const barY = 10;

        // Draw background with slight transparency
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Calculate progress
        const upgradeCost = gameState.getUpgradeCost();
        const currentCoins = gameState.coins % upgradeCost;
        const progress = currentCoins / upgradeCost;

        // Draw progress bar with gradient
        if (progress > 0) {
            const gradient = this.ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
            gradient.addColorStop(0, '#ffd700');    // Gold
            gradient.addColorStop(0.5, '#fff1aa');  // Light gold
            gradient.addColorStop(1, '#ffd700');    // Gold
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }

        // Draw segments
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        for (let i = 1; i < upgradeCost; i++) {
            const segX = barX + (barWidth * i / upgradeCost);
            this.ctx.beginPath();
            this.ctx.moveTo(segX, barY);
            this.ctx.lineTo(segX, barY + barHeight);
            this.ctx.stroke();
        }

        // Draw border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Draw health boxes first
        this.renderHealthBoxes(player);

        // Draw shields on top of health boxes
        if (player && player.shields > 0) {
            const shieldSize = 20;
            const shieldSpacing = 5;
            const shieldX = this.canvas.width - (shieldSize + 10);
            const shieldY = this.canvas.height - (shieldSize + 10);

            for (let i = 0; i < player.shields; i++) {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.fillRect(
                    shieldX - (i * (shieldSize + shieldSpacing)),
                    shieldY,
                    shieldSize,
                    shieldSize
                );
            }
        }
    }
} 