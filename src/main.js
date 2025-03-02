import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { World } from "./components/World.js";
import { Player } from "./components/Player.js";
import { Inventory } from "./components/Inventory.js";
import { WeaponSystem } from "./components/WeaponSystem.js";
import { ChestSystem } from "./components/ChestSystem.js";

class Game {
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

    // Set up renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Set up camera
    this.camera.position.set(0, 1.6, 0); // Eye height

    // Set up controls
    this.controls = new PointerLockControls(this.camera, document.body);
    this.scene.add(this.controls.getObject());

    // Set up lighting
    this.setupLighting();

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

    // Initialize other systems
    this.inventory = new Inventory();
    this.weaponSystem = new WeaponSystem(this.scene, this.camera, this.player);
    this.chestSystem = new ChestSystem(this.scene, this.inventory, this.player);

    // Connect systems
    this.chestSystem.setWeaponSystem(this.weaponSystem);

    // Set up event listeners
    this.setupEventListeners();

    // Start game loop
    this.animate();

    // Lock controls on click
    document.addEventListener("click", () => {
      if (!this.controls.isLocked) {
        this.controls.lock();
      }
    });

    // Add debug info
    this.setupDebugInfo();
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;

    // Configure shadow properties
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;

    this.scene.add(sunLight);
  }

  setupDebugInfo() {
    // Create debug info container
    const debugInfo = document.createElement("div");
    debugInfo.id = "debug-info";
    debugInfo.style.position = "absolute";
    debugInfo.style.top = "10px";
    debugInfo.style.left = "10px";
    debugInfo.style.color = "white";
    debugInfo.style.fontFamily = "monospace";
    debugInfo.style.fontSize = "12px";
    debugInfo.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    debugInfo.style.padding = "5px";
    debugInfo.style.borderRadius = "3px";
    debugInfo.style.pointerEvents = "none";
    document.body.appendChild(debugInfo);

    this.debugInfo = debugInfo;
  }

  updateDebugInfo() {
    if (!this.debugInfo) return;

    const playerPos = this.player.controls.getObject().position;
    const terrainHeight = this.world.getInterpolatedHeightAt(playerPos.x, playerPos.z);
    const canJump = this.player.canJump;
    const velocity = this.player.velocity;
    const weaponType = this.player.currentWeapon ? this.player.currentWeapon.type : "none";

    // Find nearest building
    let nearestBuilding = null;
    let nearestBuildingDistance = Infinity;

    if (this.world.buildings) {
      for (const building of this.world.buildings) {
        const distance = Math.sqrt(
          Math.pow(playerPos.x - building.position.x, 2) +
            Math.pow(playerPos.z - building.position.z, 2)
        );
        if (distance < nearestBuildingDistance) {
          nearestBuildingDistance = distance;
          nearestBuilding = building;
        }
      }
    }

    // Find nearest tree
    let nearestTree = null;
    let nearestTreeDistance = Infinity;

    if (this.world.trees) {
      for (const tree of this.world.trees) {
        const distance = Math.sqrt(
          Math.pow(playerPos.x - tree.position.x, 2) + Math.pow(playerPos.z - tree.position.z, 2)
        );
        if (distance < nearestTreeDistance) {
          nearestTreeDistance = distance;
          nearestTree = tree;
        }
      }
    }

    // Check if player is inside a building
    const isInsideBuilding = this.player.insideBuilding !== null;

    // Format debug info
    this.debugInfo.innerHTML = `
      <div>Position: X: ${playerPos.x.toFixed(2)}, Y: ${playerPos.y.toFixed(
      2
    )}, Z: ${playerPos.z.toFixed(2)}</div>
      <div>Terrain Height: ${terrainHeight.toFixed(2)}</div>
      <div>Can Jump: ${canJump}</div>
      <div>Velocity: X: ${velocity.x.toFixed(2)}, Y: ${velocity.y.toFixed(
      2
    )}, Z: ${velocity.z.toFixed(2)}</div>
      <div>Weapon: ${weaponType}</div>
      ${
        nearestBuilding
          ? `<div>Nearest Building: ${nearestBuildingDistance.toFixed(2)} units away</div>`
          : ""
      }
      ${nearestTree ? `<div>Nearest Tree: ${nearestTreeDistance.toFixed(2)} units away</div>` : ""}
      <div>Location: ${
        isInsideBuilding ? "Inside Building (Go to door and press E to exit)" : "Outside"
      }</div>
    `;
  }

  setupEventListeners() {
    // Handle window resize
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Handle keyboard input
    document.addEventListener("keydown", (event) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          this.player.moveForward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          this.player.moveBackward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          this.player.moveLeft = true;
          break;
        case "KeyD":
        case "ArrowRight":
          this.player.moveRight = true;
          break;
        case "Space":
          this.player.jump();
          break;
        case "KeyE":
          this.player.interact(this.chestSystem);
          break;
        case "KeyI":
          this.inventory.toggleInventory();
          break;
        case "KeyF":
          this.weaponSystem.toggleWeapon();
          break;
        case "Digit1":
          this.player.consumeItem(0);
          break;
        case "Digit2":
          this.player.consumeItem(1);
          break;
        case "Digit3":
          this.player.consumeItem(2);
          break;
      }
    });

    document.addEventListener("keyup", (event) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          this.player.moveForward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          this.player.moveBackward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          this.player.moveLeft = false;
          break;
        case "KeyD":
        case "ArrowRight":
          this.player.moveRight = false;
          break;
      }
    });

    // Handle mouse clicks for attacking
    document.addEventListener("mousedown", (event) => {
      if (this.controls.isLocked && event.button === 0) {
        // Left click
        this.weaponSystem.attack();
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    // Update game systems
    this.player.update(delta);

    // Check for collisions with objects
    this.player.checkAllDirectionCollisions();

    this.world.update(delta);
    this.weaponSystem.update(delta);
    this.chestSystem.update(delta, this.camera);

    // Update debug info
    this.updateDebugInfo();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const game = new Game();
});
