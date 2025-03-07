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

        // Initialize all weapons
        this.weapons = {
            pistol: new Weapon('pistol'),
            shotgun: new Weapon('shotgun'),
            machinegun: new Weapon('machinegun'),
            upgradedshotgun: new Weapon('upgradedshotgun'),
            rifle: new Weapon('rifle'),
            supershotgun: new Weapon('supershotgun')
        };
        
        // Start with pistol
        this.currentWeapon = this.weapons.pistol;
    }

    switchWeapon(type) {
        if (this.weapons[type]) {
            console.log('Switching to weapon:', type); // Debug log
            this.currentWeapon = this.weapons[type];
        } else {
            console.log('Invalid weapon type:', type); // Debug log
        }
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

        // Check for health gain
        const now = Date.now();
        if (now - this.lastHealthGainTime >= this.healthGainInterval) {
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

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Check for wall collisions
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
        // Calculate angle between player and mouse in world coordinates
        const dx = (mouseX + cameraX) - this.x;
        const dy = (mouseY + cameraY) - this.y;
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
        const now = Date.now();
        if (now - this.lastDamageTime >= this.immunityDuration) {
            this.health -= amount;
            this.lastDamageTime = now;
            return this.health <= 0;
        }
        return false;
    }
} 