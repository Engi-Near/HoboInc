class Weapon {
    constructor(type) {
        this.type = type;
        
        // Set weapon properties based on type
        switch(type) {
            case 'pistol':
                this.name = 'Pistol';
                this.damage = 25;
                this.fireRate = 250; // 4 shots per second
                this.projectileSpeed = 12;
                this.penetration = 1;
                this.lastShot = 0;
                break;
            case 'shotgun':
                this.name = 'Shotgun';
                this.damage = 15;
                this.fireRate = 750; // 1.33 shots per second
                this.projectileSpeed = 15;
                this.penetration = 1;
                this.lastShot = 0;
                break;
            case 'machinegun':
                this.name = 'Machine Gun';
                this.damage = 15;
                this.fireRate = 100; // 10 shots per second
                this.projectileSpeed = 20;
                this.penetration = 1;
                this.lastShot = 0;
                this.burstCount = 5;
                this.burstDelay = 20;
                break;
            case 'upgradedshotgun':
                this.name = 'Heavy Shotgun';
                this.damage = 20;
                this.fireRate = 1000; // 1 shot per second
                this.projectileSpeed = 15;
                this.penetration = 2;
                this.lastShot = 0;
                this.burstCount = 2;
                this.burstDelay = 100; // 100ms between bursts
                break;
            case 'rifle':
                this.name = 'Rifle';
                this.damage = 50;
                this.fireRate = 1000; // 1 shot per second
                this.projectileSpeed = 25;
                this.penetration = 5;
                this.lastShot = 0;
                break;
            case 'supershotgun':
                this.name = 'Super Shotgun';
                this.damage = 25;
                this.fireRate = 1250; // 0.8 shots per second
                this.projectileSpeed = 15;
                this.penetration = 2;
                this.lastShot = 0;
                this.burstCount = 3;
                this.burstDelay = 100; // 100ms between bursts
                break;
        }
    }

    canShoot() {
        return Date.now() - this.lastShot >= this.fireRate;
    }

    shoot(x, y, angle) {
        if (!this.canShoot()) return [];

        this.lastShot = Date.now();
        const projectiles = [];

        switch(this.type) {
            case 'pistol':
                projectiles.push(this.createProjectile(x, y, angle));
                break;
            
            case 'shotgun':
                // Center shot
                projectiles.push(this.createProjectile(x, y, angle));
                // Side shots at ±15 degrees
                projectiles.push(this.createProjectile(x, y, angle + Math.PI / 12));
                projectiles.push(this.createProjectile(x, y, angle - Math.PI / 12));
                break;
            
            case 'machinegun':
                // Single fast shot with slight spread
                const spread = (Math.random() - 0.5) * Math.PI / 18; // ±5 degrees
                projectiles.push(this.createProjectile(x, y, angle + spread));
                break;

            case 'upgradedshotgun':
                // Create all projectiles immediately
                for (let burst = 0; burst < this.burstCount; burst++) {
                    // Center shot
                    projectiles.push(this.createDelayedProjectile(x, y, angle, burst * this.burstDelay));
                    // Side shots at ±10 degrees
                    projectiles.push(this.createDelayedProjectile(x, y, angle + Math.PI / 18, burst * this.burstDelay));
                    projectiles.push(this.createDelayedProjectile(x, y, angle - Math.PI / 18, burst * this.burstDelay));
                }
                break;

            case 'rifle':
                // Single high-damage, high-penetration shot
                projectiles.push(this.createProjectile(x, y, angle));
                break;

            case 'supershotgun':
                // Create all projectiles immediately
                for (let burst = 0; burst < this.burstCount; burst++) {
                    // Center shot
                    projectiles.push(this.createDelayedProjectile(x, y, angle, burst * this.burstDelay));
                    // Side shots at ±10 and ±20 degrees
                    projectiles.push(this.createDelayedProjectile(x, y, angle + Math.PI / 18, burst * this.burstDelay));
                    projectiles.push(this.createDelayedProjectile(x, y, angle - Math.PI / 18, burst * this.burstDelay));
                    projectiles.push(this.createDelayedProjectile(x, y, angle + Math.PI / 9, burst * this.burstDelay));
                    projectiles.push(this.createDelayedProjectile(x, y, angle - Math.PI / 9, burst * this.burstDelay));
                }
                break;
        }

        return projectiles;
    }

    createProjectile(x, y, angle) {
        const projectile = new Projectile(
            x,
            y,
            8,  // width
            8,  // height
            this.projectileSpeed,
            this.damage,
            this.penetration,
            5  // knockback
        );
        projectile.setDirection(angle);
        projectile.isFromPlayer = true;
        projectile.isFriendly = true;
        return projectile;
    }

    createDelayedProjectile(x, y, angle, delay) {
        const projectile = this.createProjectile(x, y, angle);
        projectile.delay = delay; // Add delay property to projectile
        return projectile;
    }
} 
