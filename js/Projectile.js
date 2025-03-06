class Projectile extends GameObject {
    constructor(x, y, width, height, speed, damage = 20, penetration = 3, knockback = 100) {
        super(x, y, width, height, speed);
        this.damage = damage;
        this.angle = 0;
        this.range = 1000; // Maximum distance the projectile can travel
        this.startX = x;
        this.startY = y;
        this.penetration = penetration;
        this.knockback = knockback;
        this.hitEnemies = new Set(); // Track enemies this projectile has already hit
    }

    setDirection(angle) {
        this.angle = angle;
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
    }

    update() {
        super.update();
        
        // Check if projectile has traveled beyond its range
        const dx = this.x - this.startX;
        const dy = this.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.range;
    }

    isOutOfRange() {
        const dx = this.x - this.startX;
        const dy = this.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance > this.range;
    }

    applyKnockback(enemy) {
        enemy.x += Math.cos(this.angle) * this.knockback;
        enemy.y += Math.sin(this.angle) * this.knockback;
    }

    hasHitEnemy(enemy) {
        return this.hitEnemies.has(enemy);
    }

    markEnemyHit(enemy) {
        this.hitEnemies.add(enemy);
        this.penetration--;
    }

    canPenetrate() {
        return this.penetration > 0;
    }
} 
