class GameObject {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }

    isColliding(other) {
        const bounds = this.getBounds();
        const otherBounds = other.getBounds();
        
        return bounds.left < otherBounds.right &&
               bounds.right > otherBounds.left &&
               bounds.top < otherBounds.bottom &&
               bounds.bottom > otherBounds.top;
    }
} 