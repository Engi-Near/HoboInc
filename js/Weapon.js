class Weapon {
    constructor(type) {
        this.type = type;
        
        // Set weapon properties based on type
        switch(type) {
            case 'pistol':
                this.name = 'Pistol';
                this.weaponClass = 'pistol';
                this.damage = 25;
                this.fireRate = 250; // 4 shots per second
                this.projectileSpeed = 12;
                this.penetration = 1;
                this.lastShot = 0;
                break;
            case 'shotgun':
                this.name = 'Shotgun';
                this.weaponClass = 'shotgun';
                this.damage = 15;
                this.fireRate = 750; // 1.33 shots per second
                this.projectileSpeed = 15;
                this.penetration = 1;
                this.lastShot = 0;
                this.pelletCount = 3;
                this.spread = Math.PI / 12; // 15 degrees between pellets
                break;
            case 'machinegun':
                this.name = 'Machine Gun';
                this.weaponClass = 'machinegun';
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
                this.weaponClass = 'shotgun';
                this.damage = 20;
                this.fireRate = 1000; // 1 shot per second
                this.projectileSpeed = 15;
                this.penetration = 2;
                this.lastShot = 0;
                this.burstCount = 2;
                this.burstDelay = 100; // 100ms between bursts
                this.pelletCount = 3;
                this.spread = Math.PI / 18; // 10 degrees between pellets
                break;
            case 'rifle':
                this.name = 'Rifle';
                this.weaponClass = 'rifle';
                this.damage = 50;
                this.fireRate = 1000; // 1 shot per second
                this.projectileSpeed = 25;
                this.penetration = 5;
                this.lastShot = 0;
                break;
            case 'supershotgun':
                this.name = 'Super Shotgun';
                this.weaponClass = 'shotgun';
                this.damage = 25;
                this.fireRate = 1250; // 0.8 shots per second
                this.projectileSpeed = 15;
                this.penetration = 2;
                this.lastShot = 0;
                this.burstCount = 3;
                this.burstDelay = 100; // 100ms between bursts
                this.pelletCount = 5;
                this.spread = Math.PI / 18; // 10 degrees between pellets
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

        switch(this.weaponClass) {
            case 'pistol':
                projectiles.push(this.createProjectile(x, y, angle));
                break;
            
            case 'shotgun':
                // Calculate the total spread and starting angle
                const totalSpread = this.spread * (this.pelletCount - 1);
                const startAngle = angle - totalSpread / 2;
                
                // Create pellets with even spread
                for (let i = 0; i < this.pelletCount; i++) {
                    const pelletAngle = startAngle + (this.spread * i);
                    if (this.burstCount) {
                        // For burst shotguns, create delayed projectiles
                        for (let burst = 0; burst < this.burstCount; burst++) {
                            projectiles.push(this.createDelayedProjectile(x, y, pelletAngle, burst * this.burstDelay));
                        }
                    } else {
                        projectiles.push(this.createProjectile(x, y, pelletAngle));
                    }
                }
                break;
            
            case 'machinegun':
                // Burst fire with slight spread
                for (let burst = 0; burst < this.burstCount; burst++) {
                    const spread = (Math.random() - 0.5) * Math.PI / 18; // ±5 degrees
                    projectiles.push(this.createDelayedProjectile(x, y, angle + spread, burst * this.burstDelay));
                }
                break;

            case 'rifle':
                // Single high-damage, high-penetration shot
                projectiles.push(this.createProjectile(x, y, angle));
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
