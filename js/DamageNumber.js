class DamageNumber {
    constructor(x, y, damage, isCritical = false) {
        this.x = x;
        this.y = y;
        this.damage = Math.round(damage);
        this.isCritical = isCritical;
        this.startTime = Date.now();
        this.duration = 1500; // 1.5 seconds
        this.velocityY = -1; // Move upward
        this.alpha = 1;
    }

    update() {
        const elapsed = Date.now() - this.startTime;
        this.alpha = 1 - (elapsed / this.duration);
        this.y += this.velocityY;
        return elapsed < this.duration;
    }

    render(ctx, cameraX, cameraY) {
        if (this.alpha <= 0) return;

        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = '20px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(this.damage, screenX, screenY);
        ctx.restore();
    }
} 