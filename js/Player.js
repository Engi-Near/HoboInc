class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 32, 32, 5);
        this.maxHealth = 3;
        this.health = this.maxHealth;
        this.isImmune = false;
        this.immunityDuration = 2000; // 2 seconds
        this.immunityEndTime = 0;
        this.lastHealthGain = Date.now();
        this.healthGainInterval = 90000; // 90 seconds
        this.immunityFlashAlpha = 0;
        
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

        // Initialize weapons
        this.weapons = {
            pistol: new Weapon('pistol'),
            shotgun: new Weapon('shotgun'),
            machinegun: new Weapon('machinegun')
        };
        this.currentWeapon = this.weapons.pistol; // Start with pistol
    }

    // Add method to switch weapons
    switchWeapon(weaponType) {
        if (this.weapons[weaponType]) {
            this.currentWeapon = this.weapons[weaponType];
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
        // Update immunity status
        if (this.isImmune) {
            const now = Date.now();
            if (now >= this.immunityEndTime) {
                this.isImmune = false;
            } else {
                // Calculate flash alpha based on time
                const immunityProgress = (now - (this.immunityEndTime - this.immunityDuration)) / this.immunityDuration;
                const flashCycle = (immunityProgress * 2) % 1; // Complete two cycles during immunity
                this.immunityFlashAlpha = Math.sin(flashCycle * Math.PI) * 0.5; // Sine wave between 0 and 0.5
            }
        }

        // Check for health gain
        const now = Date.now();
        if (now - this.lastHealthGain >= this.healthGainInterval) {
            if (this.health < this.maxHealth) {
                this.health++;
            }
            this.lastHealthGain = now;
        }

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
        const projectiles = this.currentWeapon.shoot(
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.angle
        );
        
        return projectiles;
    }

    takeDamage(amount) {
        if (this.isImmune) return false;
        
        this.health--;
        this.isImmune = true;
        this.immunityEndTime = Date.now() + this.immunityDuration;
        
        return this.health <= 0;
    }
} 