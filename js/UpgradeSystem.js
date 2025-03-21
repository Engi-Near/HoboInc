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
                description: "Increase fire rate by 25% (reduces weapon cooldown)",
                effects: [{ type: "fireRateMult iplier", value: 0.75 }]
            },
            {
                name: "Health Regeneration",
                description: "Gain the ability to regenerate health every 90 seconds",
                effects: [{ type: "enableHealthRegen" }]
            },
            {
                name: "Quick Recovery",
                description: "Reduce health recovery time by 30%",
                effects: [{ type: "healthRecoveryMultiplier", value: 0.7 }],
                requires: "hasHealthRegen"
            }, 
            {
                name: "Critical Strike",
                description: "Enable critical hits (10% chance for 2x damage)",
                effects: [{ type: "enableCritical" }]
            },
            {
                name: "Critical Mastery",
                description: "Increase critical damage by 50%",
                effects: [{ type: "criticalDamageMultiplier", value: 1.5 }],
                requires: "hasCritical"
            },
            {
                name: "Critical Expert",
                description: "Increase critical chance by 50%",
                effects: [{ type: "criticalChanceMultiplier", value: 1.5 }],
                requires: "hasCritical"
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
                name: "Upgraded Shotgun",
                description: "Switch to a better Shotgun!",
                effects: [{ type: "newWeapon", value: "upgradedshotgun" }]
            },
            {
                name: "Rifle",
                description: "Switch to Rifle",
                effects: [{ type: "newWeapon", value: "rifle" }]
            },
            {
                name: "Machine Gun",
                description: "Switch to Machine Gun - High rate of fire, medium damage",
                effects: [{ type: "newWeapon", value: "machinegun" }]
            },
            {
                name: "Assault Rifle",
                description: "Switch to Assault Rifle - Balanced rate of fire and damage",
                effects: [{ type: "newWeapon", value: "assaultrifle" }]
            },
            {
                name: "SMG",
                description: "Switch to Submachine Gun - Very high rate of fire, lower damage",
                effects: [{ type: "newWeapon", value: "submachinegun" }]
            },
            {
                name: "Combat Master",
                description: "Increase damage by 20% and critical chance by 30%",
                effects: [
                    { type: "damageMultiplier", value: 1.2 },
                    { type: "criticalChanceMultiplier", value: 1.3 }
                ],
                requires: "hasCritical"
            }
        ];
    }

    getRandomUpgrades(count = 3) {
        // Filter available upgrades based on requirements and exclude base upgrades that have been acquired
        const availableUpgrades = this.upgrades.filter(upgrade => {
            // If the upgrade requires a condition, check if it's met
            if (upgrade.requires) {
                return window.game.player[upgrade.requires];
            }
            
            // For base upgrades (Critical Strike and Health Regeneration), exclude if already acquired
            if (upgrade.name === "Critical Strike" && window.game.player.hasCritical) {
                return false;
            }
            if (upgrade.name === "Health Regeneration" && window.game.player.hasHealthRegen) {
                return false;
            }
            
            return true;
        });
        
        const shuffled = [...availableUpgrades].sort(() => 0.5 - Math.random());
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
                    // Apply to current and all weapons
                    player.weapons.forEach(weapon => {
                        weapon.fireRate *= effect.value;
                    });
                    break;
                case "healthRecoveryMultiplier":
                    player.healthGainInterval *= effect.value;
                    break;
                case "enableHealthRegen":
                    player.hasHealthRegen = true;
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
