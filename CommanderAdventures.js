class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = {
            x: 0,
            y: 0,
            size: 20,
            speed: 5
        };
        this.map = null;
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        
        this.init();
    }

    init() {
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Center player initially
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;

        // Load the map image
        this.loadMap('map.jpg');
        
        // Set up event listeners
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Start game loop
        this.gameLoop();
    }

    loadMap(src) {
        this.map = new Image();
        this.map.onload = () => {
            this.mapWidth = this.map.width;
            this.mapHeight = this.map.height;
        };
        this.map.src = src;
    }

    handleKeyDown(e) {
        if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
            this.keys[e.key.toLowerCase()] = true;
        }
    }

    handleKeyUp(e) {
        if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
            this.keys[e.key.toLowerCase()] = false;
        }
    }

    checkCollision(x, y) {
        if (!this.map) return false;
        
        // Calculate the position on the map
        const mapX = Math.floor(x);
        const mapY = Math.floor(y);
        
        // Create a temporary canvas to get pixel data
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.mapWidth;
        tempCanvas.height = this.mapHeight;
        
        // Draw the map and get pixel data
        tempCtx.drawImage(this.map, 0, 0);
        const pixelData = tempCtx.getImageData(mapX, mapY, 1, 1).data;
        
        // Check if the pixel is white (all RGB values are 255)
        return pixelData[0] === 255 && pixelData[1] === 255 && pixelData[2] === 255;
    }

    update() {
        const newX = this.player.x;
        const newY = this.player.y;
        
        if (this.keys.w) newY -= this.player.speed;
        if (this.keys.s) newY += this.player.speed;
        if (this.keys.a) newX -= this.player.speed;
        if (this.keys.d) newX += this.player.speed;
        
        // Check collisions before updating position
        if (!this.checkCollision(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw map
        if (this.map) {
            this.ctx.drawImage(this.map, 0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw player
        this.ctx.fillStyle = 'red';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
}; 