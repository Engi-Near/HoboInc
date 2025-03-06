class GameObject {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.velocityX = 0;
        this.velocityY = 0;
        this.sprite = new Sprite(width, height);
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.sprite.update();
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

    setSprite(imagePath, defaultColor = '#ff0000') {
        this.sprite = new Sprite(this.width, this.height, defaultColor);
        this.sprite.setImage(imagePath);
    }

    render(ctx) {
        this.sprite.render(ctx, this.x, this.y);
    }
} 