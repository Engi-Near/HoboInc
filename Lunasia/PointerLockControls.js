/**
 * Pointer Lock Controls adapted from Three.js example
 */
class PointerLockControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || document.body;
        this.isLocked = false;
        
        // Initial camera rotation
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        
        // Set by mousemove event
        this.mouseMoveListener = this.onMouseMove.bind(this);
        
        // Setup pointer lock listeners
        this.lockChangeListener = this.onPointerlockChange.bind(this);
        this.lockErrorListener = this.onPointerlockError.bind(this);
        
        this.connect();
    }
    
    connect() {
        document.addEventListener('pointerlockchange', this.lockChangeListener, false);
        document.addEventListener('pointerlockerror', this.lockErrorListener, false);
        
        this.domElement.addEventListener('click', () => {
            if (!this.isLocked) {
                this.lock();
            }
        });
    }
    
    disconnect() {
        document.removeEventListener('pointerlockchange', this.lockChangeListener, false);
        document.removeEventListener('pointerlockerror', this.lockErrorListener, false);
        document.removeEventListener('mousemove', this.mouseMoveListener, false);
    }
    
    lock() {
        this.domElement.requestPointerLock();
    }
    
    unlock() {
        document.exitPointerLock();
    }
    
    onPointerlockChange() {
        if (document.pointerLockElement === this.domElement) {
            document.addEventListener('mousemove', this.mouseMoveListener, false);
            this.isLocked = true;
        } else {
            document.removeEventListener('mousemove', this.mouseMoveListener, false);
            this.isLocked = false;
        }
    }
    
    onPointerlockError() {
        console.error('Pointer lock error');
    }
    
    onMouseMove(event) {
        if (this.isLocked) {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            // Apply rotation based on mouse movement
            this.euler.y -= movementX * 0.002;
            this.euler.x -= movementY * 0.002;
            
            // Clamp vertical rotation to avoid flipping
            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
            
            // Apply the rotation to the camera
            this.camera.quaternion.setFromEuler(this.euler);
        }
    }
} 