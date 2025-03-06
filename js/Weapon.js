class Weapon {
    constructor(type) {
        this.type = type;
        this.lastShot = 0;
        
        // Set weapon properties based on type
        switch(type) {
            case 'pistol':
                this.damage = 20;
                this.fireRate = 250; // milliseconds
                break;
            case 'shotgun':
                this.damage = 15;
                this.fireRate = 750; // milliseconds
                this.spreadAngle = 10 * (Math.PI / 180); // 10 degrees in radians
                break;
            case 'machinegun':
                this.damage = 10;
                this.fireRate = 50; // milliseconds between each bullet in burst
                this.burstCount = 3;
                this.burstDelay = 50; // milliseconds
                break;
        }
    }

    canShoot() {
        const now = Date.now();
        return now - this.lastShot >= this.fireRate;
    }

    shoot(x, y, angle) {
        if (!this.canShoot()) return null;
        
        this.lastShot = Date.now();
        let projectiles = [];

        switch(this.type) {
            case 'pistol':
                projectiles.push(this.createProjectile(x, y, angle));
                break;
                
            case 'shotgun':
                // Center projectile
                projectiles.push(this.createProjectile(x, y, angle));
                // Left projectile
                projectiles.push(this.createProjectile(x, y, angle - this.spreadAngle));
                // Right projectile
                projectiles.push(this.createProjectile(x, y, angle + this.spreadAngle));
                break;
                
            case 'machinegun':
                // Schedule burst fire
                projectiles.push(this.createProjectile(x, y, angle));
                for(let i = 1; i < this.burstCount; i++) {
                    setTimeout(() => {
                        const newProjectile = this.createProjectile(x, y, angle);
                        if (newProjectile) {
                            window.game.projectiles.push(newProjectile);
                        }
                    }, i * this.burstDelay);
                }
                break;
        }

        return projectiles;
    }

    createProjectile(x, y, angle) {
        const projectile = new Projectile(
            x,
            y,
            8,
            8,
            10,
            this.damage,
            3, // penetration
            100 // knockback
        );
        projectile.setDirection(angle);
        projectile.isFromPlayer = true;
        projectile.isFriendly = true;
        return projectile;
    }
} 