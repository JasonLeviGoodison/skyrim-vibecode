import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { World } from "./World";
import { Player } from "./Player";
import { Inventory } from "./Inventory";
import { WeaponSystem } from "./WeaponSystem";
import { ChestSystem } from "./ChestSystem";
import { GameState, InputState } from "../types";

export class Game {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  controls: PointerLockControls;
  world: World;
  player: Player;
  inventory: Inventory;
  weaponSystem: WeaponSystem;
  chestSystem: ChestSystem;
  debugInfo: HTMLElement | null = null;
  gameState: GameState;
  inputState: InputState;

  // Mini-map properties
  miniMapCanvas: HTMLCanvasElement | null = null;
  miniMapContext: CanvasRenderingContext2D | null = null;
  miniMapScale: number = 2;
  miniMapSize: number = 150;

  // Controls help timeout
  controlsHelpTimeout: number | null = null;

  constructor() {
    // Initialize game properties
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.clock = new THREE.Clock();

    // Initialize game state
    this.gameState = {
      paused: false,
      gameOver: false,
      score: 0,
      health: 100,
      time: 0,
    };

    // Initialize input state
    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      attack: false,
      interact: false,
      inventory: false,
      sprint: false,
    };

    // Set up renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Set up camera and controls
    this.camera.position.y = 1.6; // Eye height
    this.controls = new PointerLockControls(this.camera, document.body);

    // Add pointer lock controls to scene - BUT DO NOT add camera directly
    // this.scene.add(this.camera); // This line caused the movement issue - REMOVED
    this.scene.add(this.controls.getObject());

    // Initialize game systems - Note the order is important!
    // First create the world, then the player, and set the world reference in the player
    this.world = new World(this.scene);
    this.player = new Player(this.camera, this.scene, this.controls);
    this.player.setWorld(this.world); // Set world reference in player

    // Initialize player position on terrain
    const startX = 0;
    const startZ = 0;
    const terrainHeight = this.world.getInterpolatedHeightAt(startX, startZ);
    this.controls.getObject().position.set(startX, terrainHeight + this.player.height, startZ);

    console.log(
      "Player placed in the village center. Terrain size:",
      this.world.worldSize,
      "x",
      this.world.worldSize
    );

    // Initialize other systems
    this.inventory = new Inventory();
    this.weaponSystem = new WeaponSystem(this.scene, this.camera, this.player);
    this.chestSystem = new ChestSystem(this.scene, this.inventory, this.player);

    // Connect systems
    this.chestSystem.setWeaponSystem(this.weaponSystem);

    // Set up event listeners
    this.setupEventListeners();

    // Setup debug info and mini-map
    this.setupDebugInfo();
    this.setupMiniMap();
    this.setupControlsHelp();

    // Set up resize event listener
    window.addEventListener("resize", () => {
      // Update camera aspect ratio
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();

      // Update renderer size
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Ensure pointer lock works by adding a click listener
    document.addEventListener("click", () => {
      if (!this.controls.isLocked) {
        this.controls.lock();
      }
    });

    // Start animation loop
    this.animate();
  }

  setupDebugInfo(): void {
    this.debugInfo = document.getElementById("debug-info");
    if (this.debugInfo) {
      this.debugInfo.style.display = "block";
    }
  }

  updateDebugInfo(): void {
    if (!this.debugInfo) return;

    const position = this.controls.getObject().position;
    const roundedX = Math.round(position.x * 10) / 10;
    const roundedY = Math.round(position.y * 10) / 10;
    const roundedZ = Math.round(position.z * 10) / 10;

    this.debugInfo.innerHTML = `
      Position: X: ${roundedX}, Y: ${roundedY}, Z: ${roundedZ}<br>
      FPS: ${Math.round(1 / this.clock.getDelta())}<br>
      Inside Building: ${this.player.insideBuilding ? "Yes" : "No"}
    `;
  }

  setupEventListeners(): void {
    // Handle window resize
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Handle pointer lock changes
    this.controls.addEventListener("lock", () => {
      document.body.classList.add("game-active");
    });

    this.controls.addEventListener("unlock", () => {
      document.body.classList.remove("game-active");
    });

    // Handle keyboard input
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
          this.player.moveForward = true;
          this.inputState.forward = true;
          break;
        case "KeyS":
          this.player.moveBackward = true;
          this.inputState.backward = true;
          break;
        case "KeyA":
          this.player.moveLeft = true;
          this.inputState.left = true;
          break;
        case "KeyD":
          this.player.moveRight = true;
          this.inputState.right = true;
          break;
        case "Space":
          this.player.jump();
          this.inputState.jump = true;
          break;
        case "KeyE":
          this.player.interact(this.chestSystem);
          this.inputState.interact = true;
          break;
        case "KeyI":
          this.inventory.toggleInventory();
          this.inputState.inventory = true;
          break;
        case "KeyR":
          // Toggle weapon
          this.weaponSystem.toggleWeapon();
          break;
        case "Digit1":
          // Select dagger
          if (
            this.weaponSystem.weapons.dagger &&
            (this.weaponSystem.weapons.dagger.acquired === undefined ||
              this.weaponSystem.weapons.dagger.acquired === true)
          ) {
            this.weaponSystem.currentWeapon = "dagger";
            this.weaponSystem.showCurrentWeapon();
            this.weaponSystem.updateWeaponIndicator();
          }
          break;
        case "Digit2":
          // Select sword
          if (
            this.weaponSystem.weapons.sword &&
            (this.weaponSystem.weapons.sword.acquired === undefined ||
              this.weaponSystem.weapons.sword.acquired === true)
          ) {
            this.weaponSystem.currentWeapon = "sword";
            this.weaponSystem.showCurrentWeapon();
            this.weaponSystem.updateWeaponIndicator();
          }
          break;
        case "Digit3":
          // Select bow
          if (
            this.weaponSystem.weapons.bow &&
            (this.weaponSystem.weapons.bow.acquired === undefined ||
              this.weaponSystem.weapons.bow.acquired === true)
          ) {
            this.weaponSystem.currentWeapon = "bow";
            this.weaponSystem.showCurrentWeapon();
            this.weaponSystem.updateWeaponIndicator();
          }
          break;
        case "ShiftLeft":
        case "ShiftRight":
          // Enable sprinting
          this.inputState.sprint = true;
          this.player.speed = 20.0; // Double speed when sprinting
          break;
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
          const slotIndex = parseInt(event.code.charAt(5)) - 1;
          // Use the item in the selected slot
          this.inventory.useItem(slotIndex);
          break;
        case "KeyQ":
          // Consume the item in the first slot (for healing)
          this.player.consumeItem(0);
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
          this.player.moveForward = false;
          this.inputState.forward = false;
          break;
        case "KeyS":
          this.player.moveBackward = false;
          this.inputState.backward = false;
          break;
        case "KeyA":
          this.player.moveLeft = false;
          this.inputState.left = false;
          break;
        case "KeyD":
          this.player.moveRight = false;
          this.inputState.right = false;
          break;
        case "Space":
          this.inputState.jump = false;
          break;
        case "KeyE":
          this.inputState.interact = false;
          break;
        case "KeyI":
          this.inputState.inventory = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          // Disable sprinting
          this.inputState.sprint = false;
          this.player.speed = 10.0; // Reset to normal speed
          break;
      }
    };

    // Handle mouse click for attacking
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        // Left mouse button - attack
        this.weaponSystem.attack();
        this.inputState.attack = true;
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        // Left mouse button released
        this.inputState.attack = false;
      }
    };

    // Add event listeners
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);

    // Listen for weapon damage events
    document.addEventListener("objectDamaged", (event: any) => {
      const detail = event.detail;
      if (detail && detail.object && detail.object.userData && detail.object.userData.isEnemy) {
        console.log(`Enemy hit with ${detail.weaponType} for ${detail.damage} damage!`);
        // Update game state if needed
      }
    });
  }

  setupControlsHelp(): void {
    const controlsHelp = document.getElementById("controls-help");
    if (controlsHelp) {
      this.controlsHelpTimeout = window.setTimeout(() => {
        controlsHelp.style.opacity = "0";
        setTimeout(() => {
          controlsHelp.style.display = "none";
        }, 500);
      }, 10000);
    }
  }

  setupMiniMap(): void {
    // Get mini-map canvas
    this.miniMapCanvas = document.getElementById("mini-map-canvas") as HTMLCanvasElement;
    if (!this.miniMapCanvas) return;

    // Set canvas size
    this.miniMapCanvas.width = this.miniMapSize;
    this.miniMapCanvas.height = this.miniMapSize;

    // Get canvas context
    this.miniMapContext = this.miniMapCanvas.getContext("2d");
    if (!this.miniMapContext) return;

    // Initial render
    this.updateMiniMap();
  }

  updateMiniMap(): void {
    if (!this.miniMapContext || !this.miniMapCanvas) return;

    // Clear canvas
    this.miniMapContext.clearRect(0, 0, this.miniMapCanvas.width, this.miniMapCanvas.height);

    // Get player position
    const playerPosition = this.controls.getObject().position;

    // Calculate mini-map center
    const centerX = this.miniMapCanvas.width / 2;
    const centerY = this.miniMapCanvas.height / 2;

    // Draw terrain
    this.drawMiniMapTerrain(centerX, centerY, playerPosition);

    // Draw buildings
    this.drawMiniMapBuildings(centerX, centerY, playerPosition);

    // Draw trees
    this.drawMiniMapTrees(centerX, centerY, playerPosition);

    // Draw chests
    this.drawMiniMapChests(centerX, centerY, playerPosition);

    // Update direction indicator
    this.updateDirectionIndicator();
  }

  drawMiniMapTerrain(centerX: number, centerY: number, playerPosition: THREE.Vector3): void {
    if (!this.miniMapContext) return;

    // Draw terrain as a green circle
    this.miniMapContext.fillStyle = "#3a7e4d";
    this.miniMapContext.beginPath();
    this.miniMapContext.arc(centerX, centerY, this.miniMapSize / 2, 0, Math.PI * 2);
    this.miniMapContext.fill();
  }

  drawMiniMapBuildings(centerX: number, centerY: number, playerPosition: THREE.Vector3): void {
    if (!this.miniMapContext) return;

    // Set building style
    this.miniMapContext.fillStyle = "#8b4513";

    // Draw each building
    for (const building of this.world.buildings) {
      // Calculate relative position
      const relX = (building.position.x - playerPosition.x) / this.miniMapScale;
      const relZ = (building.position.z - playerPosition.z) / this.miniMapScale;

      // Calculate screen position
      const screenX = centerX + relX;
      const screenZ = centerY + relZ;

      // Draw building if within mini-map bounds
      if (Math.abs(relX) < centerX && Math.abs(relZ) < centerY) {
        this.miniMapContext.fillRect(
          screenX - building.width / (2 * this.miniMapScale),
          screenZ - building.depth / (2 * this.miniMapScale),
          building.width / this.miniMapScale,
          building.depth / this.miniMapScale
        );
      }
    }
  }

  drawMiniMapTrees(centerX: number, centerY: number, playerPosition: THREE.Vector3): void {
    if (!this.miniMapContext) return;

    // Set tree style
    this.miniMapContext.fillStyle = "#2e8b57";

    // Draw each tree
    for (const tree of this.world.trees) {
      // Get tree position
      const treePosition = new THREE.Vector3();
      tree.getWorldPosition(treePosition);

      // Calculate relative position
      const relX = (treePosition.x - playerPosition.x) / this.miniMapScale;
      const relZ = (treePosition.z - playerPosition.z) / this.miniMapScale;

      // Calculate screen position
      const screenX = centerX + relX;
      const screenZ = centerY + relZ;

      // Draw tree if within mini-map bounds
      if (Math.abs(relX) < centerX && Math.abs(relZ) < centerY) {
        this.miniMapContext.beginPath();
        this.miniMapContext.arc(screenX, screenZ, 2, 0, Math.PI * 2);
        this.miniMapContext.fill();
      }
    }
  }

  drawMiniMapChests(centerX: number, centerY: number, playerPosition: THREE.Vector3): void {
    if (!this.miniMapContext) return;

    // Set chest style
    this.miniMapContext.fillStyle = "#ffd700";

    // Draw each chest
    for (const chest of this.chestSystem.chests) {
      // Calculate relative position
      const relX = (chest.position.x - playerPosition.x) / this.miniMapScale;
      const relZ = (chest.position.z - playerPosition.z) / this.miniMapScale;

      // Calculate screen position
      const screenX = centerX + relX;
      const screenZ = centerY + relZ;

      // Draw chest if within mini-map bounds
      if (Math.abs(relX) < centerX && Math.abs(relZ) < centerY) {
        this.miniMapContext.beginPath();
        this.miniMapContext.arc(screenX, screenZ, 3, 0, Math.PI * 2);
        this.miniMapContext.fill();
      }
    }
  }

  updateDirectionIndicator(): void {
    // Get direction indicator
    const directionIndicator = document.getElementById("direction-indicator");
    if (!directionIndicator) return;

    // Get camera direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);

    // Calculate angle in degrees
    const angle = Math.atan2(direction.x, direction.z) * (180 / Math.PI);

    // Update indicator rotation
    directionIndicator.style.transform = `translateX(-6px) translateY(-12px) rotate(${angle}deg)`;
  }

  animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    // Calculate delta time
    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update game time
    this.gameState.time += delta;

    // Handle sprinting stamina consumption
    if (
      this.inputState.sprint &&
      (this.inputState.forward ||
        this.inputState.backward ||
        this.inputState.left ||
        this.inputState.right)
    ) {
      // Use stamina for sprinting - 20 stamina points per second
      if (!this.player.useStamina(20 * delta)) {
        // If not enough stamina, revert to normal speed
        this.player.speed = 10.0;
      }
    }

    // Update game systems
    this.player.update(delta);
    this.world.update(delta);
    this.weaponSystem.update(delta);
    this.chestSystem.update(delta, this.camera);

    // Ensure camera matrix is updated
    this.camera.updateMatrixWorld(true);

    // If a frame has passed and we don't see the weapon, try to show it again
    if (this.gameState.time > 1 && !this.weaponSystem.isWeaponVisible()) {
      console.log("Weapon not visible, re-showing current weapon");
      this.weaponSystem.showCurrentWeapon();
    }

    // Update mini-map
    this.updateMiniMap();

    // Update direction indicator
    this.updateDirectionIndicator();

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Update debug info
    this.updateDebugInfo();
  }
}

// Start the game when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new Game();
});
