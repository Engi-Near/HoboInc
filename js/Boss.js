class Boss extends GameObject {
    constructor(x, y) {
        super(x, y, 96, 96, 1); // Large size (96x96), very slow speed (1)
        this.sprite = new Sprite(this.width, this.height, '#800080'); // Purple color for boss
        this.health = 1000; // High HP
        this.maxHealth = 1000;
        this.angle = 0;
        
        // Action system
        this.actions = [
            {
                name: 'charge',
                cooldown: 5000, // 5 seconds
                lastUsed: 0,
                execute: () => this.charge()
            },
            {
                name: 'spreadShot',
                cooldown: 3000, // 3 seconds
                lastUsed: 0,
                execute: () => this.spreadShot()
            },
            {
                name: 'summonMinions',
                cooldown: 10000, // 10 seconds
                lastUsed: 0,
                execute: () => this.summonMinions()
            }
        ];
    }

    update(player, enemies, map) {
        // Calculate direction to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and apply speed
        if (distance > 0) {
            this.velocityX = (dx / distance) * this.speed;
            this.velocityY = (dy / distance) * this.speed;
            this.angle = Math.atan2(dy, dx);
        }

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

        if (map.isWall(tileX1, tileY1) || map.isWall(tileX1, tileY2) ||
            map.isWall(tileX2, tileY1) || map.isWall(tileX2, tileY2)) {
            this.x = prevX;
        }

        if (map.isWall(tileX1, tileY1) || map.isWall(tileX2, tileY1) ||
            map.isWall(tileX1, tileY2) || map.isWall(tileX2, tileY2)) {
            this.y = prevY;
        }

        // Try to use actions
        this.useActions(player);
    }

    useActions(player) {
        const now = Date.now();
        this.actions.forEach(action => {
            if (now - action.lastUsed >= action.cooldown) {
                action.execute(player);
                action.lastUsed = now;
            }
        });
    }

    charge(player) {
        // Implement charge attack
        // This would be a fast dash towards the player
        console.log('Boss charging!');
    }

    spreadShot(player) {
        // Implement spread shot attack
        // This would create multiple projectiles in a spread pattern
        console.log('Boss using spread shot!');
    }

    summonMinions(player) {
        // Implement minion summoning
        // This would spawn additional enemies
        console.log('Boss summoning minions!');
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    getHealthPercentage() {
        return this.health / this.maxHealth;
    }
} 