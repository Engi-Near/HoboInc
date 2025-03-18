class UpgradeUI {
    constructor() {
        this.isVisible = false;
        this.upgrades = [];
        this.selectedIndex = 0;
        this.fontSize = 20;
        this.padding = 20;
        this.boxWidth = 300;
        this.boxHeight = 150;
    }

    show(upgrades) {
        this.isVisible = true;
        this.upgrades = upgrades;
        this.selectedIndex = 0;
    }

    hide() {
        this.isVisible = false;
        this.upgrades = [];
        this.selectedIndex = 0;
    }

    selectNext() {
        this.selectedIndex = (this.selectedIndex + 1) % this.upgrades.length;
    }

    selectPrevious() {
        this.selectedIndex = (this.selectedIndex - 1 + this.upgrades.length) % this.upgrades.length;
    }

    getSelectedUpgrade() {
        return this.upgrades[this.selectedIndex];
    }

    draw(ctx, screenWidth, screenHeight) {
        if (!this.isVisible) return;

        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        // Calculate positions for upgrade boxes
        const totalWidth = this.boxWidth * this.upgrades.length + this.padding * (this.upgrades.length - 1);
        const startX = (screenWidth - totalWidth) / 2;
        const y = (screenHeight - this.boxHeight) / 2;

        // Draw upgrade boxes
        this.upgrades.forEach((upgrade, index) => {
            const x = startX + index * (this.boxWidth + this.padding);
            const isSelected = index === this.selectedIndex;

            // Draw box background
            ctx.fillStyle = isSelected ? '#4a4a4a' : '#2a2a2a';
            ctx.fillRect(x, y, this.boxWidth, this.boxHeight);
            
            // Draw border
            ctx.strokeStyle = isSelected ? '#fff' : '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, this.boxWidth, this.boxHeight);

            // Draw text
            ctx.fillStyle = '#fff';
            ctx.font = `${this.fontSize}px Arial`;
            ctx.textAlign = 'center';

            // Draw title
            ctx.fillText(upgrade.name, x + this.boxWidth / 2, y + this.fontSize + 10);

            // Draw description
            ctx.font = `${this.fontSize * 0.8}px Arial`;
            ctx.fillText(upgrade.description, x + this.boxWidth / 2, y + this.fontSize * 2 + 20);
        });

        // Draw instructions
        ctx.fillStyle = '#fff';
        ctx.font = `${this.fontSize * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Use LEFT/RIGHT arrows to select, ENTER to choose', screenWidth / 2, y + this.boxHeight + 40);
    }
} 