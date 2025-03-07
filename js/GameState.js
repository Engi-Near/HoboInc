class GameState {
    static MENU = 'menu';
    static PLAYING = 'playing';
    static GAME_OVER = 'game_over';
    static VICTORY = 'victory';
    static UPGRADE = 'upgrade';

    constructor() {
        this.reset();
    }

    reset() {
        this.currentState = GameState.MENU;
        this.gameMode = null;
        this.score = 0;
        this.coins = 0;
        this.upgrades = 0;
    }

    startGame(mode) {
        this.currentState = GameState.PLAYING;
        this.gameMode = mode;
        this.score = 0;
        this.coins = 0;
        this.upgrades = 0;
    }

    updateScore(points) {
        this.score += points;
        if (this.gameMode === 'normal' && this.score >= 10000) {
            this.currentState = GameState.VICTORY;
        }
    }

    addCoin() {
        this.coins++;
        if (this.coins >= this.getUpgradeCost()) {
            this.currentState = GameState.UPGRADE;
        }
    }

    getUpgradeCost() {
        return 5 + (this.upgrades * 2);
    }

    upgrade() {
        this.upgrades++;
        this.currentState = GameState.PLAYING;
    }

    playerDied() {
        this.currentState = GameState.GAME_OVER;
    }
} 