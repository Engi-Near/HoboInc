class Weapon {
    // Define base properties that all weapons must have
    static BASE_PROPERTIES = ['name', 'weaponClass', 'ammoType', 'damage', 'fireRate', 'projectileSpeed', 'penetration'];
    
    // Define optional properties that some weapons might have
    static OPTIONAL_PROPERTIES = ['pelletCount', 'spread', 'burstCount', 'burstDelay'];

    // Define knockback multipliers for different ammo types
    static BASE_KNOCKBACK = 5;
    static KNOCKBACK_MULTIPLIERS = {
        'Light': 3,
        'Medium': 1.5,
        'Heavy': 1
    };

    // Weapon definitions as arrays in a consistent order matching BASE_PROPERTIES
    // [name, weaponClass, ammoType, damage, fireRate, projectileSpeed, penetration]
    static WEAPON_DEFINITIONS = {
        'pistol': ['Pistol', 'pistol', 'Light', 25, 250, 12, 1],
        'shotgun': ['Shotgun', 'shotgun', 'Light', 15, 750, 15, 1, 3, Math.PI / 12],
        'machinegun': ['Machine Gun', 'machinegun', 'Medium', 15, 100, 20, 1, 0, 0, 5, 20],
        'upgradedshotgun': ['Heavy Shotgun', 'shotgun', 'Light', 20, 1000, 15, 2, 3, Math.PI / 18, 2, 100],
        'rifle': ['Rifle', 'rifle', 'Heavy', 50, 1000, 25, 5],
        'supershotgun': ['Super Shotgun', 'shotgun', 'Light', 25, 1250, 15, 2, 5, Math.PI / 18, 3, 100]
    };
/*['newweapon': [
    'New Weapon',  // name
    'rifle',       // weaponClass
    'Heavy',       // ammoType
    30,            // damage
    500,           // fireRate
    18,            // projectileSpeed
    3,             // penetration
    0,             // pelletCount (optional)
    0,             // spread (optional)
    2,             // burstCount (optional)
    50,            // burstDelay (optional)
]*/


    constructor(type) {
        this.type = type;
        const definition = Weapon.WEAPON_DEFINITIONS[type];
        
        // Initialize lastShot
        this.lastShot = 0;

        // Set base properties from definition array
        Weapon.BASE_PROPERTIES.forEach((prop, index) => {
            this[prop] = definition[index];
        });

        // Set optional properties, defaulting to 0 if not defined
        Weapon.OPTIONAL_PROPERTIES.forEach((prop, index) => {
            this[prop] = definition[index + Weapon.BASE_PROPERTIES.length] || 0;
        });
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
        const knockback = Weapon.BASE_KNOCKBACK * Weapon.KNOCKBACK_MULTIPLIERS[this.ammoType];
        const projectile = new Projectile(
            x,
            y,
            8,  // width
            8,  // height
            this.projectileSpeed,
            this.damage,
            this.penetration,
            knockback
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