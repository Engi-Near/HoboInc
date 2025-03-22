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
let dots = []; // Array to store dot objects
let isClicking = false; // Track if mouse is being held down
let raycaster = new THREE.Raycaster(); // Raycaster for projecting rays
let rayInterval; // Interval for ray projection
let lastRayTime = 0; // Time tracking for ray projection rate limiting
let maxDots = 50000; // Increased maximum number of dots due to higher rate
let dotGeometry; // Reusable geometry for dots
let dotLifetime = 30; // Dot lifetime in seconds

// Audio variables
let audioListener = null;
let audioContext = null;
let audioInitialized = false; // Flag to track if audio is initialized
let electricalHumSound;
let lunasiaSound;
let footstepSound;
let waterDripSound;
let isMoving = false;
let lastFootstepTime = 0;
let footstepInterval = 400; // ms between footstep sounds

// Game state variables
let gameState = "LOADING"; // LOADING, PLAYING, PAUSED, GAME_OVER
let gameStartTime = 0;
let totalGameTime = 0; // Track total game time
let pauseStartTime = 0; // Track when the game was paused
let enemy = null;
let subtitle = null;
let subtitleTimeout = null;

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.7; // Eye level height
    
    // Create renderer with optimizations
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        precision: 'mediump', // Better performance than highp
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    document.body.appendChild(renderer.domElement);
    
    // Add lights for white objects
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
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
    
    // Handle ESC key to exit pointer lock
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && controls.isLocked) {
            controls.unlock();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Create reusable geometry for dots - much smaller for tiny LED look
    dotGeometry = new THREE.SphereGeometry(0.003, 8, 8);
    
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
    
    // Load lunasia sound for enemy contacts
    lunasiaSound = new THREE.Audio(audioListener);
    const lunasiaLoader = new THREE.AudioLoader();
    lunasiaLoader.load('Lunasia/lunasia.mp3', function(buffer) {
        lunasiaSound.setBuffer(buffer);
        lunasiaSound.setLoop(false);
        lunasiaSound.setVolume(0.7);
    });
    
    // Load footstep sound for movement
    footstepSound = new THREE.Audio(audioListener);
    const footstepLoader = new THREE.AudioLoader();
    footstepLoader.load('Lunasia/skkfootsteps.mp3', function(buffer) {
        footstepSound.setBuffer(buffer);
        footstepSound.setLoop(false);
        footstepSound.setVolume(0.4);
    });
    
    // Load ambient water drip sound
    waterDripSound = new THREE.Audio(audioListener);
    const waterDripLoader = new THREE.AudioLoader();
    waterDripLoader.load('Lunasia/water_drip.mp3', function(buffer) {
        waterDripSound.setBuffer(buffer);
        waterDripSound.setLoop(true);
        waterDripSound.setVolume(0.3);
        // Start playing ambient sound immediately after loading
        if (gameState === "PLAYING") {
            waterDripSound.play();
        }
    });
}

// Handle audio for game pause/resume
function handleAudioOnPause(isPaused) {
    if (!audioInitialized) return;
    
    if (isPaused) {
        // Pause all sounds when game is paused
        if (electricalHumSound && electricalHumSound.isPlaying) electricalHumSound.pause();
        if (waterDripSound && waterDripSound.isPlaying) waterDripSound.pause();
    } else {
        // Resume ambient sounds when game is resumed
        if (waterDripSound && waterDripSound.buffer && !waterDripSound.isPlaying) waterDripSound.play();
        // Only resume electrical hum if still clicking
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
    
    // Start ambient sound if audio is initialized
    if (audioInitialized && waterDripSound && waterDripSound.buffer && !waterDripSound.isPlaying) {
        waterDripSound.play();
    }
    
    // Show initial message
    showSubtitle("Hello Commander. I was bored, and wanted to play a game with you. Why don't you get yourself acquainted. Look around a little.", 10000);
    
    // Schedule the second message and enemy spawn after 60 seconds
    setTimeout(() => {
        // Only proceed if game is still playing (not paused or game over)
        if (gameState === "PLAYING") {
            showSubtitle("Aww, you look cute down there, getting your bearings. Why don't I join you?", 5000);
            setTimeout(() => {
                if (gameState === "PLAYING") {
                    createEnemy();
                }
            }, 2000);
        }
    }, 60000);
}

// Create a white wireframe box in the player's right hand
function createHandBox() {
    const boxGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.4);
    const edges = new THREE.EdgesGeometry(boxGeometry);
    handBox = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    
    // Position the box to appear in the bottom right of the view
    handBox.position.set(0.4, -0.3, -0.6);
    camera.add(handBox);
    scene.add(camera);
}

// Create the map based on the provided layout
function createMap() {
    // Define the map layout where O is open space and # is a wall
    const mapLayout = [
        "###############################################",
        "#OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO#",
        "#OOOOOO##OOOOOOOOOOOOOOOOOOOOOO##OOOOOOOOOOOOO#",
        "#OOOOOO##OOOOOOOOOOOOOOOOOOOOOO##OOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOOOOOOOOOOOOOO##OOOOOOOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOOOOOOOOOOOOOO##OOOOOOOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOO##OOOOOOOOOOOOOOOOOOOOOOOOOOOOOO#",
        "#OOOOOOOOOOOOO##OOOOOOOOOOOOOOOOOOOOOOOOOOOOOO#",
        "###############################################"
    ];
    
    // Calculate map dimensions
    const mapWidth = mapLayout[0].length;
    const mapHeight = mapLayout.length;
    const cellSize = 1; // 1 meter per cell
    
    // Create floor with invisible but physically raycastable material
    const floorGeometry = new THREE.PlaneGeometry(mapWidth * cellSize, mapHeight * cellSize);
    const floorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, // Black floor
        transparent: true,
        opacity: 0.0 // Make it invisible
    });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.userData.material = "concrete"; // Tag as concrete material for raycasting
    scene.add(floor);
    
    // Grid helper removed - no longer displaying grid
    
    // Wall material - transparent but still physical
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.0, // Completely invisible
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
    
    // Create a roof over the entire map - invisible but raycastable
    const roofGeometry = new THREE.PlaneGeometry(mapWidth * cellSize, mapHeight * cellSize);
    const roofMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, // Black ceiling
        transparent: true,
        opacity: 0.0, // Make it invisible
        side: THREE.DoubleSide
    });
    roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.x = Math.PI / 2; // Rotate to face downward
    roof.position.set(0, wallHeight, 0); // Position at the top of the walls
    roof.userData.material = "concrete"; // Tag as concrete material for raycasting
    scene.add(roof);
    
    // Set initial camera position in an open space
    camera.position.set(offsetX + 2, 1.7, offsetZ + 2);
}

// Handle mouse down event - start projecting rays
function onMouseDown(event) {
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
    isClicking = false;
    
    // Stop electrical hum sound when scanner is inactive
    if (audioInitialized && electricalHumSound && electricalHumSound.isPlaying) {
        electricalHumSound.stop();
    }
}

// Project a ray with random 75-degree offset
function projectRay() {
    // Only project a ray if we're clicking and at the correct interval and game is playing
    const currentTime = performance.now();
    if (gameState !== "PLAYING" || !isClicking || (currentTime - lastRayTime < 1)) {
        return;
    }
    
    lastRayTime = currentTime;
    
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
    
    // Check for intersections with all objects
    const intersects = raycaster.intersectObjects(raycastObjects, true);
    
    if (intersects.length > 0 && intersects[0].distance <= maxDistance) {
        // Create a dot at the intersection point
        createDot(intersects[0].point, getMaterialType(intersects[0].object));
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
    // Base color depends on material type
    let color;
    
    // Red for enemy, blue for concrete
    if (materialType === "enemy") {
        color = new THREE.Color(0xff0000); // Red for enemy
        
        // Play lunasia sound when dot contacts enemy
        if (audioInitialized && lunasiaSound && lunasiaSound.buffer && !lunasiaSound.isPlaying) {
            lunasiaSound.play();
        }
    } else {
        color = new THREE.Color(0x6fc0ff); // Blue for concrete
    }
    
    // If we've reached the maximum number of dots, remove the oldest one
    if (dots.length >= maxDots) {
        const oldestDot = dots.shift(); // Remove the oldest dot
        scene.remove(oldestDot); // Remove it from the scene
        if (oldestDot.userData.brightDot && oldestDot.userData.brightDot.material) {
            oldestDot.userData.brightDot.material.dispose();
        }
        if (oldestDot.userData.glowDot && oldestDot.userData.glowDot.material) {
            oldestDot.userData.glowDot.material.dispose();
        }
    }
    
    // Create the main bright center dot
    const brightMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0
    });
    
    const brightDot = new THREE.Mesh(dotGeometry, brightMaterial);
    brightDot.position.copy(position);
    
    // Create a slightly larger glow around the main dot (1/100th size)
    const glowGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    
    const glowDot = new THREE.Mesh(glowGeometry, glowMaterial);
    glowDot.position.copy(position);
    
    // Create a group to hold both parts
    const dotGroup = new THREE.Group();
    dotGroup.add(brightDot);
    dotGroup.add(glowDot);
    
    // Add creation time for fading
    dotGroup.userData.creationTime = performance.now();
    dotGroup.userData.brightDot = brightDot;
    dotGroup.userData.glowDot = glowDot;
    dotGroup.userData.materialType = materialType;
    
    // Add the dot group to the scene
    scene.add(dotGroup);
    
    // Add to the dots array for managing later
    dots.push(dotGroup);
}

// Update and fade dots - LED-like effect with no pulsing
function updateDots() {
    const currentTime = performance.now();
    const dotsToRemove = [];
    
    for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const brightDot = dot.userData.brightDot;
        const glowDot = dot.userData.glowDot;
        const age = (currentTime - dot.userData.creationTime) / 1000; // age in seconds
        
        if (age > dotLifetime) {
            // Remove dots older than dot lifetime (15 seconds)
            scene.remove(dot);
            dotsToRemove.push(i);
        } else {
            // Calculate fade factor (1 to 0 over dot lifetime)
            const fadeFactor = 1 - age / dotLifetime;
            
            // Apply fade to dot material opacity
            brightDot.material.opacity = fadeFactor;
            glowDot.material.opacity = fadeFactor * 0.5; // Glow is half as bright
        }
    }
    
    // Remove old dots from the array (in reverse order to avoid index issues)
    for (let i = dotsToRemove.length - 1; i >= 0; i--) {
        dots.splice(dotsToRemove[i], 1);
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
    
    // Calculate time delta for smooth movement
    const time = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.1); // Cap delta to prevent large jumps
    
    // Only process game logic if in PLAYING state
    if (gameState === "PLAYING") {
        // Calculate and store the current game time
        totalGameTime = time - gameStartTime;
        
        // Project rays in the animation loop instead of using intervals
        if (isClicking) {
            projectRay();
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
        const wasMoving = isMoving;
        isMoving = moveForward || moveBackward || moveLeft || moveRight;
        
        // Handle footstep sounds
        if (isMoving) {
            // Play footstep sound at intervals
            if (time - lastFootstepTime > footstepInterval) {
                playFootstepSound();
                lastFootstepTime = time;
            }
        }
        
        // Apply smoother movement acceleration/deceleration
        const baseSpeed = 2.5; // Base movement speed
        const sprintMultiplier = sprint ? 2.0 : 1.0; // Sprint doubles the speed
        const speed = baseSpeed * sprintMultiplier;
        const acceleration = 10.0;
        const friction = 10.0;
        
        // Adjust footstep interval based on sprint
        footstepInterval = sprint ? 250 : 400;
        
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
        }
    }
    
    // Update the dots (fading over time) regardless of game state
    updateDots();
    
    prevTime = time;
    
    renderer.render(scene, camera);
}

// Play footstep sound
function playFootstepSound() {
    if (!audioInitialized) return;
    
    try {
        // Make sure we have a valid audio object with buffer
        if (footstepSound && footstepSound.buffer) {
            // First check if the audio is already playing
            if (footstepSound.isPlaying) {
                // If already playing, we'll just skip this footstep
                return;
            }
            
            // Try playing the original footstep sound directly instead of cloning
            // This is safer for GitHub Pages where audio context might be restricted
            footstepSound.play();
            
            // Set a timeout to artificially end the sound earlier
            // This allows multiple footsteps without needing to clone
            setTimeout(() => {
                if (footstepSound && footstepSound.isPlaying) {
                    footstepSound.stop();
                }
            }, 100); // Short duration to allow for rapid footsteps
        }
    } catch (error) {
        console.warn("Error playing footstep sound:", error);
        // Fail silently - footsteps are not critical for gameplay
    }
}

// Create a rectangular enemy entity
function createEnemy() {
    const width = 0.8;
    const height = 1.6;
    const depth = 0.8;
    
    // Create a simple box geometry for the enemy
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color: 0x000000,  // Black color
        transparent: true,
        opacity: 0.0      // Completely invisible
    });
    
    enemy = new THREE.Mesh(geometry, material);
    
    // Position at the center of the map
    enemy.position.set(0, height/2, 0);
    
    // Add to the scene
    scene.add(enemy);
    
    // Create a bounding box for collision detection
    enemy.userData.boundingBox = new THREE.Box3().setFromObject(enemy);
    
    // Set material type for LIDAR detection
    enemy.userData.material = "enemy";
    
    console.log("Enemy created at position:", enemy.position);
}

// Update enemy position and check for collision with player
function updateEnemy() {
    if (!enemy) return;
    
    // Simple movement: move toward the player
    const playerPosition = camera.position.clone();
    const direction = new THREE.Vector3();
    
    // Calculate direction to player (ignoring Y axis)
    direction.subVectors(playerPosition, enemy.position);
    direction.y = 0; // Keep the enemy on the ground
    direction.normalize();
    
    // Move the enemy at a slower speed than the player
    const speed = 0.02;
    enemy.position.x += direction.x * speed;
    enemy.position.z += direction.z * speed;
    
    // Update bounding box
    enemy.userData.boundingBox.setFromObject(enemy);
    
    // Check for collision with player
    const playerBoundingSphere = new THREE.Sphere(camera.position.clone(), collisionDistance);
    
    if (enemy.userData.boundingBox.intersectsSphere(playerBoundingSphere)) {
        console.log("Player collision with enemy!");
        gameOver();
    }
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
        if (footstepSound && footstepSound.isPlaying) footstepSound.stop();
        if (waterDripSound && waterDripSound.isPlaying) waterDripSound.stop();
    }
    
    showGameOverScreen();
}

// Start the application
init(); 
