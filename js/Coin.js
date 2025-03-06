class Coin extends GameObject {
    constructor(x, y) {
        super(x, y, 8, 8, 0);
        this.sprite = new Sprite(this.width, this.height, '#ffd700'); // Gold color
        this.isMovingToPlayer = false;
    }

    update(player) {
        if (!this.isMovingToPlayer) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.pickupRange) {
                this.isMovingToPlayer = true;
            }
        }

        if (this.isMovingToPlayer) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const speed = player.speed * 2;
                this.x += (dx / distance) * speed;
                this.y += (dy / distance) * speed;
            }
        }
    }

    render(ctx) {
        this.sprite.render(ctx, this.x, this.y);
    }
} 