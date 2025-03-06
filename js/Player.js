class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 32, 32, 5);
        this.health = 100;
        this.weapon = {
            damage: 20,
            fireRate: 250, // milliseconds
            lastShot: 0
        };
        this.angle = 0;
        this.movementKeys = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        this.aimLineLength = 50; // Length of the aiming line
        this.sprite = new Sprite(this.width, this.height, '#00f'); // Blue color for player
        this.pickupRange = 100; // Range for coin pickup
    }

    move(direction, isMoving) {
        this.movementKeys[direction] = isMoving;
        this.updateVelocity();
    }

    updateVelocity() {
        let dx = 0;
        let dy = 0;

        if (this.movementKeys.up) dy -= 1;
        if (this.movementKeys.down) dy += 1;
        if (this.movementKeys.left) dx -= 1;
        if (this.movementKeys.right) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = dx / length * this.speed;
            dy = dy / length * this.speed;
        } else {
            dx *= this.speed;
            dy *= this.speed;
        }

        this.velocityX = dx;
        this.velocityY = dy;
    }

    update(map) {
        // Store previous position
        const prevX = this.x;
        const prevY = this.y;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Check for wall collisions
        const bounds = this.getBounds();
        const tileX1 = Math.floor(bounds.left / map.tileSize);
        const tileX2 = Math.floor(bounds.right / map.tileSize);
        const tileY1 = Math.floor(bounds.top / map.tileSize);
        const tileY2 = Math.floor(bounds.bottom / map.tileSize);

        // Check horizontal collision
        if (map.isWall(tileX1, tileY1) || map.isWall(tileX1, tileY2) ||
            map.isWall(tileX2, tileY1) || map.isWall(tileX2, tileY2)) {
            this.x = prevX;
        }

        // Check vertical collision
        if (map.isWall(tileX1, tileY1) || map.isWall(tileX2, tileY1) ||
            map.isWall(tileX1, tileY2) || map.isWall(tileX2, tileY2)) {
            this.y = prevY;
        }
    }

    aim(mouseX, mouseY, cameraX, cameraY) {
        // Convert screen coordinates to world coordinates
        const worldMouseX = mouseX + cameraX;
        const worldMouseY = mouseY + cameraY;
        
        // Calculate angle between player center and world mouse position
        const dx = worldMouseX - (this.x + this.width / 2);
        const dy = worldMouseY - (this.y + this.height / 2);
        this.angle = Math.atan2(dy, dx);
    }

    shoot(mouseX, mouseY, cameraX, cameraY) {
        const now = Date.now();
        if (now - this.weapon.lastShot >= this.weapon.fireRate) {
            this.weapon.lastShot = now;
            
            // Convert screen coordinates to world coordinates
            const worldMouseX = mouseX + cameraX;
            const worldMouseY = mouseY + cameraY;
            
            // Calculate angle between player center and world mouse position
            const dx = worldMouseX - (this.x + this.width / 2);
            const dy = worldMouseY - (this.y + this.height / 2);
            const angle = Math.atan2(dy, dx);
            
            const projectile = new Projectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                8,
                8,
                10,
                this.weapon.damage,
                3, // penetration
                100 // knockback
            );
            
            // Set projectile properties
            projectile.setDirection(angle);
            projectile.isFromPlayer = true;
            projectile.isFriendly = true; // Mark as friendly projectile
            
            return projectile;
        }
        return null;
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
} 