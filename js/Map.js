class Map {
    constructor(width, height, tileSize = 32) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.tiles = [];
        this.generateMap();
    }

    generateMap() {
        // Generate a simple map with only border walls
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                // Create walls only around the edges
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.tiles[y][x] = 1; // Wall
                } else {
                    this.tiles[y][x] = 0; // Empty space
                }
            }
        }
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 1; // Return wall for out of bounds
        }
        return this.tiles[y][x];
    }

    isWall(x, y) {
        return this.getTile(x, y) === 1;
    }

    getVisibleTiles(cameraX, cameraY, screenWidth, screenHeight) {
        const startX = Math.max(0, Math.floor(cameraX / this.tileSize));
        const startY = Math.max(0, Math.floor(cameraY / this.tileSize));
        const endX = Math.min(this.width, Math.ceil((cameraX + screenWidth) / this.tileSize));
        const endY = Math.min(this.height, Math.ceil((cameraY + screenHeight) / this.tileSize));

        const visibleTiles = [];
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (this.tiles[y][x] === 1) {
                    visibleTiles.push({
                        x: x * this.tileSize,
                        y: y * this.tileSize,
                        width: this.tileSize,
                        height: this.tileSize
                    });
                }
            }
        }
        return visibleTiles;
    }
} 