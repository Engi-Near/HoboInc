class Enemy extends GameObject {
    constructor(x, y, type = 'basic') {
        super(x, y, 32, 32, 2);
        this.type = type;
        this.health = this.getHealthByType();
        this.attackDamage = this.getDamageByType();
        this.attackRange = this.getRangeByType();
        this.lastAttack = 0;
        this.attackCooldown = this.getCooldownByType();
    }

    getHealthByType() {
        switch(this.type) {
            case 'basic':
                return 50;
            case 'tank':
                return 100;
            case 'ranged':
                return 30;
            default:
                return 50;
        }
    }

    getDamageByType() {
        switch(this.type) {
            case 'basic':
                return 10;
            case 'tank':
                return 20;
            case 'ranged':
                return 15;
            default:
                return 10;
        }
    }

    getRangeByType() {
        switch(this.type) {
            case 'basic':
                return 32;
            case 'tank':
                return 32;
            case 'ranged':
                return 200;
            default:
                return 32;
        }
    }

    getCooldownByType() {
        switch(this.type) {
            case 'basic':
                return 1000;
            case 'tank':
                return 2000;
            case 'ranged':
                return 1500;
            default:
                return 1000;
        }
    }

    update(player) {
        super.update();
        this.moveTowardsPlayer(player);
    }

    moveTowardsPlayer(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.velocityX = (dx / distance) * this.speed;
            this.velocityY = (dy / distance) * this.speed;
        }
    }

    canAttack(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.attackRange;
    }

    attack(player) {
        const now = Date.now();
        if (now - this.lastAttack >= this.attackCooldown) {
            this.lastAttack = now;
            return this.attackDamage;
        }
        return 0;
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
} 