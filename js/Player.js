class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 32, 32, 5);
        this.health = 100;
        this.weapon = {
            damage: 20,
            fireRate: 250, // milliseconds
            lastShot: 0
        };
    }

    move(direction) {
        switch(direction) {
            case 'up':
                this.velocityY = -this.speed;
                break;
            case 'down':
                this.velocityY = this.speed;
                break;
            case 'left':
                this.velocityX = -this.speed;
                break;
            case 'right':
                this.velocityX = this.speed;
                break;
        }
    }

    stopMoving(direction) {
        switch(direction) {
            case 'up':
            case 'down':
                this.velocityY = 0;
                break;
            case 'left':
            case 'right':
                this.velocityX = 0;
                break;
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.weapon.lastShot >= this.weapon.fireRate) {
            this.weapon.lastShot = now;
            return new Projectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                8,
                8,
                10
            );
        }
        return null;
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
} 