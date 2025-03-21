class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 28, 28, 5);
        this.sprite = new Sprite(this.width, this.height, '#0f0');
        this.angle = 0;
        this.health = 3;
        this.maxHealth = 3;
        this.lastDamageTime = 0;
        this.immunityDuration = 2000; // 2 seconds
        this.lastHealthGainTime = 0;
        this.healthGainInterval = 90000; // 90 seconds
        this.hasHealthRegen = false; // New property for health regen upgrade
        this.aimLineLength = 50; // Length of the aiming line
        
        // Movement
        this.movementKeys = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        // Initialize weapons with only 2 slots
        this.weapons = [
            new Weapon('pistol'),  // First slot
            new Weapon('shotgun')   // Second slot
        ];
        
        // Start with first weapon
        this.currentWeaponIndex = 0;
        this.currentWeapon = this.weapons[0];

        // Upgrade-related properties
        this.damageMultiplier = 1;
        this.fireRateMultiplier = 1;
        this.pickupRange = 100;
        this.pickupRangeMultiplier = 1;
        this.hasCritical = false;
        this.criticalChance = 0.1; // 10%
        this.criticalDamageMultiplier = 2;
        this.shields = 0;
    }

    // Method to change a weapon in a specific slot
    changeWeapon(weaponType) {
        // Change the weapon in the current slot
        this.weapons[this.currentWeaponIndex] = new Weapon(weaponType);
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
    }

    // Switch between weapon slots
    switchWeapon() {
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
    }

    move(direction, isPressed) {
        this.movementKeys[direction] = isPressed;
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
        if (Date.now() - this.lastDamageTime < this.immunityDuration) {
            // Calculate flash alpha based on time
            const immunityProgress = (Date.now() - this.lastDamageTime) / this.immunityDuration;
            const flashCycle = (immunityProgress * 2) % 1; // Complete two cycles during immunity
            this.immunityFlashAlpha = Math.sin(flashCycle * Math.PI) * 0.5; // Sine wave between 0 and 0.5
        } else {
            this.immunityFlashAlpha = 0;
        }

        // Check for health gain only if player has the health regen upgrade
        const now = Date.now();
        if (this.hasHealthRegen && now - this.lastHealthGainTime >= this.healthGainInterval) {
            if (this.health < this.maxHealth) {
                this.health++;
            }
            this.lastHealthGainTime = now;
        }

        // Regular movement updates
        const prevX = this.x;
        const prevY = this.y;

        // Update velocity based on movement keys
        this.velocityX = 0;
        this.velocityY = 0;

        if (this.movementKeys.up) this.velocityY -= this.speed;
        if (this.movementKeys.down) this.velocityY += this.speed;
        if (this.movementKeys.left) this.velocityX -= this.speed;
        if (this.movementKeys.right) this.velocityX += this.speed;

        // Normalize diagonal movement
        if (this.velocityX !== 0 && this.velocityY !== 0) {
            const normalizer = Math.sqrt(2) / 2;
            this.velocityX *= normalizer;
            this.velocityY *= normalizer;
        }

        // Try X movement first
        this.x += this.velocityX;
        const bounds = this.getBounds();
        const tileX1 = Math.floor(bounds.left / map.tileSize);
        const tileX2 = Math.floor(bounds.right / map.tileSize);
        const tileY1 = Math.floor(bounds.top / map.tileSize);
        const tileY2 = Math.floor(bounds.bottom / map.tileSize);

        // Check X collision
        if (map.isWall(tileX1, tileY1) || map.isWall(tileX1, tileY2) ||
            map.isWall(tileX2, tileY1) || map.isWall(tileX2, tileY2)) {
            this.x = prevX;
        }

        // Try Y movement
        this.y += this.velocityY;
        const newBounds = this.getBounds();
        const newTileX1 = Math.floor(newBounds.left / map.tileSize);
        const newTileX2 = Math.floor(newBounds.right / map.tileSize);
        const newTileY1 = Math.floor(newBounds.top / map.tileSize);
        const newTileY2 = Math.floor(newBounds.bottom / map.tileSize);

        // Check Y collision
        if (map.isWall(newTileX1, newTileY1) || map.isWall(newTileX1, newTileY2) ||
            map.isWall(newTileX2, newTileY1) || map.isWall(newTileX2, newTileY2)) {
            this.y = prevY;
        }
    }

    aim(mouseX, mouseY, cameraX, cameraY) {
        // Calculate angle between player and mouse in world coordinates
        const dx = (mouseX + cameraX) - this.x;
        const dy = (mouseY + cameraY) - this.y;
        this.angle = Math.atan2(dy, dx);
    }

    shoot() {
        if (this.currentWeapon) {
            const bullets = this.currentWeapon.shoot(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.angle
            );

            // Apply damage multiplier and critical hits
            bullets.forEach(bullet => {
                bullet.damage *= this.damageMultiplier;
                if (this.hasCritical && Math.random() < this.criticalChance) {
                    bullet.damage *= this.criticalDamageMultiplier;
                }
            });

            return bullets;
        }
        return [];
    }

    takeDamage(amount) {
        const now = Date.now();
        if (now - this.lastDamageTime >= this.immunityDuration) {
            if (this.shields > 0) {
                this.shields--;
                this.lastDamageTime = now; // Still apply immunity after shield break
                return false;
            }
            else {
            this.health -= amount;
            this.lastDamageTime = now;
            return this.health <= 0;
            }
        }
        return false;
    }

    resetUpgrades() {
        this.damageMultiplier = 1;
        this.fireRateMultiplier = 1;
        this.pickupRange = 100;
        this.pickupRangeMultiplier = 1;
        this.hasCritical = false;
        this.criticalChance = 0.1;
        this.criticalDamageMultiplier = 2;
        this.shields = 0;
        this.speed = 5; // Reset to base speed
        this.healthGainInterval = 90000; // Reset to base health recovery time
    }
} 
