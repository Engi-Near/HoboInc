class UpgradeSystem {
    constructor() {
        this.upgrades = [
            {
                name: "Damage Up",
                description: "Increase damage by 25%",
                effects: [{ type: "damageMultiplier", value: 1.25 }]
            },
            {
                name: "Speed Demon",
                description: "Increase movement speed by 20%",
                effects: [{ type: "speedMultiplier", value: 1.2 }]
            },
            {
                name: "Rapid Fire",
                description: "Increase fire rate by 25%",
                effects: [{ type: "fireRateMultiplier", value: 1.25 }]
            },
            {
                name: "Quick Recovery",
                description: "Reduce health recovery time by 30%",
                effects: [{ type: "healthRecoveryMultiplier", value: 0.7 }]
            },
            {
                name: "Critical Strike",
                description: "Enable critical hits (10% chance, 2x damage)",
                effects: [{ type: "enableCritical" }]
            },
            {
                name: "Critical Mastery",
                description: "Increase critical damage by 50%",
                effects: [{ type: "criticalDamageMultiplier", value: 1.5 }]
            },
            {
                name: "Critical Expert",
                description: "Increase critical chance by 50%",
                effects: [{ type: "criticalChanceMultiplier", value: 1.5 }]
            },
            {
                name: "Magnetic",
                description: "Increase pickup range by 50%",
                effects: [{ type: "pickupRangeMultiplier", value: 1.5 }]
            },
            {
                name: "Shield",
                description: "Gain a protective shield",
                effects: [{ type: "gainShield" }]
            },
            {
                name: "Shotgun",
                description: "Switch to Shotgun",
                effects: [{ type: "newWeapon", value: "shotgun" }]
            },
            {
                name: "Rifle",
                description: "Switch to Rifle",
                effects: [{ type: "newWeapon", value: "rifle" }]
            },
            {
                name: "Combat Master",
                description: "Increase damage and critical chance",
                effects: [
                    { type: "damageMultiplier", value: 1.2 },
                    { type: "criticalChanceMultiplier", value: 1.3 }
                ]
            }
        ];
    }

    getRandomUpgrades(count = 3) {
        const shuffled = [...this.upgrades].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    applyUpgrade(player, upgrade) {
        upgrade.effects.forEach(effect => {
            switch (effect.type) {
                case "damageMultiplier":
                    player.damageMultiplier *= effect.value;
                    break;
                case "speedMultiplier":
                    player.speed *= effect.value;
                    break;
                case "fireRateMultiplier":
                    player.fireRateMultiplier *= effect.value;
                    break;
                case "healthRecoveryMultiplier":
                    player.healthGainInterval *= effect.value;
                    break;
                case "enableCritical":
                    player.hasCritical = true;
                    break;
                case "criticalDamageMultiplier":
                    player.criticalDamageMultiplier *= effect.value;
                    break;
                case "criticalChanceMultiplier":
                    player.criticalChance *= effect.value;
                    break;
                case "pickupRangeMultiplier":
                    player.pickupRange *= effect.value;
                    break;
                case "gainShield":
                    player.shields++;
                    break;
                case "newWeapon":
                    player.changeWeapon(effect.value);
                    break;
            }
        });
    }
} 
