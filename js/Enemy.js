class Enemy extends GameObject {
    // Static threat rating mappings
    static THREAT_RATINGS = {
        'basic': 1,
        'tank': 2,
        'ranged': 2,
        'fast': 4,
        'shotgunner': 5,
        'supertank': 7
    };

    // Static method to get random enemy type by threat rating
    static getRandomEnemyTypeByThreat(threatRating) {
        const enemyTypes = Object.entries(Enemy.THREAT_RATINGS)
            .filter(([_, threat]) => threat <= threatRating)
            .map(([type, _]) => type);
        
        if (enemyTypes.length === 0) return 'basic'; // Fallback
        return enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    }

    constructor(x, y, type) {
        super(x, y, 32, 32, 0); // Speed will be set based on type
        this.type = type;
        
        // Set properties based on type
        const baseHealth = 100;
        const baseSpeed = 3;
        
        // Add repulsion strength property
        this.repulsionStrength = 0.3; // Adjustable strength of enemy repulsion
        
        switch(type) {
            case 'basic':
                this.health = baseHealth;
                this.speed = baseSpeed;
                this.sprite = new Sprite(this.width, this.height, '#f00');
                break;
            case 'tank':
                this.health = baseHealth * 3;
                this.speed = baseSpeed * 0.5;
                this.sprite = new Sprite(this.width, this.height, '#800');
                break;
            case 'ranged':
                this.health = baseHealth * 0.75;
                this.speed = baseSpeed * 0.5;
                this.sprite = new Sprite(this.width, this.height, '#f80');
                this.lastShot = 0;
                this.fireRate = 1000; // 1 second
                break;
            case 'fast':
                this.health = baseHealth * 0.5;
                this.speed = baseSpeed * 2;
                this.sprite = new Sprite(this.width, this.height, '#ff0');
                break;
            case 'shotgunner':
                this.health = baseHealth;
                this.speed = baseSpeed * 0.75;
                this.sprite = new Sprite(this.width, this.height, '#f0f');
                this.lastShot = 0;
                this.fireRate = 5000; // 5 seconds
                break;
            case 'supertank':
                this.health = baseHealth * 100;
                this.speed = baseSpeed * 0.5;
                this.sprite = new Sprite(this.width, this.height, '#400');
                break;
            default:
                this.health = baseHealth;
                this.speed = baseSpeed;
                this.sprite = new Sprite(this.width, this.height, '#f00');
        }
    }

    getHealthByType() {
        const baseHealth = 100;
        switch(this.type) {
            case 'tank': return baseHealth * 3;
            case 'ranged': return baseHealth * 0.75;
            case 'fast': return baseHealth * 0.5;
            case 'shotgunner': return baseHealth;
            case 'supertank': return baseHealth * 100;
            default: return baseHealth;
        }
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
        }

        // Handle soft collisions with other enemies
        let totalRepulsionX = 0;
        let totalRepulsionY = 0;

        for (const other of enemies) {
            if (other === this) continue;

            // Calculate distance between enemy centers
            const enemyDx = this.x - other.x;
            const enemyDy = this.y - other.y;
            const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);

            // If enemies are overlapping
            const minDistance = (this.width + other.width) / 2;
            if (enemyDistance < minDistance) {
                // Calculate overlap amount (more overlap = stronger repulsion)
                const overlap = minDistance - enemyDistance;
                const repulsionForce = overlap * this.repulsionStrength;

                // Calculate normalized repulsion vector
                if (enemyDistance > 0) {
                    totalRepulsionX += (enemyDx / enemyDistance) * repulsionForce;
                    totalRepulsionY += (enemyDy / enemyDistance) * repulsionForce;
                }
            }
        }

        // Add repulsion to velocity
        this.velocityX += totalRepulsionX;
        this.velocityY += totalRepulsionY;

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
    }

    canAttack(player) {
        return this.isColliding(player);
    }

    attack(player) {
        return 1; // All enemies do 1 damage on contact
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    shootProjectile(playerX, playerY) {
        if (this.type !== 'ranged' && this.type !== 'shotgunner') return null;
        
        const now = Date.now();
        if (now - this.lastShot >= this.fireRate) {
            this.lastShot = now;
            
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const angle = Math.atan2(dy, dx);
            
            if (this.type === 'shotgunner') {
                // Create array for multiple projectiles
                const projectiles = [];
                
                // Center shot
                projectiles.push(this.createProjectile(angle));
                
                // Side shots at ±10 degrees
                projectiles.push(this.createProjectile(angle + Math.PI / 18)); // +10 degrees
                projectiles.push(this.createProjectile(angle - Math.PI / 18)); // -10 degrees
                
                return projectiles;
            } else {
                // Single shot for ranged enemy
                return this.createProjectile(angle);
            }
        }
        return null;
    }

    createProjectile(angle) {
        const projectile = new Projectile(
            this.x + this.width / 2,
            this.y + this.height / 2,
            8,
            8,
            8,
            1,  // damage set to 1
            1,  // penetration
            0   // no knockback
        );
        
        projectile.setDirection(angle);
        return projectile;
    }
} 
