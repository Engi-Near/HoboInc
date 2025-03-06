class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth * 0.8;
        this.canvas.height = window.innerHeight * 0.8;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(map, player, enemies, projectiles) {
        this.clear();

        // Calculate camera position to keep player centered
        const cameraX = player.x - this.canvas.width / 2;
        const cameraY = player.y - this.canvas.height / 2;

        // Save the current context state
        this.ctx.save();
        
        // Move the context to account for camera position
        this.ctx.translate(-cameraX, -cameraY);

        // Render map tiles
        this.renderMap(map, cameraX, cameraY);

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
        // Draw player
        this.ctx.fillStyle = '#00f';
        this.ctx.fillRect(player.x, player.y, player.width, player.height);
        
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
                this.ctx.fillStyle = '#f00';
                this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                
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
                this.ctx.fillStyle = '#ff0';
                this.ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
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
