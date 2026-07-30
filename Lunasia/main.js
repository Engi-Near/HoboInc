// Main 3D scene script
// Remove the import statement as script tags are likely used instead
let scene, camera, renderer;
let controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let sprint = false; // New variable for sprint functionality
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let walls = [];
let floor, roof; // References to floor and roof for raycasting
let collisionDistance = 0.5; // Distance to check for collisions
let handBox; // Reference to the box in hand
let dots = null; // Circular buffer metadata for lidar cubes
let isClicking = false; // Track if mouse is being held down
let raycaster = new THREE.Raycaster(); // Raycaster for projecting rays
let rayInterval; // Interval for ray projection
let lastRayTime = 0; // Time tracking for ray projection rate limiting
let maxDots = 50000; // Increased maximum number of dots due to higher rate
let dotGeometry; // Reusable geometry for dots
let dotMesh = null; // InstancedMesh for all lidar cubes (single WebGL draw call)
let dotLifetime = 30; // Dot lifetime in seconds (15 once chase phase starts)
let _dotMatrix = null; // Reused matrix for instance updates
let _dotColor = null; // Reused color for instance updates
let _dotDummy = null; // Reused Object3D for matrix composition
let _dotWriteIndex = 0; // Next circular slot for a new cube
let _dotCreationTimes = null; // creationTime per instance slot
let _dotActiveCount = 0; // How many slots have been written (up to maxDots)

// Audio variables
let audioListener = null;
let audioContext = null;
let audioInitialized = false; // Flag to track if audio is initialized
let electricalHumSound;
let lunasiaSound;
let walkSound;
let runSound;
let buttonClickSound;
let lunasiaWalkSound;
let isMoving = false;
let lastFootstepTime = 0;
let footstepInterval = 400; // ms between footstep sound events (hearing pulses)
let lastLidarSoundTime = 0;

// Game state variables
let gameState = "LOADING"; // LOADING, PLAYING, PAUSED, GAME_OVER
let gamePhase = "tutorial"; // tutorial | chase
let gameStartTime = 0;
let totalGameTime = 0; // Track total game time
let pauseStartTime = 0; // Track when the game was paused
let enemy = null;
let subtitle = null;
let subtitleTimeout = null;
let playerSpawnPosition = new THREE.Vector3();
let dotsDecayEnabled = false;

// Add these new variables at the top of the file with the other global variables
let navigationGrid = []; // Grid representation of the map for pathfinding
let waypoints = []; // Waypoints at strategic locations (corners)
let currentPath = []; // Current path that the enemy is following
let pathUpdateTime = 0; // Time tracking for path updates
let pathUpdateInterval = 1000; // Update path every 1 second
let gridCellSize = 1; // Size of each grid cell (same as our map cell size)
let lastEnemyPosition = new THREE.Vector3(); // Last recorded enemy position
let lastEnemyMoveTime = 0; // Time of last enemy movement
let stuckCheckInterval = 100; // Time in ms to check if enemy is stuck

// Add this new global variable for the waypoint connectivity
let waypointConnections = {}; // Map of waypoint IDs to arrays of connected waypoint IDs

// Add these performance-related variables at the top of the file with other global variables
let pathfindingCache = {}; // Cache for common paths to avoid recalculation
let maxPathfindingIterations = 500; // Limit iterations to prevent excessive calculations
let pathSimplificationThreshold = 2.0; // Distance threshold for simplifying paths

// Add variables for doors and levers
let doors = []; // Array to store door objects
let levers = []; // Array to store lever objects
let leverActivationProgress = 0; // Progress of current lever activation (0-100%)
let activeLever = null; // Reference to the lever currently being activated
let leverActivationStartTime = 0; // Time when lever activation started
let doorActivated = false; // Whether all doors have been unlocked (levers done)
let interactKeyPressed = false; // Whether the E key is currently pressed
let requiredLeverHoldTime = 500; // Brief press feedback window (levers activate on E)

// Door drag / tutorial exit
let activeDoor = null; // Door currently being dragged
let doorEscapeProgress = 0; // Unused legacy; drag uses doorDragOpen
let doorEscapeStartTime = 0;
let requiredDoorHoldTime = 10000;
let doorDragOpen = 0; // legacy name — now meters slid open
let doorSlideVelocity = 0;
let doorSlideMax = 4.0; // meters to clear the doorway
let isDraggingDoor = false;
let doorsFullyOpen = false;
let lunasiaSpawned = false;
let secondHalfStarted = false;
let helpTextEl = null;
let controlsHelpEl = null;
let controlsHelpVisible = false;

// Lunasia hearing / search AI
let lunasiaAI = null;

// Block camera look while dragging a door (read by PointerLockControls)
window.blockPointerLook = false;

// Add these dialogue-related variables at the top of the file with other global variables
let scheduledDialogues = []; // Array to store scheduled dialogues with their timing
let lastDialogueCheckTime = 0; // Last time we checked for dialogues to display

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Change to black background
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.7; // Eye level height
    
    // Create WebGL renderer with performance-focused settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: false,
        alpha: false,
        precision: 'mediump',
        powerPreference: 'high-performance',
        stencil: false,
        depth: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Cap pixel ratio — high-DPI screens otherwise multiply fill cost
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.sortObjects = false;
    
    document.body.appendChild(renderer.domElement);
    
    // Remove all lights to make the scene pitch black
    // Keep the commented code for reference, but don't add any lights
    /* 
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    */
    
    // Create pointer lock controls - using the global constructor
    controls = new PointerLockControls(camera, renderer.domElement);
    
    // Handle pointer lock events - using proper event handling for Three.js controls
    document.addEventListener('pointerlockchange', handlePointerLockChange, false);
    document.addEventListener('pointerlockerror', handlePointerLockError, false);
    
    // Add event listeners for movement
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    
    // Add mouse event listeners for ray projection
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousemove', onDoorDragMouseMove, false);
    
    // Handle ESC key to exit pointer lock
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && controls.isLocked) {
            controls.unlock();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Shared cube geometry — all lidar hits drawn via one InstancedMesh (WebGL)
    // 300% larger than the previous 0.012 cubes (4x scale)
    dotGeometry = new THREE.BoxGeometry(0.048, 0.048, 0.048);
    _dotMatrix = new THREE.Matrix4();
    _dotColor = new THREE.Color();
    _dotDummy = new THREE.Object3D();
    _dotWriteIndex = 0;
    _dotActiveCount = 0;
    _dotCreationTimes = new Float64Array(maxDots);
    _dotCreationTimes.fill(-Infinity);
    
    const dotMaterial = new THREE.MeshBasicMaterial();
    dotMesh = new THREE.InstancedMesh(dotGeometry, dotMaterial, maxDots);
    dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Allocate per-instance color buffer
    if (typeof dotMesh.setColorAt === 'function') {
        _dotColor.setHex(0x6fc0ff);
        dotMesh.setColorAt(0, _dotColor);
        if (dotMesh.instanceColor) {
            dotMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }
    }
    dotMesh.count = 0;
    dotMesh.frustumCulled = false;
    scene.add(dotMesh);
    
    // Create loading screen before initializing the game
    createLoadingScreen();
    
    // Start animation loop
    animate();
}

// Initialize audio system - call this after user interaction
function initAudio() {
    if (audioInitialized) return;
    
    console.log("Initializing audio system");
    
    try {
        // Initialize the audio listener only after user interaction
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);
        
        // Check if the audio context is created successfully
        if (audioListener.context) {
            audioContext = audioListener.context;
            audioInitialized = true;
            
            // Load audio files now that the context is initialized
            loadAudioFiles();
            console.log("Audio system initialized successfully");
        } else {
            console.error("Failed to get audio context from listener");
        }
    } catch (e) {
        console.error("Error initializing audio:", e);
    }
}

// Load all audio files
function loadAudioFiles() {
    if (!audioInitialized) {
        console.warn("Cannot load audio files - audio system not initialized");
        return;
    }
    
    // Load electrical hum sound for scanner
    electricalHumSound = new THREE.Audio(audioListener);
    const electricalHumLoader = new THREE.AudioLoader();
    electricalHumLoader.load('Lunasia/electrical hum.mp3', function(buffer) {
        electricalHumSound.setBuffer(buffer);
        electricalHumSound.setLoop(true);
        electricalHumSound.setVolume(0.5);
    });
    
    // Load lunasia contact sting
    lunasiaSound = new THREE.Audio(audioListener);
    const lunasiaLoader = new THREE.AudioLoader();
    lunasiaLoader.load('Lunasia/lunasia.mp3', function(buffer) {
        lunasiaSound.setBuffer(buffer);
        lunasiaSound.setLoop(false);
        lunasiaSound.setVolume(0.7);
    });
    
    // Player walk / run loops
    walkSound = new THREE.Audio(audioListener);
    const walkLoader = new THREE.AudioLoader();
    walkLoader.load('Lunasia/SKKwalk.mp3', function(buffer) {
        walkSound.setBuffer(buffer);
        walkSound.setLoop(true);
        walkSound.setVolume(0.45);
    });
    
    runSound = new THREE.Audio(audioListener);
    const runLoader = new THREE.AudioLoader();
    runLoader.load('Lunasia/Skkrun.mp3', function(buffer) {
        runSound.setBuffer(buffer);
        runSound.setLoop(true);
        runSound.setVolume(0.55);
    });
    
    // Lunasia movement loop (volume scaled by distance + noise level)
    lunasiaWalkSound = new THREE.Audio(audioListener);
    const lunasiaWalkLoader = new THREE.AudioLoader();
    lunasiaWalkLoader.load('Lunasia/Lunasia Walk.mp3', function(buffer) {
        lunasiaWalkSound.setBuffer(buffer);
        lunasiaWalkSound.setLoop(true);
        lunasiaWalkSound.setVolume(0);
    });
    
    // Load button click for orange lever / panel interactions
    buttonClickSound = new THREE.Audio(audioListener);
    const buttonClickLoader = new THREE.AudioLoader();
    buttonClickLoader.load('Lunasia/button click.mp3', function(buffer) {
        buttonClickSound.setBuffer(buffer);
        buttonClickSound.setLoop(false);
        buttonClickSound.setVolume(0.8);
    });
}

// Handle audio for game pause/resume
function handleAudioOnPause(isPaused) {
    if (!audioInitialized) return;
    
    if (isPaused) {
        if (electricalHumSound && electricalHumSound.isPlaying) electricalHumSound.pause();
        if (walkSound && walkSound.isPlaying) walkSound.pause();
        if (runSound && runSound.isPlaying) runSound.pause();
        if (lunasiaWalkSound && lunasiaWalkSound.isPlaying) lunasiaWalkSound.pause();
    } else {
        if (isClicking && electricalHumSound && electricalHumSound.buffer && !electricalHumSound.isPlaying) {
            electricalHumSound.play();
        }
    }
}

// Handle pointer lock change event
function handlePointerLockChange() {
    console.log("Pointer lock change detected");
    
    if (document.pointerLockElement === renderer.domElement) {
        console.log("Pointer locked");
        hideLoadingScreen();
        
        // Initialize audio after user interaction (pointer lock)
        initAudio();
        
        if (gameState === "LOADING") {
            startGame();
        } else if (gameState === "PAUSED") {
            // Resume game - calculate paused duration and adjust game time
            const pauseDuration = performance.now() - pauseStartTime;
            gameStartTime += pauseDuration; // Adjust game start time to account for pause
            
            // Reset movement flags when resuming from pause
            moveForward = false;
            moveBackward = false;
            moveLeft = false;
            moveRight = false;
            sprint = false;
            
            // Resume any scheduled events here if needed
            
            gameState = "PLAYING";
            hidePauseScreen();
            
            // Resume audio
            handleAudioOnPause(false);
        }
    } else {
        console.log("Pointer unlocked");
        if (gameState === "PLAYING") {
            // Pause game
            pauseStartTime = performance.now();
            gameState = "PAUSED";
            showPauseScreen();
            
            // Pause audio
            handleAudioOnPause(true);
        }
    }
}

// Handle pointer lock error
function handlePointerLockError() {
    console.error("Pointer lock error");
    // Fallback in case pointer lock fails
    hideLoadingScreen();
    startGame();
}

// Create the loading screen with title and play button
function createLoadingScreen() {
    console.log("Creating loading screen");
    
    // Remove any existing loading screen
    const existingScreen = document.getElementById('loading-screen');
    if (existingScreen) {
        document.body.removeChild(existingScreen);
    }
    
    // Create loading screen container
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.style.position = 'fixed'; // Use fixed instead of absolute for better positioning
    loadingScreen.style.width = '100%';
    loadingScreen.style.height = '100%';
    loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    loadingScreen.style.top = '0';
    loadingScreen.style.left = '0';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.flexDirection = 'column';
    loadingScreen.style.justifyContent = 'center';
    loadingScreen.style.alignItems = 'center';
    loadingScreen.style.zIndex = '9999'; // Ensure it's above everything
    loadingScreen.style.fontFamily = '"Courier New", monospace'; // Computerized font
    
    // Game title
    const title = document.createElement('h1');
    title.textContent = 'Lunasias Game';
    title.style.color = 'white';
    title.style.fontSize = '4em';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '2em';
    title.style.textAlign = 'center';
    title.style.fontFamily = 'inherit';
    loadingScreen.appendChild(title);
    
    // Play button
    const playButton = document.createElement('button');
    playButton.textContent = 'Play';
    playButton.style.padding = '1em 2em';
    playButton.style.fontSize = '1.5em';
    playButton.style.backgroundColor = '#333';
    playButton.style.color = 'white';
    playButton.style.border = 'none';
    playButton.style.borderRadius = '5px';
    playButton.style.cursor = 'pointer';
    playButton.style.fontFamily = 'inherit';
    playButton.style.fontWeight = 'bold';
    
    // Hover effect
    playButton.addEventListener('mouseover', function() {
        playButton.style.backgroundColor = '#555';
    });
    
    playButton.addEventListener('mouseout', function() {
        playButton.style.backgroundColor = '#333';
    });
    
    // Click handler
    playButton.addEventListener('click', function() {
        console.log("Play button clicked");
        // First make sure the gameState is LOADING
        gameState = "LOADING";
        
        // Try to lock the pointer
        try {
            controls.lock();
        } catch (e) {
            console.error("Error locking pointer:", e);
            
            // Fallback in case pointer lock fails
            hideLoadingScreen();
            startGame();
        }
    });
    
    loadingScreen.appendChild(playButton);
    
    // Append to body after a short delay to ensure DOM is ready
    setTimeout(() => {
        document.body.appendChild(loadingScreen);
        console.log("Loading screen added to DOM");
    }, 100);
}

// Show a subtitle message
function showSubtitle(message, duration = 5000) {
    // Clear any existing subtitle
    if (subtitle) {
        document.body.removeChild(subtitle);
        subtitle = null;
    }
    
    if (subtitleTimeout) {
        clearTimeout(subtitleTimeout);
        subtitleTimeout = null;
    }
    
    // Create subtitle element
    subtitle = document.createElement('div');
    subtitle.id = 'subtitle';
    subtitle.style.position = 'absolute';
    subtitle.style.bottom = '20%';
    subtitle.style.width = '100%';
    subtitle.style.textAlign = 'center';
    subtitle.style.color = 'white';
    subtitle.style.fontFamily = 'Helvetica, Arial, sans-serif';
    subtitle.style.fontSize = '1.5em';
    subtitle.style.fontWeight = 'bold';
    subtitle.style.zIndex = '100';
    subtitle.style.pointerEvents = 'none'; // Prevent it from blocking clicks
    subtitle.style.padding = '0 10%';
    subtitle.style.textShadow = '0 2px 8px #000';
    subtitle.textContent = message;
    
    document.body.appendChild(subtitle);
    
    // Remove after duration
    subtitleTimeout = setTimeout(() => {
        if (subtitle) {
            document.body.removeChild(subtitle);
            subtitle = null;
        }
    }, duration);
}

// Yellow help text at the top of the screen
function showHelpText(message) {
    if (!helpTextEl) {
        helpTextEl = document.createElement('div');
        helpTextEl.id = 'help-text';
        helpTextEl.style.position = 'absolute';
        helpTextEl.style.top = '18px';
        helpTextEl.style.left = '50%';
        helpTextEl.style.transform = 'translateX(-50%)';
        helpTextEl.style.maxWidth = '80%';
        helpTextEl.style.textAlign = 'center';
        helpTextEl.style.color = '#ffeb3b';
        helpTextEl.style.fontFamily = 'Helvetica, Arial, sans-serif';
        helpTextEl.style.fontSize = '0.95em';
        helpTextEl.style.fontWeight = 'normal';
        helpTextEl.style.zIndex = '110';
        helpTextEl.style.pointerEvents = 'none';
        helpTextEl.style.textShadow = '0 1px 4px #000';
        helpTextEl.style.lineHeight = '1.4';
        document.body.appendChild(helpTextEl);
    }
    helpTextEl.textContent = message;
    helpTextEl.style.display = 'block';
}

function hideHelpText() {
    if (helpTextEl) {
        helpTextEl.style.display = 'none';
    }
}

function toggleControlsHelp() {
    if (controlsHelpVisible) {
        hideControlsHelp();
    } else {
        showControlsHelp();
    }
}

function showControlsHelp() {
    if (!controlsHelpEl) {
        controlsHelpEl = document.createElement('div');
        controlsHelpEl.id = 'controls-help';
        controlsHelpEl.style.position = 'absolute';
        controlsHelpEl.style.top = '50%';
        controlsHelpEl.style.left = '50%';
        controlsHelpEl.style.transform = 'translate(-50%, -50%)';
        controlsHelpEl.style.background = 'rgba(0,0,0,0.85)';
        controlsHelpEl.style.color = '#fff';
        controlsHelpEl.style.padding = '1.5em 2em';
        controlsHelpEl.style.fontFamily = 'Helvetica, Arial, sans-serif';
        controlsHelpEl.style.fontSize = '1em';
        controlsHelpEl.style.lineHeight = '1.7';
        controlsHelpEl.style.zIndex = '200';
        controlsHelpEl.style.border = '1px solid #666';
        controlsHelpEl.style.maxWidth = '420px';
        controlsHelpEl.innerHTML =
            '<div style="font-size:1.2em;margin-bottom:0.6em;color:#ffeb3b;">Controls</div>' +
            'W A S D — Move<br>' +
            'Mouse — Look<br>' +
            'Left Click — Scan with scanner<br>' +
            'E — Interact / grab &amp; drag<br>' +
            'Shift — Sprint<br>' +
            'H — Toggle this help<br>' +
            'Esc — Pause';
        document.body.appendChild(controlsHelpEl);
    }
    controlsHelpEl.style.display = 'block';
    controlsHelpVisible = true;
}

function hideControlsHelp() {
    if (controlsHelpEl) {
        controlsHelpEl.style.display = 'none';
    }
    controlsHelpVisible = false;
}

// Show the game over screen
function showGameOverScreen() {
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.style.position = 'absolute';
    gameOverScreen.style.width = '100%';
    gameOverScreen.style.height = '100%';
    gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    gameOverScreen.style.top = '0';
    gameOverScreen.style.left = '0';
    gameOverScreen.style.display = 'flex';
    gameOverScreen.style.flexDirection = 'column';
    gameOverScreen.style.justifyContent = 'center';
    gameOverScreen.style.alignItems = 'center';
    gameOverScreen.style.zIndex = '1000';
    gameOverScreen.style.fontFamily = '"Courier New", monospace';
    
    const gameOverText = document.createElement('h1');
    gameOverText.textContent = 'GAME OVER';
    gameOverText.style.color = 'red';
    gameOverText.style.fontSize = '5em';
    gameOverText.style.fontWeight = 'bold';
    gameOverText.style.marginBottom = '1em';
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Restart';
    restartButton.style.padding = '1em 2em';
    restartButton.style.fontSize = '1.5em';
    restartButton.style.backgroundColor = '#333';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    
    restartButton.addEventListener('click', function() {
        location.reload(); // Simple way to restart the game
    });
    
    gameOverScreen.appendChild(gameOverText);
    gameOverScreen.appendChild(restartButton);
    document.body.appendChild(gameOverScreen);
}

// Show a pause screen
function showPauseScreen() {
    const pauseScreen = document.createElement('div');
    pauseScreen.id = 'pause-screen';
    pauseScreen.style.position = 'absolute';
    pauseScreen.style.width = '100%';
    pauseScreen.style.height = '100%';
    pauseScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    pauseScreen.style.top = '0';
    pauseScreen.style.left = '0';
    pauseScreen.style.display = 'flex';
    pauseScreen.style.flexDirection = 'column';
    pauseScreen.style.justifyContent = 'center';
    pauseScreen.style.alignItems = 'center';
    pauseScreen.style.zIndex = '1000';
    
    const pauseText = document.createElement('h2');
    pauseText.textContent = 'PAUSED';
    pauseText.style.color = 'white';
    pauseText.style.marginBottom = '1em';
    
    // Show game time in the pause screen
    const gameTimeText = document.createElement('div');
    const elapsedSeconds = Math.floor((performance.now() - gameStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    gameTimeText.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    gameTimeText.style.color = 'white';
    gameTimeText.style.marginBottom = '2em';
    
    const resumeButton = document.createElement('button');
    resumeButton.textContent = 'Resume';
    resumeButton.style.padding = '0.5em 1em';
    resumeButton.style.cursor = 'pointer';
    
    resumeButton.addEventListener('click', function() {
        hidePauseScreen();
        controls.lock();
    });
    
    pauseScreen.appendChild(pauseText);
    pauseScreen.appendChild(gameTimeText);
    pauseScreen.appendChild(resumeButton);
    pauseScreen.id = 'pause-screen';
    document.body.appendChild(pauseScreen);
}

// Hide the loading screen
function hideLoadingScreen() {
    console.log("Hiding loading screen");
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        document.body.removeChild(loadingScreen);
        console.log("Loading screen removed");
    } else {
        console.log("No loading screen found to hide");
    }
}

// Hide the pause screen
function hidePauseScreen() {
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen) {
        document.body.removeChild(pauseScreen);
    }
}

// Start the game
function startGame() {
    console.log("Starting game");
    gameState = "PLAYING";
    gameStartTime = performance.now();
    totalGameTime = 0;
    lastDialogueCheckTime = 0;
    
    // Reset all movement flags
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    sprint = false;
    
    // Create the map
    createMap();
    
    // Create the box in hand
    createHandBox();
    
    gamePhase = "tutorial";
    secondHalfStarted = false;
    dotsDecayEnabled = false;
    dotLifetime = 30;
    doorSlideVelocity = 0;
    
    // Clear any previously scheduled dialogues
    scheduledDialogues = [];
    lunasiaSpawned = false;
    doorDragOpen = 0;
    isDraggingDoor = false;
    doorsFullyOpen = false;
    window.blockPointerLook = false;
    hideHelpText();
    hideControlsHelp();
    
    // Tutorial opening sequence — Lunasia does not spawn in the first room
    scheduleDialogue(0,
        "Good morning commander~ Or is it good evening, I doubt you can tell.",
        null, 6000);
    scheduleDialogue(6,
        "As you can see, I turned off all the lights! I wanted to play a game with you.",
        null, 6000);
    scheduleDialogue(12,
        "Why don't you take a look around the room.",
        null, 8000,
        "Check controls with H. left click to scan with your scanner");
    // 15s after Opening pt3
    scheduleDialogue(27,
        "How do you like the room~ If you keep looking, there's levers on the floor.",
        null, 9000,
        "Orange objects are interactable panels. Blue objects are terrain. Green Objects can be grabbed and dragged. Interacting with objects is 'E'");
    // 20s after Opening pt4
    scheduleDialogue(47,
        "Well, if you can find your way out of here~ I'll be waiting in the next room.",
        null, 8000);
    
    // Show the first message immediately
    showSubtitle(scheduledDialogues[0].message, scheduledDialogues[0].duration);
}

// Schedule a dialogue message at a specific game time
function scheduleDialogue(timeInSeconds, message, callback = null, duration = 5000, helpText = null) {
    scheduledDialogues.push({
        timeInSeconds: timeInSeconds,
        message: message,
        callback: callback,
        duration: duration,
        helpText: helpText,
        triggered: timeInSeconds === 0 // Mark the first one as triggered since we show it immediately
    });
}

// Check for dialogues that should be triggered based on game time
function checkScheduledDialogues() {
    if (gameState !== "PLAYING") return;
    
    // Calculate current game time in seconds
    const currentGameTimeInSeconds = Math.floor(totalGameTime / 1000);
    
    // Don't check too frequently to avoid spamming
    if (currentGameTimeInSeconds === lastDialogueCheckTime) return;
    lastDialogueCheckTime = currentGameTimeInSeconds;
    
    // Check each scheduled dialogue
    for (const dialogue of scheduledDialogues) {
        // Skip already triggered dialogues
        if (dialogue.triggered) continue;
        
        // Check if it's time to show this dialogue
        if (currentGameTimeInSeconds >= dialogue.timeInSeconds) {
            dialogue.triggered = true;
            
            // Show the dialogue message if there is one
            if (dialogue.message) {
                showSubtitle(dialogue.message, dialogue.duration || 5000);
            }
            
            if (dialogue.helpText) {
                showHelpText(dialogue.helpText);
            }
            
            // Execute callback if provided
            if (dialogue.callback) {
                dialogue.callback();
            }
        }
    }
}

// Create a more advanced LIDAR scanner device in the player's hand
function createHandBox() {
    // Create a group to hold all parts of the device
    const deviceGroup = new THREE.Group();
    
    // Box dimensions
    const boxWidth = 0.24;
    const boxHeight = 0.08;
    const boxDepth = 0.3;
    
    // 1. Create the main flattened box (base of the device)
    const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const mainBox = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            opacity: 1.0,
            transparent: true
        })
    );
    deviceGroup.add(mainBox);
    
    // Add solid box to make it fully opaque
    const solidBox = new THREE.Mesh(
        boxGeometry,
        new THREE.MeshBasicMaterial({
            color: 0x111111, // Very dark gray
            opacity: 1.0,
            transparent: false
        })
    );
    deviceGroup.add(solidBox);
    
    // 2. Create a tube extending from the front
    const tubeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
    const tubeEdges = new THREE.EdgesGeometry(tubeGeometry);
    const tube = new THREE.LineSegments(
        tubeEdges,
        new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    // Position the tube at the front of the box, rotated to point forward
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0, -0.2);
    deviceGroup.add(tube);
    
    // Add solid cylinder for the tube
    const tubeSolid = new THREE.Mesh(
        tubeGeometry,
        new THREE.MeshBasicMaterial({ 
            color: 0x111111, // Very dark gray
            opacity: 1.0,
            transparent: false
        })
    );
    tubeSolid.rotation.x = Math.PI / 2;
    tubeSolid.position.set(0, 0, -0.2);
    deviceGroup.add(tubeSolid);
    
    // 3. Create an angled panel on top
    const panelGeometry = new THREE.PlaneGeometry(0.15, 0.1);
    const panelEdges = new THREE.EdgesGeometry(panelGeometry);
    const panel = new THREE.LineSegments(
        panelEdges,
        new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    // Position and angle the panel on top
    panel.rotation.x = -Math.PI / 4; // 45-degree angle
    panel.position.set(0, 0.05, -0.08);
    deviceGroup.add(panel);
    
    // Add solid panel face (front side)
    const panelFaceFront = new THREE.Mesh(
        panelGeometry,
        new THREE.MeshBasicMaterial({ 
            color: 0x111111, // Very dark gray
            opacity: 1.0,
            transparent: false,
            side: THREE.FrontSide
        })
    );
    panelFaceFront.rotation.x = -Math.PI / 4;
    panelFaceFront.position.set(0, 0.05, -0.08);
    deviceGroup.add(panelFaceFront);
    
    // Add solid panel face (back side)
    const panelFaceBack = new THREE.Mesh(
        panelGeometry,
        new THREE.MeshBasicMaterial({ 
            color: 0x111111, // Very dark gray
            opacity: 1.0,
            transparent: false,
            side: THREE.BackSide
        })
    );
    panelFaceBack.rotation.x = -Math.PI / 4;
    panelFaceBack.position.set(0, 0.05, -0.08);
    deviceGroup.add(panelFaceBack);
    
    // Position the entire device to appear in the bottom right of the view
    deviceGroup.position.set(0.4, -0.3, -0.6);
    
    // Add to camera
    handBox = deviceGroup;
    camera.add(handBox);
    scene.add(camera);
}

// Create the map based on the provided layout
function createMap() {
    // Reset world collections for a clean tutorial start
    walls = [];
    doors = [];
    levers = [];
    doorActivated = false;
    doorsFullyOpen = false;
    doorDragOpen = 0;
    
    // Define the map layout where O is open space and # is a wall
    const mapLayout = [
        "L........#............................................====..",
        ".........#....##.....##.....##.....##.......................",
        "..#...#..#....##.....##.....##.....##.......................",
        "..#...#..#.........................................#######..",
        "..#...#..#.........................................#........",
        "...................................................#........",
        "..............##.....##.....##.....##..............#........",
        "##########....##.....##.....##.....##..............#........",
        "...................................................#........",
        "...................................................#........",
        "..########.........................................#........",
        ".........#....##.....##.....##.....##..............#..######",
        ".........#....##.....##.....##.....##..............#........",
        "#######..#.........................................#........",
        ".........#.........................................#.......L",
        "........L#.........................................#........",
        "..########.........................................#........",
        ".........#.........................................#........",
        ".........#.........................................#..######",
        "#######..#.........................................#........",
        ".........#.........................................#........",
        ".........#.........................................#........",
        "..########.........................................#........",
        "...................................................#........",
        "...................................................#........",
        "##########...#..########..#..#..########..#...#########...##",
        ".............#............#..#............#.................",
        "L............#............#.L#............#................."
    ];
    
    // Calculate map dimensions
    const mapWidth = mapLayout[0].length;
    const mapHeight = mapLayout.length;
    const cellSize = 1; // 1 meter per cell
    
    // Create floor with completely black material
    const floorGeometry = new THREE.PlaneGeometry(mapWidth * cellSize, mapHeight * cellSize);
    const floorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, // Pure black
        opacity: 0.0,
        transparent: true,
        side: THREE.DoubleSide
    });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.userData.material = "concrete"; // Tag as concrete material for raycasting
    scene.add(floor);
    
    // Add a grid helper but make it invisible
    const gridHelper = new THREE.GridHelper(mapWidth * cellSize, mapWidth);
    gridHelper.position.y = 0.01;
    gridHelper.visible = false; // Make grid invisible
    scene.add(gridHelper);
    
    // Wall material - completely black
    const wallMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, // Pure black
        opacity: 1.0, // Make walls opaque
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Wall dimensions
    const wallHeight = 3; // 3 meters high
    
    // Center the map
    const offsetX = -mapWidth * cellSize / 2 + cellSize / 2;
    const offsetZ = -mapHeight * cellSize / 2 + cellSize / 2;
    
    // Create walls from the layout - invisible but physical
    for (let z = 0; z < mapHeight; z++) {
        for (let x = 0; x < mapWidth; x++) {
            if (mapLayout[z][x] === '#') {
                // Create a vertical wall (2D plane for optimization)
                createWall(
                    offsetX + x * cellSize,
                    offsetZ + z * cellSize,
                    cellSize,
                    wallHeight,
                    wallMaterial
                );
            } else if (mapLayout[z][x] === '=') {
                // Create a door piece
                createDoor(
                    offsetX + x * cellSize,
                    offsetZ + z * cellSize,
                    cellSize,
                    wallHeight,
                    wallMaterial
                );
            } else if (mapLayout[z][x] === 'L') {
                // Create a lever
                createLever(
                    offsetX + x * cellSize,
                    offsetZ + z * cellSize,
                    cellSize
                );
            }
        }
    }
    
    // Create boundary walls around the map - invisible but physical
    createBoundaryWalls(
        offsetX - cellSize/2,
        offsetZ - cellSize/2,
        mapWidth * cellSize,
        mapHeight * cellSize,
        wallHeight,
        wallMaterial
    );
    
    // Create a roof over the entire map - completely black
    const roofGeometry = new THREE.PlaneGeometry(mapWidth * cellSize, mapHeight * cellSize);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, // Pure black
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide
    });
    roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.x = Math.PI / 2; // Rotate to face downward
    roof.position.set(0, wallHeight, 0); // Position at the top of the walls
    roof.userData.material = "concrete"; // Tag as concrete material for raycasting
    scene.add(roof);
    
    // Set initial camera position in an empty area of the map (middle right section)
    camera.position.set(offsetX + 40, 1.7, offsetZ + 15);
    playerSpawnPosition.set(offsetX + 40, 1.7, offsetZ + 15);
    
    // Create the navigation grid for pathfinding
    createNavigationGrid(mapLayout, offsetX, offsetZ, cellSize);
    
    // Generate waypoints at strategic locations (corners and corridors) for pathfinding heuristic
    generateWaypoints(navigationGrid, offsetX, offsetZ, cellSize);
}

// Create a navigation grid based on the map layout for A* pathfinding
function createNavigationGrid(mapLayout, offsetX, offsetZ, cellSize) {
    const mapWidth = mapLayout[0].length;
    const mapHeight = mapLayout.length;
    
    // Initialize the grid
    navigationGrid = [];
    
    for (let z = 0; z < mapHeight; z++) {
        navigationGrid[z] = [];
        for (let x = 0; x < mapWidth; x++) {
            // Mark walls as non-walkable, open spaces as walkable
            // Updated to use '.' for walkable spaces and '#' for walls
            navigationGrid[z][x] = {
                walkable: mapLayout[z][x] !== '#',
                worldX: offsetX + x * cellSize,
                worldZ: offsetZ + z * cellSize,
                x: x,
                z: z,
                f: 0, // f cost for A*
                g: 0, // g cost for A*
                h: 0, // h cost for A*
                parent: null // parent node for path reconstruction
            };
        }
    }
    
    console.log("Navigation grid created with dimensions: " + mapWidth + "x" + mapHeight);
}

// Generate waypoints at strategic locations (corners and corridors) for pathfinding heuristic
function generateWaypoints(grid, offsetX, offsetZ, cellSize) {
    waypoints = [];
    waypointConnections = {}; // Reset connections
    
    // First pass: identify only exterior corners
    for (let z = 1; z < grid.length - 1; z++) {
        for (let x = 1; x < grid[z].length - 1; x++) {
            // Only consider walkable cells
            if (grid[z][x].walkable) {
                // Check if it's an exterior corner - these are the key decision points
                // An exterior corner is a walkable cell with two adjacent non-walkable cells that are diagonal from each other
                
                // Check for top-right exterior corner
                const isTopRightExterior = 
                    grid[z-1][x].walkable && grid[z][x+1].walkable && 
                    !grid[z-1][x+1].walkable;
                
                // Check for top-left exterior corner
                const isTopLeftExterior = 
                    grid[z-1][x].walkable && grid[z][x-1].walkable && 
                    !grid[z-1][x-1].walkable;
                
                // Check for bottom-right exterior corner
                const isBottomRightExterior = 
                    grid[z+1][x].walkable && grid[z][x+1].walkable && 
                    !grid[z+1][x+1].walkable;
                
                // Check for bottom-left exterior corner
                const isBottomLeftExterior = 
                    grid[z+1][x].walkable && grid[z][x-1].walkable && 
                    !grid[z+1][x-1].walkable;
                
                if (isTopRightExterior || isTopLeftExterior || isBottomRightExterior || isBottomLeftExterior) {
                    // Add a waypoint for this exterior corner
                    const waypointId = waypoints.length;
                    const waypoint = {
                        id: waypointId,
                        x: grid[z][x].worldX,
                        z: grid[z][x].worldZ,
                        gridX: x,
                        gridZ: z
                    };
                    waypoints.push(waypoint);
                    waypointConnections[waypointId] = []; // Initialize connections list
                    
                    // Waypoint visualization removed
                }
            }
        }
    }
    
    // Second pass: Connect waypoints that have clear line-of-sight between them
    for (let i = 0; i < waypoints.length; i++) {
        for (let j = i + 1; j < waypoints.length; j++) {
            const wp1 = waypoints[i];
            const wp2 = waypoints[j];
            
            // Check if there's a clear path between these waypoints
            if (hasLineOfSight(grid, wp1.gridX, wp1.gridZ, wp2.gridX, wp2.gridZ)) {
                // Add bidirectional connection
                waypointConnections[wp1.id].push(wp2.id);
                waypointConnections[wp2.id].push(wp1.id);
                
                // Connection visualization removed
            }
        }
    }
    
    console.log("Generated " + waypoints.length + " waypoints at exterior corners with " + 
                Object.values(waypointConnections).flat().length / 2 + " connections");
}

// Check if there's a clear line of sight between two grid points
function hasLineOfSight(grid, x1, z1, x2, z2) {
    // Use Bresenham's line algorithm to check cells along the line
    const dx = Math.abs(x2 - x1);
    const dz = Math.abs(z2 - z1);
    const sx = x1 < x2 ? 1 : -1;
    const sz = z1 < z2 ? 1 : -1;
    let err = dx - dz;
    
    let x = x1;
    let z = z1;
    
    while (x !== x2 || z !== z2) {
        // Skip checking the start and end points (which we know are walkable)
        if ((x !== x1 || z !== z1) && (x !== x2 || z !== z2)) {
            // If we encounter a non-walkable cell along the path, there's no line of sight
            if (!grid[z][x].walkable) {
                return false;
            }
        }
        
        const e2 = 2 * err;
        if (e2 > -dz) {
            err -= dz;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            z += sz;
        }
    }
    
    return true; // All cells along the line are walkable
}

// A* pathfinding algorithm
function findPath(startX, startZ, targetX, targetZ) {
    // Unique key for caching
    const cacheKey = `${Math.round(startX)},${Math.round(startZ)}-${Math.round(targetX)},${Math.round(targetZ)}`;
    
    // Check cache first
    if (pathfindingCache[cacheKey]) {
        return JSON.parse(JSON.stringify(pathfindingCache[cacheKey]));
    }
    
    // Convert world coordinates to grid coordinates
    const startGridX = Math.round((startX + navigationGrid[0].length * gridCellSize / 2) / gridCellSize);
    const startGridZ = Math.round((startZ + navigationGrid.length * gridCellSize / 2) / gridCellSize);
    const targetGridX = Math.round((targetX + navigationGrid[0].length * gridCellSize / 2) / gridCellSize);
    const targetGridZ = Math.round((targetZ + navigationGrid.length * gridCellSize / 2) / gridCellSize);
    
    // Validate grid coordinates
    if (startGridX < 0 || startGridX >= navigationGrid[0].length ||
        startGridZ < 0 || startGridZ >= navigationGrid.length ||
        targetGridX < 0 || targetGridX >= navigationGrid[0].length ||
        targetGridZ < 0 || targetGridZ >= navigationGrid.length) {
        console.warn("Invalid grid coordinates for pathfinding");
        return [];
    }
    
    // Direct distance check - if very close, return direct path
    const directDist = distance(startX, startZ, targetX, targetZ);
    if (directDist < 1.5) {
        const directPath = [{x: startX, z: startZ}, {x: targetX, z: targetZ}];
        pathfindingCache[cacheKey] = directPath;
        return directPath;
    }
    
    // If start or end is not walkable, find nearest walkable cell
    let startNode = navigationGrid[startGridZ][startGridX];
    let targetNode = navigationGrid[targetGridZ][targetGridX];
    
    if (!startNode.walkable) {
        startNode = findNearestWalkableNode(startGridX, startGridZ);
    }
    
    if (!targetNode.walkable) {
        targetNode = findNearestWalkableNode(targetGridX, targetGridZ);
    }
    
    // If no walkable cells found, return empty path
    if (!startNode || !targetNode) {
        return [];
    }
    
    // Find nearest waypoints to start and target
    const nearestStartWaypoint = findNearestWaypoint(startX, startZ);
    const nearestTargetWaypoint = findNearestWaypoint(targetX, targetZ);
    
    // Check if we can take advantage of the waypoint network
    if (nearestStartWaypoint && nearestTargetWaypoint && 
        nearestStartWaypoint.id !== nearestTargetWaypoint.id) {
        
        // Check distance to waypoints - if too far, skip waypoint path
        const startToWaypointDist = distance(startX, startZ, nearestStartWaypoint.x, nearestStartWaypoint.z);
        const targetToWaypointDist = distance(targetX, targetZ, nearestTargetWaypoint.x, nearestTargetWaypoint.z);
        
        if (startToWaypointDist < 8 && targetToWaypointDist < 8) {
            // First, find the waypoint-to-waypoint path using the connectivity graph
            const waypointPath = findWaypointPath(nearestStartWaypoint.id, nearestTargetWaypoint.id);
            
            if (waypointPath.length > 0) {
                // We found a path through the waypoint network
                // Convert waypoint IDs to actual waypoints
                const waypointNodes = waypointPath.map(id => waypoints.find(wp => wp.id === id));
                
                // Build a direct path from start to each waypoint to target
                let fullPath = [];
                
                // Add start position if not already at first waypoint
                const distToFirstWaypoint = distance(startX, startZ, waypointNodes[0].x, waypointNodes[0].z);
                if (distToFirstWaypoint > 0.2) {
                    fullPath.push({
                        x: startX,
                        z: startZ
                    });
                }
                
                // Add each waypoint
                for (const waypoint of waypointNodes) {
                    fullPath.push({
                        x: waypoint.x,
                        z: waypoint.z
                    });
                }
                
                // Add target if not already at last waypoint
                const distFromLastWaypointToTarget = distance(
                    waypointNodes[waypointNodes.length - 1].x, 
                    waypointNodes[waypointNodes.length - 1].z,
                    targetX, targetZ
                );
                
                if (distFromLastWaypointToTarget > 0.2) {
                    fullPath.push({
                        x: targetX,
                        z: targetZ
                    });
                }
                
                // Cache the result
                pathfindingCache[cacheKey] = fullPath;
                return fullPath;
            }
        }
    }
    
    // Fallback: direct A* search
    resetNavigationGrid();
    const path = aStarSearch(startNode, targetNode);
    
    // Cache the result
    pathfindingCache[cacheKey] = path;
    return path;
}

// Reset the navigation grid for a new search
function resetNavigationGrid() {
    for (let z = 0; z < navigationGrid.length; z++) {
        for (let x = 0; x < navigationGrid[z].length; x++) {
            navigationGrid[z][x].f = 0;
            navigationGrid[z][x].g = 0;
            navigationGrid[z][x].h = 0;
            navigationGrid[z][x].parent = null;
        }
    }
}

// Find a path through the waypoint network using Dijkstra's algorithm
function findWaypointPath(startId, targetId) {
    // Cache key for path reuse
    const cacheKey = `wp-${startId}-${targetId}`;
    if (pathfindingCache[cacheKey]) {
        return JSON.parse(JSON.stringify(pathfindingCache[cacheKey]));
    }
    
    // If no connections, return empty path
    if (!waypointConnections[startId] || !waypointConnections[targetId]) {
        return [];
    }
    
    // Early exit if direct connection exists
    if (waypointConnections[startId].includes(targetId)) {
        const result = [startId, targetId];
        pathfindingCache[cacheKey] = result;
        return result;
    }
    
    // Initialize distances with Map for better performance
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set();
    
    // Set up initial state
    for (const wpId in waypointConnections) {
        const id = parseInt(wpId);
        distances.set(id, id === startId ? 0 : Infinity);
        previous.set(id, null);
        unvisited.add(id);
    }
    
    // Dijkstra's algorithm
    while (unvisited.size > 0) {
        // Find unvisited node with minimum distance
        let current = null;
        let minDistance = Infinity;
        for (const wpId of unvisited) {
            if (distances.get(wpId) < minDistance) {
                minDistance = distances.get(wpId);
                current = wpId;
            }
        }
        
        // If we've reached the target or there's no path, we're done
        if (current === null || current === targetId || distances.get(current) === Infinity) {
            break;
        }
        
        unvisited.delete(current);
        
        // Update distances to neighbors
        for (const neighborId of waypointConnections[current]) {
            if (unvisited.has(neighborId)) {
                // Find the waypoints to calculate distance
                const wp1 = waypoints.find(wp => wp.id === current);
                const wp2 = waypoints.find(wp => wp.id === neighborId);
                
                // Calculate direct distance between waypoints
                const dist = distance(wp1.x, wp1.z, wp2.x, wp2.z);
                const alt = distances.get(current) + dist;
                
                if (alt < distances.get(neighborId)) {
                    distances.set(neighborId, alt);
                    previous.set(neighborId, current);
                }
            }
        }
    }
    
    // Reconstruct the path
    const path = [];
    let current = targetId;
    
    // If there's no path to the target, return empty path
    if (previous.get(current) === null && current !== startId) {
        return [];
    }
    
    // Work backwards from target to start
    while (current !== null) {
        path.unshift(current);
        current = previous.get(current);
    }
    
    // Cache the result
    pathfindingCache[cacheKey] = path;
    return path;
}

// Calculate improved heuristic for A* using waypoints
function calculateWaypointHeuristic(fromX, fromZ, toX, toZ) {
    // Base heuristic is the direct distance
    const directDistance = distance(fromX, fromZ, toX, toZ);
    
    // If we don't have waypoints yet, just use direct distance
    if (waypoints.length === 0) {
        return directDistance;
    }
    
    // Find the nearest waypoint to current position
    const nearestWaypoint = findNearestWaypoint(fromX, fromZ);
    if (!nearestWaypoint) {
        return directDistance;
    }
    
    // Find the nearest waypoint to target position
    const nearestTargetWaypoint = findNearestWaypoint(toX, toZ);
    if (!nearestTargetWaypoint || nearestWaypoint.id === nearestTargetWaypoint.id) {
        return directDistance;
    }
    
    // If these waypoints are connected, we can more aggressively bias toward them
    const isDirectlyConnected = waypointConnections[nearestWaypoint.id].includes(nearestTargetWaypoint.id);
    
    // Calculate Manhattan distance between waypoints
    const waypointDistance = Math.abs(nearestWaypoint.gridX - nearestTargetWaypoint.gridX) + 
                            Math.abs(nearestWaypoint.gridZ - nearestTargetWaypoint.gridZ);
    
    // Calculate distance from current position to nearest waypoint
    const distToWaypoint = distance(fromX, fromZ, nearestWaypoint.x, nearestWaypoint.z);
    
    // Calculate distance from nearest target waypoint to target
    const distFromWaypointToTarget = distance(nearestTargetWaypoint.x, nearestTargetWaypoint.z, toX, toZ);
    
    // Combine the distances with a weight that depends on connectivity
    // This creates a preference for paths that go through connected waypoints
    const weight = isDirectlyConnected ? 0.7 : 0.9;
    return (distToWaypoint + waypointDistance + distFromWaypointToTarget) * weight;
}

// Find the nearest walkable node in the grid
function findNearestWalkableNode(gridX, gridZ) {
    // Start with a small search radius and expand outward
    for (let radius = 1; radius < 10; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                // Only check cells at the current radius (perimeter)
                if (Math.abs(dx) === radius || Math.abs(dz) === radius) {
                    const x = gridX + dx;
                    const z = gridZ + dz;
                    
                    // Check if coordinates are valid
                    if (x >= 0 && x < navigationGrid[0].length && 
                        z >= 0 && z < navigationGrid.length) {
                        // If this cell is walkable, return it
                        if (navigationGrid[z][x].walkable) {
                            return navigationGrid[z][x];
                        }
                    }
                }
            }
        }
    }
    
    return null; // No walkable node found within search radius
}

// Find the nearest waypoint to a given position
function findNearestWaypoint(x, z) {
    if (waypoints.length === 0) {
        return null;
    }
    
    let nearestWaypoint = waypoints[0];
    let minDistance = distanceSquared(x, z, waypoints[0].x, waypoints[0].z);
    
    for (let i = 1; i < waypoints.length; i++) {
        const distance = distanceSquared(x, z, waypoints[i].x, waypoints[i].z);
        if (distance < minDistance) {
            minDistance = distance;
            nearestWaypoint = waypoints[i];
        }
    }
    
    return nearestWaypoint;
}

// Helper function for squared distance (faster than square root)
function distanceSquared(x1, z1, x2, z2) {
    return (x1 - x2) * (x1 - x2) + (z1 - z2) * (z1 - z2);
}

// Helper function for distance
function distance(x1, z1, x2, z2) {
    return Math.sqrt(distanceSquared(x1, z1, x2, z2));
}

// Handle mouse down event - start projecting rays (left click only)
function onMouseDown(event) {
    if (event.button !== 0) return; // Left click = scanner
    if (controls.isLocked && gameState === "PLAYING") {
        isClicking = true;
        // Directly project a ray rather than starting an interval
        projectRay();
        
        // Play electrical hum sound when scanner is active
        if (audioInitialized && electricalHumSound && electricalHumSound.buffer && !electricalHumSound.isPlaying) {
            electricalHumSound.play();
        }
    }
}

// Handle mouse up event - stop projecting rays
function onMouseUp(event) {
    if (event.button !== 0) return;
    isClicking = false;
    
    // Stop electrical hum sound when scanner is inactive
    if (audioInitialized && electricalHumSound && electricalHumSound.isPlaying) {
        electricalHumSound.stop();
    }
}

// Project a ray with random 75-degree offset
function projectRay() {
    if (gameState !== "PLAYING" || !isClicking) {
        return;
    }
    
    lastRayTime = performance.now();
    
    // Get camera direction
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    // Create random offset within 75 degrees (37.5 degrees in each direction)
    const randomAngleX = (Math.random() - 0.5) * Math.PI / 2.4; // +/- 37.5 degrees in radians
    const randomAngleY = (Math.random() - 0.5) * Math.PI / 2.4; // +/- 37.5 degrees in radians
    
    // Apply random rotation to direction
    const rayDirection = cameraDirection.clone();
    rayDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngleY);
    rayDirection.applyAxisAngle(new THREE.Vector3(1, 0, 0), randomAngleX);
    rayDirection.normalize();
    
    // Set up raycaster
    raycaster.set(camera.position, rayDirection);
    
    // Max ray distance is 10 meters
    const maxDistance = 10;
    
    // Create a list of all raycastable objects including walls, floor, roof, and enemy if it exists
    const raycastObjects = [...walls, floor, roof];
    if (enemy) raycastObjects.push(enemy);
    
    // Add doors and levers to raycast objects
    raycastObjects.push(...doors);
    raycastObjects.push(...levers);
    
    // Check for intersections with all objects
    const intersects = raycaster.intersectObjects(raycastObjects, true);
    
    if (intersects.length > 0 && intersects[0].distance <= maxDistance) {
        // Get the closest intersection
        const hit = intersects[0];
        
        // Create a second raycaster from the player directly to the hit point to check occlusion
        const hitDirection = hit.point.clone().sub(camera.position).normalize();
        const occlusionRaycaster = new THREE.Raycaster(camera.position, hitDirection);
        
        // Set a small bias to avoid self-intersection
        occlusionRaycaster.params.Line.threshold = 0.01;
        
        // Check for occlusion with walls only
        const blockingObjects = walls;
        const occlusionIntersects = occlusionRaycaster.intersectObjects(blockingObjects, true);
        
        // If there's a closer intersection than our hit point, it means the hit is occluded
        let isOccluded = false;
        
        if (occlusionIntersects.length > 0) {
            // Get distance to the hit point
            const hitDistance = camera.position.distanceTo(hit.point);
            
            // If any object is closer than our hit point (with a small epsilon to account for floating point errors)
            // then our hit point is occluded
            const epsilon = 0.05; // Small tolerance value
            for (const intersection of occlusionIntersects) {
                if (intersection.distance < hitDistance - epsilon) {
                    // This hit is occluded by a wall
                    isOccluded = true;
                    break;
                }
            }
        }
        
        // Only create a dot if the hit point is not occluded
        if (!isOccluded) {
            // Create a dot at the intersection point
            createDot(hit.point, getMaterialType(hit.object));
        }
    }
}

// Determine the material type of the hit object
function getMaterialType(object) {
    // Check if the object or any of its parents has a material property
    let current = object;
    while (current) {
        if (current.userData && current.userData.material) {
            return current.userData.material;
        }
        current = current.parent;
    }
    
    // Default to concrete if no material is specified
    return "concrete";
}

// Create a dim LED-like dot at the specified position
function createDot(position, materialType) {
    // Same colors as original — solid cubes, no glow / no fade
    let colorHex = 0x6fc0ff;
    
    if (materialType === "enemy") {
        colorHex = 0xff0000;
        
        // Play lunasia sound when dot contacts enemy
        if (audioInitialized && lunasiaSound && lunasiaSound.buffer && !lunasiaSound.isPlaying) {
            lunasiaSound.play();
        }
    } else if (materialType === "lever") {
        colorHex = 0xff8000;
    } else if (materialType === "door") {
        const doorObj = doors.find(door => 
            door.userData.material === "door" && 
            door.position.distanceTo(position) < 0.5
        );
        
        if (doorObj && doorObj.userData.active) {
            colorHex = 0x00ff00;
        } else {
            colorHex = 0x6fc0ff;
        }
    }
    
    const index = _dotWriteIndex;
    _dotWriteIndex = (_dotWriteIndex + 1) % maxDots;
    if (_dotActiveCount < maxDots) {
        _dotActiveCount++;
    }
    
    _dotDummy.position.copy(position);
    _dotDummy.scale.set(1, 1, 1);
    _dotDummy.rotation.set(0, 0, 0);
    _dotDummy.updateMatrix();
    dotMesh.setMatrixAt(index, _dotDummy.matrix);
    
    if (typeof dotMesh.setColorAt === 'function') {
        _dotColor.setHex(colorHex);
        dotMesh.setColorAt(index, _dotColor);
        if (dotMesh.instanceColor) {
            dotMesh.instanceColor.needsUpdate = true;
        }
    }
    
    _dotCreationTimes[index] = performance.now();
    dotMesh.count = _dotActiveCount;
    dotMesh.instanceMatrix.needsUpdate = true;
}

// Clear all lidar cubes
function clearAllDots() {
    _dotWriteIndex = 0;
    _dotActiveCount = 0;
    if (_dotCreationTimes) {
        _dotCreationTimes.fill(-Infinity);
    }
    if (dotMesh) {
        dotMesh.count = 0;
        dotMesh.instanceMatrix.needsUpdate = true;
    }
}

// Hide expired cubes; in chase phase, slowly scale-fade over lifetime
function updateDots() {
    if (!dotMesh || _dotActiveCount === 0) return;
    
    const currentTime = performance.now();
    const lifetimeMs = dotLifetime * 1000;
    let needsUpdate = false;
    
    // Cull expired from oldest end of ring
    let i = (_dotActiveCount < maxDots) ? 0 : _dotWriteIndex;
    for (let n = 0; n < _dotActiveCount; n++) {
        const created = _dotCreationTimes[i];
        if (created !== -Infinity && (currentTime - created) > lifetimeMs) {
            _dotDummy.position.set(0, 0, 0);
            _dotDummy.scale.set(0, 0, 0);
            _dotDummy.updateMatrix();
            dotMesh.setMatrixAt(i, _dotDummy.matrix);
            _dotCreationTimes[i] = -Infinity;
            needsUpdate = true;
            i = (i + 1) % maxDots;
        } else {
            break;
        }
    }
    
    // Slow decay fade during chase (every other frame for cost)
    if (dotsDecayEnabled && (Math.floor(currentTime / 32) % 2 === 0)) {
        const limit = (_dotActiveCount < maxDots) ? _dotActiveCount : maxDots;
        for (let idx = 0; idx < limit; idx++) {
            const created = _dotCreationTimes[idx];
            if (created === -Infinity) continue;
            const age = (currentTime - created) / lifetimeMs;
            if (age >= 1) continue;
            const fade = Math.max(0.05, 1 - age);
            dotMesh.getMatrixAt(idx, _dotMatrix);
            _dotDummy.position.setFromMatrixPosition(_dotMatrix);
            _dotDummy.scale.set(fade, fade, fade);
            _dotDummy.rotation.set(0, 0, 0);
            _dotDummy.updateMatrix();
            dotMesh.setMatrixAt(idx, _dotDummy.matrix);
            needsUpdate = true;
        }
    }
    
    if (needsUpdate) {
        dotMesh.instanceMatrix.needsUpdate = true;
    }
}

// Add material type to all walls
function tagWallsWithMaterial() {
    for (const wall of walls) {
        wall.userData.material = "concrete";
        
        // Also tag any children
        if (wall.children) {
            for (const child of wall.children) {
                child.userData.material = "concrete";
            }
        }
    }
}

// Create boundary walls around the map
function createBoundaryWalls(x, z, width, height, wallHeight, material) {
    // North wall (negative Z)
    createBoundaryWall(
        x + width/2, 
        z,
        width, 
        wallHeight, 
        material,
        0
    );
    
    // South wall (positive Z)
    createBoundaryWall(
        x + width/2, 
        z + height,
        width, 
        wallHeight, 
        material,
        Math.PI
    );
    
    // East wall (positive X)
    createBoundaryWall(
        x + width, 
        z + height/2,
        height, 
        wallHeight, 
        material,
        -Math.PI/2
    );
    
    // West wall (negative X)
    createBoundaryWall(
        x, 
        z + height/2,
        height, 
        wallHeight, 
        material,
        Math.PI/2
    );
}

// Create a single boundary wall
function createBoundaryWall(x, z, length, height, material, rotation) {
    const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(length, height),
        material
    );
    wall.position.set(x, height/2, z);
    wall.rotation.y = rotation;
    
    // Add bounding box for collision detection
    const boundingBox = new THREE.Box3().setFromObject(wall);
    wall.userData.boundingBox = boundingBox;
    wall.userData.material = "concrete"; // Tag as concrete material
    
    // Store wall for collision detection
    walls.push(wall);
    scene.add(wall);
    
    return wall;
}

// Create a 2D wall
function createWall(x, z, size, height, material) {
    // Create wall group to help with collision detection
    const wallGroup = new THREE.Group();
    wallGroup.position.set(x, 0, z);
    wallGroup.userData.material = "concrete"; // Tag as concrete material
    
    // Create four wall planes around the cell (more efficient than a box)
    // Vertical walls:
    
    // North wall (negative Z)
    const northWall = new THREE.Mesh(
        new THREE.PlaneGeometry(size, height),
        material
    );
    northWall.position.set(0, height/2, -size/2);
    northWall.rotation.y = 0;
    northWall.userData.material = "concrete"; // Tag as concrete material
    wallGroup.add(northWall);
    
    // South wall (positive Z)
    const southWall = new THREE.Mesh(
        new THREE.PlaneGeometry(size, height),
        material
    );
    southWall.position.set(0, height/2, size/2);
    southWall.rotation.y = Math.PI;
    southWall.userData.material = "concrete"; // Tag as concrete material
    wallGroup.add(southWall);
    
    // East wall (positive X)
    const eastWall = new THREE.Mesh(
        new THREE.PlaneGeometry(size, height),
        material
    );
    eastWall.position.set(size/2, height/2, 0);
    eastWall.rotation.y = -Math.PI/2;
    eastWall.userData.material = "concrete"; // Tag as concrete material
    wallGroup.add(eastWall);
    
    // West wall (negative X)
    const westWall = new THREE.Mesh(
        new THREE.PlaneGeometry(size, height),
        material
    );
    westWall.position.set(-size/2, height/2, 0);
    westWall.rotation.y = Math.PI/2;
    westWall.userData.material = "concrete"; // Tag as concrete material
    wallGroup.add(westWall);
    
    // Add bounding box for collision detection
    const boundingBox = new THREE.Box3().setFromObject(wallGroup);
    wallGroup.userData.boundingBox = boundingBox;
    
    // Store wall for collision detection
    walls.push(wallGroup);
    scene.add(wallGroup);
    
    return wallGroup;
}

// Create a door piece
function createDoor(x, z, size, height, material) {
    // Create a door mesh - make it completely black
    const doorGeometry = new THREE.BoxGeometry(size, height * 0.8, size * 0.3);
    const doorMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000, // Pure black
        opacity: 0.0,
        transparent: true
    });
    
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    
    // Determine the outward direction - doors appear to be on the right side of the map layout
    // So we'll move them 0.5m to the right (positive X)
    const outwardOffset = 0.5;
    door.position.set(x + outwardOffset, height * 0.4, z);
    
    // Add a larger custom bounding box for interaction detection
    const boundingBoxSize = new THREE.Vector3(size * 1.5, height, size * 1.5);
    const boundingBoxCenter = new THREE.Vector3(
        door.position.x, 
        door.position.y, 
        door.position.z
    );
    
    // Create a manually sized bounding box around the door
    const boundingBox = new THREE.Box3();
    boundingBox.setFromCenterAndSize(boundingBoxCenter, boundingBoxSize);
    
    door.userData.boundingBox = boundingBox;
    door.userData.material = "door"; // Tag as door material for scanning
    door.userData.active = false; // Initially not active (locked)
    door.userData.closedPosition = door.position.clone();
    door.userData.closedRotationY = 0;
    
    // Store door for collision detection and state management
    doors.push(door);
    walls.push(door); // Add to walls for collision detection
    scene.add(door);
    
    return door;
}

// Create a lever
function createLever(x, z, size) {
    // Create a platform for the lever
    const platformGeometry = new THREE.BoxGeometry(0.25, 0.05, 0.25);
    const platformMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000, // Pure black
        opacity: 0.0,
        transparent: true
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, 0.025, 0); // Just above the floor
    
    // Create the lever itself
    const leverBaseGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
    const leverBaseMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000, // Pure black
        opacity: 0.0,
        transparent: true
    });
    
    const leverBase = new THREE.Mesh(leverBaseGeometry, leverBaseMaterial);
    leverBase.position.set(0, 0.075, 0); // On top of the platform
    platform.add(leverBase);
    
    // Create the lever handle
    const leverHandleGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8);
    const leverHandleMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000, // Pure black
        opacity: 0.0,
        transparent: true
    });
    
    const leverHandle = new THREE.Mesh(leverHandleGeometry, leverHandleMaterial);
    leverHandle.position.set(0, 0.075, 0);
    leverHandle.rotation.x = Math.PI / 4; // 45-degree angle initially
    leverBase.add(leverHandle);
    
    // Group everything together
    const leverGroup = new THREE.Group();
    leverGroup.add(platform);
    leverGroup.position.set(x, 0, z);
    
    // Set up user data
    leverGroup.userData.material = "lever"; // Tag as lever material for scanning
    leverGroup.userData.active = false; // Initially not active
    leverGroup.userData.handle = leverHandle; // Reference to the handle for animation
    leverGroup.userData.interactionRadius = 1.0; // Increased interaction radius for easier interaction
    
    // Set up bounding sphere for interaction detection - center at the lever's position
    leverGroup.userData.interactionSphere = new THREE.Sphere(
        new THREE.Vector3(x, 0.1, z),
        1.0
    );
    
    // Store lever for interaction checking
    levers.push(leverGroup);
    scene.add(leverGroup);
    
    return leverGroup;
}

// Check for wall collisions with improved sliding behavior
function checkWallCollisions(position, previousPosition, collisionRadius) {
    // Create a bounding sphere around the position
    const boundingSphere = new THREE.Sphere(position.clone(), collisionRadius);
    
    let collision = false;
    
    // Check for collisions with each wall
    for (const wall of walls) {
        // Get the wall's bounding box
        const boundingBox = wall.userData.boundingBox.clone();
        
        // Check if the sphere intersects the box
        if (boundingBox.intersectsSphere(boundingSphere)) {
            collision = true;
            break;
        }
    }
    
    if (collision) {
        // For sliding behavior, try to slide along the wall
        // Try X movement only (keeping Z from previous position)
        const slideX = new THREE.Vector3(
            position.x,
            position.y,
            previousPosition.z
        );
        
        // Test if X-only movement is valid
        const slideSphereX = new THREE.Sphere(slideX, collisionRadius);
        let xCollision = false;
        
        for (const wall of walls) {
            const boundingBox = wall.userData.boundingBox.clone();
            if (boundingBox.intersectsSphere(slideSphereX)) {
                xCollision = true;
                break;
            }
        }
        
        // Try Z movement only (keeping X from previous position)
        const slideZ = new THREE.Vector3(
            previousPosition.x,
            position.y,
            position.z
        );
        
        // Test if Z-only movement is valid
        const slideSphereZ = new THREE.Sphere(slideZ, collisionRadius);
        let zCollision = false;
        
        for (const wall of walls) {
            const boundingBox = wall.userData.boundingBox.clone();
            if (boundingBox.intersectsSphere(slideSphereZ)) {
                zCollision = true;
                break;
            }
        }
        
        // Return resulting position based on collision tests
        if (!xCollision) {
            return slideX;
        } else if (!zCollision) {
            return slideZ;
        } else {
            // Both directions blocked, revert to previous position
            return previousPosition.clone();
        }
    }
    
    // No collision, return original position
    return position.clone();
}

// Handle keyboard inputs
function onKeyDown(event) {
    if (gameState !== "PLAYING") return;
    
    switch (event.code) {
        case 'KeyW': // SWAPPED: Now moves backward
            moveBackward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyS': // SWAPPED: Now moves forward
            moveForward = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            sprint = true;
            break;
        case 'KeyH':
            toggleControlsHelp();
            break;
        case 'KeyE':
            // Interact: levers (press) or grab/drag green doors
            if (!interactKeyPressed) {
                interactKeyPressed = true;
                checkLeverInteraction();
                if (doorActivated && !activeLever) {
                    tryStartDoorDrag();
                }
            }
            break;
    }
}

function onKeyUp(event) {
    // Add check to only process key up events during gameplay
    if (gameState !== "PLAYING") return;
    
    switch (event.code) {
        case 'KeyW': // SWAPPED: Now moves backward
            moveBackward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyS': // SWAPPED: Now moves forward
            moveForward = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            sprint = false;
            break;
        case 'KeyE':
            interactKeyPressed = false;
            if (activeLever) {
                resetLeverActivation();
            }
            stopDoorDrag();
            break;
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    const delta = (currentTime - prevTime) / 1000; // Convert to seconds
    
    // Update total game time only if game is running
    if (gameState === "PLAYING") {
        totalGameTime += currentTime - prevTime;
        
        // Check for dialogues that should be triggered
        checkScheduledDialogues();
    }
    
    prevTime = currentTime;
    
    // Only process game logic if in PLAYING state
    if (gameState === "PLAYING") {
        // Periodically clean up pathfinding cache
        if (currentTime % 30000 < 100) { // Every 30 seconds
            cleanupPathfindingCache();
        }
        
        // Project rays — previous 6/frame; +100% => 12/frame
        if (isClicking) {
            for (let r = 0; r < 12; r++) {
                projectRay();
            }
            
            // Local LIDAR noise pulses while scanning (chase phase)
            if (gamePhase === "chase" && currentTime - lastLidarSoundTime > 200) {
                lastLidarSoundTime = currentTime;
                emitPlayerSound("lidar", false);
            }
        }
        
        // Update enemy if it exists
        if (enemy) {
            updateEnemy();
        }
        
        // FIX: Completely remove gravity and Y-axis movement to eliminate camera trembling
        // We'll fix the camera at exactly the eye level height
        camera.position.y = 1.7;
        velocity.y = 0;
        
        // Calculate movement direction based on camera rotation and input
        direction.x = 0;
        direction.z = 0;
        
        if (moveForward) direction.z = -1;
        if (moveBackward) direction.z = 1;
        if (moveLeft) direction.x = -1;
        if (moveRight) direction.x = 1;
        
        // Normalize direction vector to ensure consistent speed in all directions
        if (direction.x !== 0 || direction.z !== 0) {
            direction.normalize();
        }
        
        // Apply camera rotation to direction vector
        if (direction.x !== 0 || direction.z !== 0) {
            // Get camera direction
            const cameraDirection = new THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(camera.quaternion);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            // Get right vector (perpendicular to forward vector)
            const rightVector = new THREE.Vector3(1, 0, 0);
            rightVector.applyQuaternion(camera.quaternion);
            rightVector.y = 0;
            rightVector.normalize();
            
            // Calculate movement vector based on camera orientation
            const moveX = direction.x * rightVector.x + direction.z * cameraDirection.x;
            const moveZ = direction.x * rightVector.z + direction.z * cameraDirection.z;
            
            direction.x = moveX;
            direction.z = moveZ;
            direction.normalize();
        }
        
        // Check if player is moving
        isMoving = moveForward || moveBackward || moveLeft || moveRight;
        
        // Walk / run loops — only while actually moving
        updatePlayerMovementAudio(isMoving, sprint);
        
        if (isMoving && gamePhase === "chase") {
            if (currentTime - lastFootstepTime > footstepInterval) {
                emitPlayerSound(sprint ? "run" : "walk", false);
                lastFootstepTime = currentTime;
            }
        }
        
        // Apply smoother movement acceleration/deceleration
        const baseSpeed = 2.5; // Base movement speed
        const sprintMultiplier = sprint ? 2.0 : 1.0; // Sprint doubles the speed
        const speed = baseSpeed * sprintMultiplier;
        const acceleration = 10.0;
        const friction = 10.0;
        
        // Adjust hearing pulse interval based on sprint
        footstepInterval = sprint ? 220 : 380;
        
        // Calculate target velocity
        const targetVelocityX = direction.x * speed * delta;
        const targetVelocityZ = direction.z * speed * delta;
        
        // Apply acceleration or friction
        if (isMoving) {
            velocity.x = THREE.MathUtils.lerp(velocity.x, targetVelocityX, acceleration * delta);
            velocity.z = THREE.MathUtils.lerp(velocity.z, targetVelocityZ, acceleration * delta);
        } else {
            // Apply friction when not pressing movement keys
            velocity.x = THREE.MathUtils.lerp(velocity.x, 0, friction * delta);
            velocity.z = THREE.MathUtils.lerp(velocity.z, 0, friction * delta);
        }
        
        // Update camera position based on velocity (with improved collision detection for sliding)
        if (controls.isLocked) {
            // Store current position before movement
            const previousPosition = camera.position.clone();
            
            // Apply velocity directly instead of using translateX/Z to avoid orientation issues
            camera.position.x += velocity.x;
            camera.position.z += velocity.z;
            
            // Check for collisions and apply sliding behavior
            const adjustedPosition = checkWallCollisions(
                camera.position.clone(),
                previousPosition,
                collisionDistance
            );
            
            // Apply the corrected position
            camera.position.copy(adjustedPosition);
            
            // Update lever activation if needed
            if (activeLever && interactKeyPressed) {
                updateLeverActivation();
            }
            
            // Update door drag while holding E
            if (isDraggingDoor && interactKeyPressed) {
                updateDoorDragProximity();
            }
            
            // Sliding door physics (inertia / friction)
            updateDoorPhysics(delta);
            
            // After the tutorial door is open, start second half when found
            if (doorsFullyOpen && !secondHalfStarted) {
                checkTutorialExitForLunasia();
            }
        }
        
        // Lunasia audio + AI
        if (enemy) {
            updateLunasiaWalkAudio();
        }
    }
    
    // Update the dots (fading over time) regardless of game state
    updateDots();
    
    // Render the scene
    renderer.render(scene, camera);
}

function updatePlayerMovementAudio(moving, isSprinting) {
    if (!audioInitialized) return;
    
    try {
        if (!moving) {
            if (walkSound && walkSound.isPlaying) walkSound.stop();
            if (runSound && runSound.isPlaying) runSound.stop();
            return;
        }
        
        if (isSprinting) {
            if (walkSound && walkSound.isPlaying) walkSound.stop();
            if (runSound && runSound.buffer && !runSound.isPlaying) runSound.play();
        } else {
            if (runSound && runSound.isPlaying) runSound.stop();
            if (walkSound && walkSound.buffer && !walkSound.isPlaying) walkSound.play();
        }
    } catch (e) {
        console.warn("Movement audio error:", e);
    }
}

function tileDistanceXZ(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz) / gridCellSize;
}

function worldToGrid(x, z) {
    if (!navigationGrid.length) return { x: 0, z: 0 };
    const gw = navigationGrid[0].length;
    const gh = navigationGrid.length;
    return {
        x: Math.round((x + gw * gridCellSize / 2) / gridCellSize),
        z: Math.round((z + gh * gridCellSize / 2) / gridCellSize)
    };
}

function gridToWorld(gx, gz) {
    if (!navigationGrid.length || !navigationGrid[gz] || !navigationGrid[gz][gx]) {
        return { x: 0, z: 0 };
    }
    return {
        x: navigationGrid[gz][gx].worldX,
        z: navigationGrid[gz][gx].worldZ
    };
}

function pickRandomWalkableWorldPos(area) {
    if (!navigationGrid.length) return null;
    const gh = navigationGrid.length;
    const gw = navigationGrid[0].length;
    let minX = 0, maxX = gw - 1, minZ = 0, maxZ = gh - 1;
    if (area) {
        minX = Math.max(0, area.minX);
        maxX = Math.min(gw - 1, area.maxX);
        minZ = Math.max(0, area.minZ);
        maxZ = Math.min(gh - 1, area.maxZ);
    }
    for (let attempt = 0; attempt < 40; attempt++) {
        const gx = minX + Math.floor(Math.random() * (maxX - minX + 1));
        const gz = minZ + Math.floor(Math.random() * (maxZ - minZ + 1));
        if (navigationGrid[gz] && navigationGrid[gz][gx] && navigationGrid[gz][gx].walkable) {
            return { x: navigationGrid[gz][gx].worldX, z: navigationGrid[gz][gx].worldZ };
        }
    }
    return null;
}

function createSearchAreaContainingPlayer(sizeTiles) {
    const pg = worldToGrid(camera.position.x, camera.position.z);
    const ox = Math.floor(Math.random() * sizeTiles);
    const oz = Math.floor(Math.random() * sizeTiles);
    return {
        minX: pg.x - ox,
        maxX: pg.x - ox + sizeTiles - 1,
        minZ: pg.z - oz,
        maxZ: pg.z - oz + sizeTiles - 1,
        size: sizeTiles,
        lastUpdate: performance.now()
    };
}

function playerInSearchArea(area) {
    if (!area) return false;
    const pg = worldToGrid(camera.position.x, camera.position.z);
    return pg.x >= area.minX && pg.x <= area.maxX && pg.z >= area.minZ && pg.z <= area.maxZ;
}

function lunasiaInSearchArea(area) {
    if (!area || !enemy) return false;
    const eg = worldToGrid(enemy.position.x, enemy.position.z);
    return eg.x >= area.minX && eg.x <= area.maxX && eg.z >= area.minZ && eg.z <= area.maxZ;
}

// Notify Lunasia of a sound. Global = exact player pos for 1.5s. Local = K/C/V ranges.
function emitPlayerSound(kind, isGlobal) {
    if (!enemy || !lunasiaAI || gamePhase !== "chase") return;
    
    const now = performance.now();
    
    if (isGlobal) {
        lunasiaAI.exactKnowUntil = now + 1500;
        lunasiaAI.lastKnownPos = { x: camera.position.x, z: camera.position.z };
        lunasiaAI.searchArea = null;
        lunasiaAI.knowledge = "exact";
        lunasiaAI.behavior = "move";
        lunasiaAI.noiseLevel = 1.0;
        currentPath = [];
        return;
    }
    
    const dist = tileDistanceXZ(
        enemy.position.x, enemy.position.z,
        camera.position.x, camera.position.z
    );
    
    let known = 5, clouded = 10, vague = 15;
    if (kind === "run") {
        known = 10; clouded = 20; vague = 30;
    } else if (kind === "lidar") {
        known = 3; clouded = 7; vague = 11;
    } else if (kind === "walk") {
        known = 5; clouded = 10; vague = 15;
    }
    
    if (dist <= known) {
        lunasiaAI.exactKnowUntil = Math.max(lunasiaAI.exactKnowUntil, now + 200);
        lunasiaAI.lastKnownPos = { x: camera.position.x, z: camera.position.z };
        lunasiaAI.searchArea = null;
        lunasiaAI.knowledge = "exact";
        lunasiaAI.behavior = "move";
        lunasiaAI.noiseLevel = 1.0;
    } else if (dist <= clouded) {
        const needNew = !lunasiaAI.searchArea ||
            lunasiaAI.searchArea.size !== 7 ||
            !playerInSearchArea(lunasiaAI.searchArea) ||
            (now - lunasiaAI.searchArea.lastUpdate > 2000);
        if (needNew) {
            lunasiaAI.searchArea = createSearchAreaContainingPlayer(7);
            lunasiaAI.searchArea.updateInterval = 2000;
        }
        lunasiaAI.knowledge = "clouded";
        lunasiaAI.behavior = "move";
        lunasiaAI.noiseLevel = 1.0;
        lunasiaAI.lastKnownPos = null;
    } else if (dist <= vague) {
        const needNew = !lunasiaAI.searchArea ||
            lunasiaAI.searchArea.size !== 20 ||
            !playerInSearchArea(lunasiaAI.searchArea) ||
            (now - lunasiaAI.searchArea.lastUpdate > 5000);
        if (needNew) {
            lunasiaAI.searchArea = createSearchAreaContainingPlayer(20);
            lunasiaAI.searchArea.updateInterval = 5000;
        }
        lunasiaAI.knowledge = "vague";
        lunasiaAI.behavior = "move";
        lunasiaAI.noiseLevel = 1.0;
        lunasiaAI.lastKnownPos = null;
    }
}

function updateLunasiaWalkAudio() {
    if (!audioInitialized || !lunasiaWalkSound || !lunasiaWalkSound.buffer || !enemy || !lunasiaAI) return;
    
    const dist = tileDistanceXZ(
        enemy.position.x, enemy.position.z,
        camera.position.x, camera.position.z
    );
    const noise = lunasiaAI.noiseLevel; // 0.5 search, 1.0 move
    const fullRange = 10 * noise;
    const zeroRange = 15 * noise;
    
    let vol = 0;
    if (dist <= fullRange) {
        vol = 0.65;
    } else if (dist < zeroRange) {
        vol = 0.65 * (1 - (dist - fullRange) / (zeroRange - fullRange));
    }
    
    lunasiaWalkSound.setVolume(Math.max(0, vol));
    
    if (vol > 0.02) {
        if (!lunasiaWalkSound.isPlaying) lunasiaWalkSound.play();
    } else if (lunasiaWalkSound.isPlaying) {
        lunasiaWalkSound.stop();
    }
}

// Create a rectangular enemy entity
function createEnemy() {
    const width = 0.8;
    const height = 1.6;
    const depth = 0.8;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 0.0,
        transparent: true
    });
    
    enemy = new THREE.Mesh(geometry, material);
    enemy.position.set(0, height / 2, 0);
    
    lastEnemyPosition.copy(enemy.position);
    lastEnemyMoveTime = performance.now();
    
    scene.add(enemy);
    
    enemy.userData.boundingBox = new THREE.Box3().setFromObject(enemy);
    enemy.userData.material = "enemy";
    
    lunasiaAI = {
        behavior: "search", // search | move
        noiseLevel: 0.5,
        exactKnowUntil: 0,
        lastKnownPos: null,
        searchArea: null,
        knowledge: null,
        patrolTarget: null
    };
    
    currentPath = [];
    // Begin searching immediately — no player knowledge
    pickNewSearchTarget();
}

function pickNewSearchTarget(area) {
    const pos = pickRandomWalkableWorldPos(area || null);
    if (pos && lunasiaAI) {
        lunasiaAI.patrolTarget = pos;
    }
}

// Find the best waypoint that has line of sight to the player
function findWaypointWithLineOfSightToPlayer() {
    // Initialize best waypoint and min distance
    let bestWaypoint = null;
    let minDistance = Infinity;
    
    // Check each waypoint
    for (const waypoint of waypoints) {
        // Create a ray from waypoint to player
        const direction = new THREE.Vector3(
            camera.position.x - waypoint.x,
            0, // Keep on the same Y level
            camera.position.z - waypoint.z
        ).normalize();
        
        // Set up raycaster from waypoint position toward player
        const waypointPos = new THREE.Vector3(
            waypoint.x, 
            1.0, // At roughly eye level
            waypoint.z
        );
        raycaster.set(waypointPos, direction);
        
        // Get distance from waypoint to player
        const distanceToPlayer = new THREE.Vector3(
            camera.position.x - waypoint.x,
            0,
            camera.position.z - waypoint.z
        ).length();
        
        // Check for intersections with walls
        const intersects = raycaster.intersectObjects(walls, true);
        
        // If we have clear line of sight to player from this waypoint
        if (intersects.length === 0 || intersects[0].distance > distanceToPlayer) {
            // Calculate total path distance (from enemy to waypoint + from waypoint to player)
            const distanceFromEnemyToWaypoint = distance(
                enemy.position.x, enemy.position.z,
                waypoint.x, waypoint.z
            );
            
            const totalDistance = distanceFromEnemyToWaypoint + distanceToPlayer;
            
            // If this waypoint offers a shorter path, update our best waypoint
            if (totalDistance < minDistance) {
                minDistance = totalDistance;
                bestWaypoint = waypoint;
            }
        }
    }
    
    return bestWaypoint;
}

// Update enemy position and check for collision with player
function updateEnemy() {
    if (!enemy || !lunasiaAI) return;
    
    const currentTime = performance.now();
    const enemyPos = enemy.position;
    
    // Stuck recovery
    const lastPos = lastEnemyPosition;
    const hasMoved = Math.abs(lastPos.x - enemyPos.x) > 0.001 || Math.abs(lastPos.z - enemyPos.z) > 0.001;
    if (!hasMoved && currentTime - lastEnemyMoveTime > stuckCheckInterval) {
        const nearestWaypoint = findNearestWaypoint(enemyPos.x, enemyPos.z);
        if (nearestWaypoint) {
            enemyPos.set(nearestWaypoint.x, enemyPos.y, nearestWaypoint.z);
            enemy.userData.boundingBox.setFromObject(enemy);
            currentPath = [];
            lastEnemyPosition.copy(enemyPos);
            lastEnemyMoveTime = currentTime;
            return;
        }
    }
    if (hasMoved) {
        lastEnemyPosition.copy(enemyPos);
        lastEnemyMoveTime = currentTime;
    }
    
    // Exact knowledge window from global / known-range sounds
    const hasExact = currentTime < lunasiaAI.exactKnowUntil;
    if (hasExact) {
        lunasiaAI.lastKnownPos = { x: camera.position.x, z: camera.position.z };
        lunasiaAI.behavior = 'move';
        lunasiaAI.noiseLevel = 1.0;
        lunasiaAI.searchArea = null;
        lunasiaAI.knowledge = 'exact';
    } else if (lunasiaAI.knowledge === 'exact' && lunasiaAI.lastKnownPos) {
        // 1.5s expired — keep last known as investigate target
        lunasiaAI.knowledge = 'lastKnown';
        lunasiaAI.behavior = 'move';
        lunasiaAI.noiseLevel = 1.0;
    }
    
    // Refresh clouded/vague areas on interval or if player left
    if (lunasiaAI.searchArea && !hasExact) {
        const area = lunasiaAI.searchArea;
        const interval = area.updateInterval || (area.size === 7 ? 2000 : 5000);
        if (!playerInSearchArea(area) || (currentTime - area.lastUpdate > interval)) {
            // Only refresh if we still have that tier of info — otherwise fall to search
            if (lunasiaAI.knowledge === 'clouded' || lunasiaAI.knowledge === 'vague') {
                lunasiaAI.searchArea = createSearchAreaContainingPlayer(area.size);
                lunasiaAI.searchArea.updateInterval = interval;
            }
        }
    }
    
    // Decide chase target
    let target = null;
    if (hasExact || lunasiaAI.knowledge === 'exact') {
        target = { x: camera.position.x, z: camera.position.z };
        lunasiaAI.behavior = 'move';
        lunasiaAI.noiseLevel = 1.0;
    } else if (lunasiaAI.lastKnownPos && lunasiaAI.knowledge === 'lastKnown') {
        target = lunasiaAI.lastKnownPos;
        lunasiaAI.behavior = 'move';
        lunasiaAI.noiseLevel = 1.0;
        const d = distance(enemyPos.x, enemyPos.z, target.x, target.z);
        if (d < 1.0) {
            // Reached last known — resume random search
            lunasiaAI.lastKnownPos = null;
            lunasiaAI.knowledge = null;
            lunasiaAI.behavior = 'search';
            lunasiaAI.noiseLevel = 0.5;
            pickNewSearchTarget();
            target = lunasiaAI.patrolTarget;
        }
    } else if (lunasiaAI.searchArea) {
        lunasiaAI.behavior = 'move';
        lunasiaAI.noiseLevel = 1.0;
        if (!lunasiaInSearchArea(lunasiaAI.searchArea)) {
            // Path into the area (center-ish)
            const cx = (lunasiaAI.searchArea.minX + lunasiaAI.searchArea.maxX) / 2;
            const cz = (lunasiaAI.searchArea.minZ + lunasiaAI.searchArea.maxZ) / 2;
            const w = gridToWorld(Math.round(cx), Math.round(cz));
            target = w;
        } else {
            // Inside area — search within it
            lunasiaAI.behavior = 'search';
            lunasiaAI.noiseLevel = 0.5;
            if (!lunasiaAI.patrolTarget) pickNewSearchTarget(lunasiaAI.searchArea);
            target = lunasiaAI.patrolTarget;
        }
    } else {
        // Pure search — no intel
        lunasiaAI.behavior = 'search';
        lunasiaAI.noiseLevel = 0.5;
        if (!lunasiaAI.patrolTarget) pickNewSearchTarget();
        target = lunasiaAI.patrolTarget;
    }
    
    // Recalculate path periodically or when empty
    if (target && (currentPath.length === 0 || currentTime - pathUpdateTime > pathUpdateInterval)) {
        currentPath = findPath(enemyPos.x, enemyPos.z, target.x, target.z);
        if (currentPath.length === 0) {
            currentPath = [{ x: target.x, z: target.z }];
        }
        pathUpdateTime = currentTime;
    }
    
    // Follow path
    if (currentPath.length > 0) {
        const wp = currentPath[0];
        const dx = wp.x - enemyPos.x;
        const dz = wp.z - enemyPos.z;
        const distWp = Math.sqrt(dx * dx + dz * dz);
        
        if (distWp < 0.35) {
            currentPath.shift();
            if (currentPath.length === 0 && lunasiaAI.behavior === 'search') {
                pickNewSearchTarget(lunasiaAI.searchArea);
                currentPath = [];
                pathUpdateTime = 0;
            }
        } else {
            const inv = 1 / distWp;
            const speed = lunasiaAI.behavior === 'move' ? 0.0325 : 0.024;
            const previousPosition = (_tempVector3 || (_tempVector3 = new THREE.Vector3())).copy(enemyPos);
            enemyPos.x += dx * inv * speed;
            enemyPos.z += dz * inv * speed;
            const adjusted = checkWallCollisions(enemyPos.clone(), previousPosition, 0.4);
            enemyPos.copy(adjusted);
        }
    }
    
    enemy.userData.boundingBox.setFromObject(enemy);
    
    const playerPos = (_tempVector3_2 || (_tempVector3_2 = new THREE.Vector3())).copy(camera.position);
    const playerBoundingSphere = (_tempSphere || (_tempSphere = new THREE.Sphere()));
    playerBoundingSphere.center.copy(playerPos);
    playerBoundingSphere.radius = collisionDistance;
    
    if (enemy.userData.boundingBox.intersectsSphere(playerBoundingSphere)) {
        gameOver();
    }
}

// Declare reusable temporary variables to avoid garbage collection
let _tempVector3 = null;
let _tempVector3_2 = null;
let _tempSphere = null;

// Check if there is a direct line of sight from enemy to player
function checkLineOfSightToPlayer() {
    if (!enemy) return false;
    
    // Use raycasting for a more accurate line of sight check
    // Create a ray from enemy to player
    const direction = new THREE.Vector3(
        camera.position.x - enemy.position.x,
        0, // Keep on the same Y level
        camera.position.z - enemy.position.z
    ).normalize();
    
    // Set up raycaster from enemy position toward player
    const enemyPos = new THREE.Vector3(
        enemy.position.x, 
        1.0, // At roughly eye level
        enemy.position.z
    );
    raycaster.set(enemyPos, direction);
    
    // Get distance to player
    const distanceToPlayer = new THREE.Vector3(
        camera.position.x - enemy.position.x,
        0,
        camera.position.z - enemy.position.z
    ).length();
    
    // Check for intersections with walls
    const intersects = raycaster.intersectObjects(walls, true);
    
    // If we hit something and it's closer than the player, there's no line of sight
    if (intersects.length > 0 && intersects[0].distance < distanceToPlayer) {
        return false;
    }
    
    // No obstructions found - we have direct line of sight
    return true;
}

// Game over state
function gameOver() {
    console.log("Game Over!");
    gameState = "GAME_OVER";
    controls.unlock();
    
    // Stop all sounds
    if (audioInitialized) {
        if (electricalHumSound && electricalHumSound.isPlaying) electricalHumSound.stop();
        if (lunasiaSound && lunasiaSound.isPlaying) lunasiaSound.stop();
        if (walkSound && walkSound.isPlaying) walkSound.stop();
        if (runSound && runSound.isPlaying) runSound.stop();
        if (lunasiaWalkSound && lunasiaWalkSound.isPlaying) lunasiaWalkSound.stop();
    }
    
    showGameOverScreen();
}

// A* search algorithm implementation with waypoint heuristics
function aStarSearch(startNode, targetNode) {
    // Use a cache key based on start/target coordinates
    const cacheKey = `${startNode.x},${startNode.z}-${targetNode.x},${targetNode.z}`;
    if (pathfindingCache[cacheKey]) {
        // Return cached path if available
        return JSON.parse(JSON.stringify(pathfindingCache[cacheKey]));
    }
    
    const openSet = [];
    const closedSet = new Set(); // Using Set for faster lookups
    
    // Add start node to open set
    startNode.f = 0;
    startNode.g = 0;
    startNode.h = 0;
    startNode.parent = null;
    openSet.push(startNode);
    
    let iterations = 0; // Track iterations for early termination
    
    while (openSet.length > 0 && iterations < maxPathfindingIterations) {
        iterations++;
        
        // Find node with lowest f cost - use a more efficient method
        let lowestIndex = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        
        const currentNode = openSet[lowestIndex];
        
        // Early exit if we're close enough to the target
        const distToTarget = distance(
            currentNode.worldX, currentNode.worldZ,
            targetNode.worldX, targetNode.worldZ
        );
        if (distToTarget < 0.5 || currentNode === targetNode) {
            // Reconstruct path and cache it
            const path = reconstructPath(currentNode);
            pathfindingCache[cacheKey] = JSON.parse(JSON.stringify(path));
            return path;
        }
        
        // Remove current node from open set
        openSet.splice(lowestIndex, 1);
        closedSet.add(`${currentNode.x},${currentNode.z}`);
        
        // Get neighbors more efficiently
        const neighbors = getNeighbors(currentNode);
        
        for (const neighbor of neighbors) {
            // Skip if neighbor is in closed set - faster lookup with Set
            if (closedSet.has(`${neighbor.x},${neighbor.z}`)) {
                continue;
            }
            
            // Calculate g score
            const tentativeG = currentNode.g + distance(
                currentNode.worldX, currentNode.worldZ, 
                neighbor.worldX, neighbor.worldZ
            );
            
            // Find if neighbor is in open set
            let neighborIndex = -1;
            for (let i = 0; i < openSet.length; i++) {
                if (openSet[i].x === neighbor.x && openSet[i].z === neighbor.z) {
                    neighborIndex = i;
                    break;
                }
            }
            
            if (neighborIndex === -1) {
                // Not in open set, add it
                neighbor.g = tentativeG;
                neighbor.h = heuristic(neighbor, targetNode);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = currentNode;
                openSet.push(neighbor);
            } else if (tentativeG < openSet[neighborIndex].g) {
                // Better path to neighbor
                openSet[neighborIndex].g = tentativeG;
                openSet[neighborIndex].f = tentativeG + openSet[neighborIndex].h;
                openSet[neighborIndex].parent = currentNode;
            }
        }
    }
    
    console.log(`A* search terminated after ${iterations} iterations without finding path`);
    return []; // No path found or too many iterations
}

// Helper function to reconstruct path
function reconstructPath(node) {
    const path = [];
    let current = node;
    
    while (current) {
        path.push({
            x: current.worldX,
            z: current.worldZ
        });
        current = current.parent;
    }
    
    // Simplify path to reduce unnecessary waypoints
    const simplifiedPath = simplifyPath(path.reverse());
    return simplifiedPath;
}

// Simple heuristic function for A*
function heuristic(a, b) {
    // Direct distance (Euclidean) plus a small bias to improve direction
    return distance(a.worldX, a.worldZ, b.worldX, b.worldZ) * 1.1;
}

// Simplify path by removing redundant waypoints
function simplifyPath(path) {
    if (path.length <= 2) return path;
    
    const simplified = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
        const prev = simplified[simplified.length - 1];
        const current = path[i];
        const next = path[i + 1];
        
        // Check if current point is necessary based on angle and distance
        const d1 = distance(prev.x, prev.z, current.x, current.z);
        const d2 = distance(current.x, current.z, next.x, next.z);
        const d3 = distance(prev.x, prev.z, next.x, next.z);
        
        // If going directly from prev to next isn't much longer than using the waypoint,
        // skip the current waypoint
        if (d3 <= d1 + d2 + pathSimplificationThreshold) {
            continue;
        }
        
        simplified.push(current);
    }
    
    simplified.push(path[path.length - 1]);
    return simplified;
}

// Implement cache management - call this periodically to prevent memory bloat
function cleanupPathfindingCache() {
    // If cache grows too large, reset it
    if (Object.keys(pathfindingCache).length > 200) {
        console.log("Cleaning pathfinding cache");
        pathfindingCache = {};
    }
}

// Get walkable neighbors for a node - re-implemented to avoid the Reference Error
function getNeighbors(node) {
    const neighbors = [];
    const directions = [
        {dx: 0, dz: -1},  // North
        {dx: 1, dz: 0},   // East
        {dx: 0, dz: 1},   // South
        {dx: -1, dz: 0},  // West
        // Diagonals
        {dx: 1, dz: -1},  // Northeast
        {dx: 1, dz: 1},   // Southeast
        {dx: -1, dz: 1},  // Southwest
        {dx: -1, dz: -1}  // Northwest
    ];
    
    for (const dir of directions) {
        const x = node.x + dir.dx;
        const z = node.z + dir.dz;
        
        // Check if within grid bounds
        if (x >= 0 && x < navigationGrid[0].length && z >= 0 && z < navigationGrid.length) {
            // Check if walkable
            const neighbor = navigationGrid[z][x];
            if (neighbor.walkable) {
                // Additional check for diagonal movement - make sure both adjacent cells are walkable
                if (dir.dx !== 0 && dir.dz !== 0) {
                    // For diagonals, check if we can move through the corners
                    const canMoveThroughX = navigationGrid[node.z][x].walkable;
                    const canMoveThroughZ = navigationGrid[z][node.x].walkable;
                    
                    if (!canMoveThroughX || !canMoveThroughZ) {
                        continue; // Skip this diagonal if we can't move through the corner
                    }
                }
                
                neighbors.push(neighbor);
            }
        }
    }
    
    return neighbors;
}

// Add lever and door interaction functions after animate() function

// Check if player is near an inactive lever — E activates immediately
function checkLeverInteraction() {
    if (activeLever || !interactKeyPressed) return;
    
    const playerPos = camera.position.clone();
    playerPos.y = 0.1;
    
    for (const lever of levers) {
        if (lever.userData.active) continue;
        
        const leverPos = lever.position.clone();
        const dist = playerPos.distanceTo(leverPos);
        
        if (dist <= 1.2) {
            activeLever = lever;
            if (lever.userData.handle) {
                lever.userData.handle.rotation.x = -Math.PI / 4;
            }
            activateLever();
            break;
        }
    }
}

// Create or update a progress bar for lever activation
function createLeverProgressBar() {
    // Remove existing progress bar if present
    let progressBar = document.getElementById('lever-progress');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'lever-progress';
        progressBar.style.position = 'absolute';
        progressBar.style.bottom = '10%';
        progressBar.style.left = '50%';
        progressBar.style.transform = 'translateX(-50%)';
        progressBar.style.width = '200px';
        progressBar.style.height = '20px';
        progressBar.style.backgroundColor = '#333';
        progressBar.style.border = '2px solid #FFF';
        
        const progressFill = document.createElement('div');
        progressFill.id = 'lever-progress-fill';
        progressFill.style.width = '0%';
        progressFill.style.height = '100%';
        progressFill.style.backgroundColor = '#FF8000';
        
        progressBar.appendChild(progressFill);
        document.body.appendChild(progressBar);
    }
}

// Update lever activation progress (instant E path — no hold bar)
function updateLeverActivation() {
    if (!activeLever || !interactKeyPressed) return;
}

// Reset lever activation
function resetLeverActivation() {
    if (activeLever && activeLever.userData.handle && !activeLever.userData.active) {
        // Reset lever handle rotation
        activeLever.userData.handle.rotation.x = Math.PI / 4;
    }
    
    activeLever = null;
    leverActivationProgress = 0;
    
    // Remove progress bar
    const progressBar = document.getElementById('lever-progress');
    if (progressBar) {
        document.body.removeChild(progressBar);
    }
    
    // Clear subtitle if it was for lever activation
    const subtitle = document.getElementById('subtitle');
    if (subtitle && subtitle.textContent.includes("lever")) {
        document.body.removeChild(subtitle);
    }
}

// Activate the current lever
function activateLever() {
    if (!activeLever) return;
    
    activeLever.userData.active = true;
    
    // Play button click for orange panel interaction
    if (audioInitialized && buttonClickSound && buttonClickSound.buffer) {
        if (buttonClickSound.isPlaying) {
            buttonClickSound.stop();
        }
        buttonClickSound.play();
    }
    
    // Global sound — Lunasia instantly knows player location (chase phase)
    emitPlayerSound("lever", true);
    
    // Remove progress bar
    const progressBar = document.getElementById('lever-progress');
    if (progressBar) {
        document.body.removeChild(progressBar);
    }
    
    // Show success message
    showSubtitle("Lever activated!", 2000);
    
    // Check if all levers are now activated
    checkAllLeversActivated();
    
    activeLever = null;
}

// Check if all levers are activated and unlock doors if so
function checkAllLeversActivated() {
    const allActivated = levers.every(lever => lever.userData.active);
    
    if (allActivated && !doorActivated) {
        doorActivated = true;
        activateAllDoors();
        
        setTimeout(() => {
            showSubtitle("Door unlocked. Hold E and drag with the mouse to open it.", 5000);
            showHelpText("Green objects can be grabbed and dragged with E. Hold E near the door and move the mouse to open it.");
        }, 1500);
    }
}

// Unlock all doors (green / draggable)
function activateAllDoors() {
    for (const door of doors) {
        door.userData.active = true;
        door.material.color.set(0x00ff00);
        door.material.opacity = 0.0;
        door.material.transparent = true;
        door.userData.boundingBox.setFromObject(door);
    }
}

// Begin dragging an unlocked door while holding E nearby
function tryStartDoorDrag() {
    if (!doorActivated || doorsFullyOpen || isDraggingDoor) return;
    
    const playerPos = camera.position.clone();
    const playerBoundingSphere = new THREE.Sphere(playerPos, 2.0);
    
    for (const door of doors) {
        if (!door.userData.active) continue;
        if (door.userData.boundingBox.intersectsSphere(playerBoundingSphere)) {
            isDraggingDoor = true;
            activeDoor = door;
            window.blockPointerLook = true;
            showSubtitle("Drag the mouse to slide the door...", 2500);
            return;
        }
    }
}

function stopDoorDrag() {
    isDraggingDoor = false;
    activeDoor = null;
    window.blockPointerLook = false;
}

function onDoorDragMouseMove(event) {
    if (!isDraggingDoor || !interactKeyPressed || doorsFullyOpen) return;
    
    // Impart sliding velocity (physics object feel)
    const impulse = (event.movementX || 0) * 0.045;
    doorSlideVelocity += impulse;
    doorSlideVelocity = Math.max(-0.35, Math.min(0.35, doorSlideVelocity));
    doorDragOpen += (event.movementX || 0) * 0.012;
    doorDragOpen = Math.max(0, Math.min(doorSlideMax, doorDragOpen));
    applyDoorSlideVisuals();
    
    if (doorDragOpen >= doorSlideMax * 0.85) {
        finishOpeningDoors();
    }
}

function updateDoorPhysics(delta) {
    if (doorsFullyOpen || !doorActivated) return;
    
    // Coast with friction when not held / always integrate velocity
    if (!isDraggingDoor && Math.abs(doorSlideVelocity) > 0.0005) {
        doorDragOpen += doorSlideVelocity * (delta * 60);
        doorSlideVelocity *= Math.pow(0.08, delta); // strong friction
        if (Math.abs(doorSlideVelocity) < 0.001) doorSlideVelocity = 0;
    } else if (isDraggingDoor) {
        doorDragOpen += doorSlideVelocity * (delta * 60) * 0.35;
        doorSlideVelocity *= Math.pow(0.4, delta);
    }
    
    doorDragOpen = Math.max(0, Math.min(doorSlideMax, doorDragOpen));
    applyDoorSlideVisuals();
    
    if (doorDragOpen >= doorSlideMax * 0.85) {
        finishOpeningDoors();
    }
}

function applyDoorSlideVisuals() {
    if (doors.length === 0) return;
    
    // Slide the door panel(s) sideways along +X like a physical sliding door
    for (const door of doors) {
        const closed = door.userData.closedPosition;
        door.position.x = closed.x + doorDragOpen;
        door.position.z = closed.z;
        door.rotation.y = 0;
        door.userData.boundingBox.setFromObject(door);
    }
}

function applyDoorDragVisuals() {
    applyDoorSlideVisuals();
}

function finishOpeningDoors() {
    doorsFullyOpen = true;
    doorDragOpen = doorSlideMax;
    doorSlideVelocity = 0;
    stopDoorDrag();
    applyDoorSlideVisuals();
    walls = walls.filter(w => doors.indexOf(w) === -1);
    showSubtitle("Door open. Step through when you're ready.", 4000);
    showHelpText("Walk up to the open doorway.");
}

function updateDoorDragProximity() {
    if (!isDraggingDoor || !activeDoor) return;
    
    const playerPos = camera.position.clone();
    const playerBoundingSphere = new THREE.Sphere(playerPos, 2.5);
    
    let stillNear = false;
    for (const door of doors) {
        door.userData.boundingBox.setFromObject(door);
        if (door.userData.boundingBox.intersectsSphere(playerBoundingSphere)) {
            stillNear = true;
            break;
        }
    }
    if (!stillNear) {
        stopDoorDrag();
    }
}

function checkTutorialExitForLunasia() {
    if (secondHalfStarted || doors.length === 0) return;
    
    let avgX = 0;
    let avgZ = 0;
    for (const door of doors) {
        avgX += door.userData.closedPosition.x;
        avgZ += door.userData.closedPosition.z;
    }
    avgX /= doors.length;
    avgZ /= doors.length;
    
    const dx = camera.position.x - avgX;
    const dz = camera.position.z - avgZ;
    const nearDoorway = (dx * dx + dz * dz) < (3.2 * 3.2);
    
    if (nearDoorway) {
        beginSecondHalf();
    }
}

function beginSecondHalf() {
    if (secondHalfStarted) return;
    secondHalfStarted = true;
    gamePhase = "chase";
    
    // Reset player to spawn and wipe lidar points
    camera.position.copy(playerSpawnPosition);
    camera.position.y = 1.7;
    velocity.set(0, 0, 0);
    clearAllDots();
    
    // Chase-phase lidar decay
    dotsDecayEnabled = true;
    dotLifetime = 15;
    
    showSubtitle("This time, I'll be searching for you to try and catch you~", 7000);
    showHelpText("Shift is the sprint key. Be careful, it makes a lot of noise.");
    
    setTimeout(() => {
        if (gamePhase === "chase" && gameState === "PLAYING") {
            showHelpText("Your LIDAR Scanner also makes noise.");
        }
    }, 4500);
    
    // Spawn Lunasia in search mode (no player intel)
    if (!lunasiaSpawned) {
        lunasiaSpawned = true;
        createEnemy();
        if (enemy) {
            // Start far from spawn / doorway
            enemy.position.set(0, 0.8, -2);
            enemy.userData.boundingBox.setFromObject(enemy);
            lastEnemyPosition.copy(enemy.position);
            pickNewSearchTarget();
        }
    }
}

function spawnLunasiaInNextRoom(doorX, doorZ) {
    beginSecondHalf();
}

// Legacy hold-F escape replaced by door drag
function checkDoorEscapeCollision() {}
function startDoorEscapeSequence(door) {}
function createDoorEscapeProgressBar() {}
function updateDoorEscapeProgress() {}
function resetDoorEscapeProgress() {
    stopDoorDrag();
}

// Game escape ending
function gameEscape() {
    console.log("Player escaped!");
    gameState = "GAME_OVER";
    controls.unlock();
    
    // Stop all sounds
    if (audioInitialized) {
        if (electricalHumSound && electricalHumSound.isPlaying) electricalHumSound.stop();
        if (lunasiaSound && lunasiaSound.isPlaying) lunasiaSound.stop();
        if (walkSound && walkSound.isPlaying) walkSound.stop();
        if (runSound && runSound.isPlaying) runSound.stop();
        if (lunasiaWalkSound && lunasiaWalkSound.isPlaying) lunasiaWalkSound.stop();
    }
    
    // Show escape screen instead of game over screen
    showEscapeScreen();
}

// Show the escape screen
function showEscapeScreen() {
    const escapeScreen = document.createElement('div');
    escapeScreen.id = 'escape-screen';
    escapeScreen.style.position = 'absolute';
    escapeScreen.style.width = '100%';
    escapeScreen.style.height = '100%';
    escapeScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    escapeScreen.style.top = '0';
    escapeScreen.style.left = '0';
    escapeScreen.style.display = 'flex';
    escapeScreen.style.flexDirection = 'column';
    escapeScreen.style.justifyContent = 'center';
    escapeScreen.style.alignItems = 'center';
    escapeScreen.style.zIndex = '1000';
    escapeScreen.style.fontFamily = '"Courier New", monospace';
    
    const escapeText = document.createElement('h1');
    escapeText.textContent = 'You escaped?';
    escapeText.style.color = '#00AA00'; // Green text for escape message
    escapeText.style.fontSize = '5em';
    escapeText.style.fontWeight = 'bold';
    escapeText.style.marginBottom = '1em';
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Restart';
    restartButton.style.padding = '1em 2em';
    restartButton.style.fontSize = '1.5em';
    restartButton.style.backgroundColor = '#333';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    
    restartButton.addEventListener('click', function() {
        location.reload(); // Simple way to restart the game
    });
    
    escapeScreen.appendChild(escapeText);
    escapeScreen.appendChild(restartButton);
    document.body.appendChild(escapeScreen);
}

// Start the application
init(); 