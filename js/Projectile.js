class Projectile extends GameObject {
    constructor(x, y, width, height, speed, damage = 20) {
        super(x, y, width, height, speed);
        this.damage = damage;
        this.angle = 0;
        this.range = 1000; // Maximum distance the projectile can travel
        this.startX = x;
        this.startY = y;
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
} 