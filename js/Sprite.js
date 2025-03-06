class Sprite {
    constructor(width, height, defaultColor = '#ff0000') {
        this.width = width;
        this.height = height;
        this.defaultColor = defaultColor;
        this.image = null;
        this.isGif = false;
        this.frameIndex = 0;
        this.frameCount = 1;
        this.frameDelay = 100; // milliseconds
        this.lastFrameTime = 0;
    }

    setImage(imagePath) {
        this.image = new Image();
        this.image.src = imagePath;
        this.isGif = imagePath.toLowerCase().endsWith('.gif');
        
        if (this.isGif) {
            // For GIFs, we'll use the first frame
            this.image.onload = () => {
                this.frameCount = 1; // We'll keep it simple for now
            };
        }
    }

    update() {
        if (this.isGif) {
            const now = Date.now();
            if (now - this.lastFrameTime >= this.frameDelay) {
                this.frameIndex = (this.frameIndex + 1) % this.frameCount;
                this.lastFrameTime = now;
            }
        }
    }

    render(ctx, x, y) {
        if (this.image && this.image.complete) {
            // Draw the image
            ctx.drawImage(this.image, x, y, this.width, this.height);
        } else {
            // Draw default colored rectangle
            ctx.fillStyle = this.defaultColor;
            ctx.fillRect(x, y, this.width, this.height);
        }
    }
} 