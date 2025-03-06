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
                this.renderGame(map, player, enemies, projectiles, coins);
                this.renderScore(gameState.score);
                this.renderUpgradeBar(gameState.coins, gameState.upgradeCost);
                break;
            case GameState.GAME_OVER:
                this.renderGameOver();
                break;
            case GameState.VICTORY:
                this.renderVictory();
                break;
            case GameState.UPGRADE:
                this.renderGame(map, player, enemies, projectiles, coins);
                this.renderScore(gameState.score);
                this.renderUpgradeBar(gameState.coins, gameState.upgradeCost);
                this.renderUpgradePrompt();
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
        const cameraX = player.x - this.canvas.width / 2;
        const cameraY = player.y - this.canvas.height / 2;

        // Save the current context state
        this.ctx.save();
        
        // Move the context to account for camera position
        this.ctx.translate(-cameraX, -cameraY);

        // Render map tiles
        this.renderMap(map, cameraX, cameraY);

        // Render coins (between map and other objects)
        this.renderCoins(coins, cameraX, cameraY);

        // Render enemies
        this.renderEnemies(enemies, cameraX, cameraY);

        // Render projectiles
        this.renderProjectiles(projectiles, cameraX, cameraY);

        // Render player
        this.renderPlayer(player);

        // Restore the context state
        this.ctx.restore();
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
        // Draw player sprite
        player.render(this.ctx);
        
        // Draw health bar
        this.ctx.fillStyle = '#f00';
        this.ctx.fillRect(player.x, player.y - 10, player.width, 5);
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(player.x, player.y - 10, player.width * (player.health / 100), 5);

        // Draw aiming line
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#00f';
        this.ctx.lineWidth = 2;
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(
            centerX + Math.cos(player.angle) * player.aimLineLength,
            centerY + Math.sin(player.angle) * player.aimLineLength
        );
        this.ctx.stroke();
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
} 