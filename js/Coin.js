class Coin extends GameObject {
    constructor(x, y) {
        super(x, y, 16, 16, 0);
        this.sprite = new Sprite(this.width, this.height, '#ff0'); // Yellow color
        this.pickupRange = 100; // Range at which coins start moving towards player
        this.magnetSpeed = 10; // 2x player speed (player speed is 5)
    }

    update(player) {
        // Calculate distance from centers
        const playerCenterX = player.x + player.width/2;
        const playerCenterY = player.y + player.height/2;
        const coinCenterX = this.x + this.width/2;
        const coinCenterY = this.y + this.height/2;
        
        const dx = playerCenterX - coinCenterX;
        const dy = playerCenterY - coinCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If within pickup range, move towards player
        if (distance <= this.pickupRange && distance > 0) {
            // Calculate movement this frame
            const moveX = (dx / distance) * this.magnetSpeed;
            const moveY = (dy / distance) * this.magnetSpeed;

            // Update position directly
            this.x += moveX;
            this.y += moveY;
        }
    }

    isColliding(player) {
        const playerCenterX = player.x + player.width/2;
        const playerCenterY = player.y + player.height/2;
        const coinCenterX = this.x + this.width/2;
        const coinCenterY = this.y + this.height/2;
        
        const dx = playerCenterX - coinCenterX;
        const dy = playerCenterY - coinCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (player.width/2 + this.width/2);
    }

    render(ctx) {
        this.sprite.render(ctx, this.x, this.y);
    }
} 