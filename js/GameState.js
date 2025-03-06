class GameState {
    static MENU = 'menu';
    static PLAYING = 'playing';
    static GAME_OVER = 'gameOver';
    static VICTORY = 'victory';
    static UPGRADE = 'upgrade';

    constructor() {
        this.currentState = GameState.MENU;
        this.gameMode = null; // 'normal' or 'endless'
        this.score = 0;
        this.isGameOver = false;
        this.coins = 0;
        this.upgradeCost = 10;
    }

    startGame(mode) {
        this.currentState = GameState.PLAYING;
        this.gameMode = mode;
        this.score = 0;
        this.isGameOver = false;
        this.coins = 0;
        this.upgradeCost = 10;
    }

    updateScore(points) {
        this.score += points;
        if (this.gameMode === 'normal' && this.score >= 10000) {
            this.currentState = GameState.VICTORY;
            this.isGameOver = true;
        }
    }

    addCoin() {
        this.coins++;
        if (this.coins >= this.upgradeCost) {
            this.currentState = GameState.UPGRADE;
        }
    }

    upgrade() {
        this.coins = 0;
        this.upgradeCost = Math.floor(this.upgradeCost * 1.2); // 20% increase
        this.currentState = GameState.PLAYING;
    }

    playerDied() {
        this.currentState = GameState.GAME_OVER;
        this.isGameOver = true;
    }

    reset() {
        this.currentState = GameState.MENU;
        this.gameMode = null;
        this.score = 0;
        this.isGameOver = false;
        this.coins = 0;
        this.upgradeCost = 10;
    }
} 