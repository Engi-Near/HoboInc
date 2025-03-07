class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 32, 32, 5);
        this.sprite = new Sprite(this.width, this.height, '#0f0');
        this.angle = 0;
        this.health = 3;
        this.maxHealth = 3;
        this.lastDamageTime = 0;
        this.immunityDuration = 2000; // 2 seconds
        this.lastHealthGainTime = 0;
        this.healthGainInterval = 90000; // 90 seconds
        
        // Movement
        this.movementKeys = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        // Weapon system
        this.currentWeapon = new Weapon('pistol'); // Start with pistol
    }

    switchWeapon(type) {
        const validWeapons = [
            'pistol',
            'shotgun',
            'machinegun',
            'upgradedshotgun',
            'rifle',
            'supershotgun'
        ];

        if (validWeapons.includes(type)) {
            this.currentWeapon = new Weapon(type);
        }
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
        // Regular movement updates
        const prevX = this.x;
        const prevY = this.y;

        this.x += this.velocityX;
        this.y += this.velocityY;

        const bounds = this.getBounds();
        const tileX1 = Math.floor(bounds.left / map.tileSize);
        const tileX2 = Math.floor(bounds.right / map.tileSize);
        const tileY1 = Math.floor(bounds.top / map.tileSize);
        const tileY2 = Math.floor(bounds.bottom / map.tileSize);

        if (map.isWall(tileX1, tileY1) || map.isWall(tileX1, tileY2) ||
            map.isWall(tileX2, tileY1) || map.isWall(tileX2, tileY2)) {
            this.x = prevX;
        }

        if (map.isWall(tileX1, tileY1) || map.isWall(tileX2, tileY1) ||
            map.isWall(tileX1, tileY2) || map.isWall(tileX2, tileY2)) {
            this.y = prevY;
        }
    }

    aim(mouseX, mouseY, cameraX, cameraY) {
        // Convert screen coordinates to world coordinates
        const worldMouseX = mouseX + cameraX;
        const worldMouseY = mouseY + cameraY;

        // Calculate angle from player center to mouse position
        const playerCenterX = this.x + this.width / 2;
        const playerCenterY = this.y + this.height / 2;
        
        const dx = worldMouseX - playerCenterX;
        const dy = worldMouseY - playerCenterY;
        
        this.angle = Math.atan2(dy, dx);
    }

    shoot() {
        if (this.currentWeapon) {
            return this.currentWeapon.shoot(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.angle
            );
        }
        return [];
    }

    takeDamage(amount) {
        if (this.isImmune) return false;
        
        this.health--;
        this.isImmune = true;
        this.immunityEndTime = Date.now() + this.immunityDuration;
        
        return this.health <= 0;
    }
} 
