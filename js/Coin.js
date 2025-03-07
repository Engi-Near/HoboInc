class Coin extends GameObject {
    constructor(x, y) {
        super(x, y, 16, 16, 0);
        this.sprite = new Sprite(this.width, this.height, '#ff0'); // Yellow color
        this.pickupRange = 100; // Range at which coins start moving towards player
        this.magnetSpeed = 10; // 2x player speed (player speed is 5)
    }

    update(player) {
        // Calculate distance to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If within pickup range, move towards player
        if (distance <= this.pickupRange) {
            // Normalize direction and apply speed
            const normalizer = distance > 0 ? 1 / distance : 0;
            this.velocityX = dx * normalizer * this.magnetSpeed;
            this.velocityY = dy * normalizer * this.magnetSpeed;

            // Update position
            this.x += this.velocityX;
            this.y += this.velocityY;
        }
    }

    render(ctx) {
        this.sprite.render(ctx, this.x, this.y);
    }
} 
