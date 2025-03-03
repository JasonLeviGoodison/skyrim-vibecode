import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { World } from "./World";
import { ChestSystem } from "./ChestSystem";
import { InventoryItem } from "../types";

export class Player {
  // Camera and controls
  camera: THREE.Camera;
  scene: THREE.Scene;
  controls: PointerLockControls;

  // Movement properties
  moveForward: boolean = false;
  moveBackward: boolean = false;
  moveLeft: boolean = false;
  moveRight: boolean = false;
  canJump: boolean = false;

  // Physics properties
  velocity: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number = 10.0;
  gravity: number = 30.0;
  jumpStrength: number = 10.0;
  height: number = 1.6;

  // Collision detection
  raycaster: THREE.Raycaster;
  downRaycaster: THREE.Raycaster;

  // Game state
  health: number = 100;
  maxHealth: number = 100;
  stamina: number = 100;
  maxStamina: number = 100;
  staminaRegenRate: number = 10; // Stamina points per second
  staminaRegenDelay: number = 1; // Seconds before stamina starts regenerating
  lastStaminaUseTime: number = 0;
  insideBuilding: boolean = false;

  // World reference
  world: World | null = null;

  // Interior lighting
  interiorGroup: THREE.Group | null = null;
  fireLight: THREE.PointLight | null = null;
  fireMesh: THREE.Mesh | null = null;
  flickerSpeed: number = 0.1;
  flickerAmount: number = 0.3;
  flickerTime: number = 0;

  constructor(camera: THREE.Camera, scene: THREE.Scene, controls: PointerLockControls) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;

    // Initialize physics
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // Initialize raycaster for collision detection
    this.raycaster = new THREE.Raycaster();
    this.downRaycaster = new THREE.Raycaster();

    // Create fireplace effect
    this.createFireplaceEffect();

    // Initialize UI
    this.updateHealthDisplay();
    this.createStaminaBar();
  }

  createStaminaBar(): void {
    // Create stamina bar container
    const staminaBar = document.createElement("div");
    staminaBar.id = "stamina-bar";
    staminaBar.style.position = "absolute";
    staminaBar.style.bottom = "45px";
    staminaBar.style.left = "20px";
    staminaBar.style.width = "200px";
    staminaBar.style.height = "10px";
    staminaBar.style.backgroundColor = "#333";
    staminaBar.style.border = "1px solid #000";

    // Create stamina fill
    const staminaFill = document.createElement("div");
    staminaFill.id = "stamina";
    staminaFill.style.width = "100%";
    staminaFill.style.height = "100%";
    staminaFill.style.backgroundColor = "#0af";

    // Add to DOM
    staminaBar.appendChild(staminaFill);
    document.body.appendChild(staminaBar);
  }

  setWorld(world: World): void {
    this.world = world;
  }

  jump(): void {
    if (this.canJump) {
      this.velocity.y = this.jumpStrength;
      this.canJump = false;
    }
  }

  interact(chestSystem: ChestSystem): void {
    // Create raycaster from camera
    this.downRaycaster.ray.origin.copy(this.controls.getObject().position);
    this.downRaycaster.ray.direction.set(0, 0, -1);

    // Get all objects in the scene
    const objects: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        objects.push(object);
      }
    });

    // Check for intersections
    const intersects = this.downRaycaster.intersectObjects(objects);

    // If looking at a chest, interact with it
    if (intersects.length > 0 && intersects[0].distance < 5) {
      const object = intersects[0].object;
      if (object.userData.chestIndex !== undefined) {
        chestSystem.openChest(object);
      }
    }
  }

  consumeItem(slotIndex: number): void {
    // Implementation for consuming items
    console.log("Consuming item in slot", slotIndex);

    // Get inventory from DOM
    const inventoryItems = document.getElementById("inventory-items");
    if (!inventoryItems) return;

    // Get slot element
    const slots = inventoryItems.children;
    if (slotIndex < 0 || slotIndex >= slots.length) return;

    const slot = slots[slotIndex] as HTMLElement;

    // Get item data
    const itemData = slot.dataset.item;
    if (!itemData) return;

    try {
      const item = JSON.parse(itemData) as InventoryItem;

      // Handle different item types
      if (item.type === "food" || item.type === "potion") {
        // Heal player if item has healAmount
        if (item.healAmount) {
          this.heal(item.healAmount);
          console.log(`Consumed ${item.name} and healed for ${item.healAmount} health.`);

          // Remove item from slot
          slot.innerHTML = "";
          slot.dataset.item = "";
        }
      }
    } catch (error) {
      console.error("Error parsing item data:", error);
    }
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }

    // Update health display
    this.updateHealthDisplay();
  }

  heal(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth);

    // Update health display
    this.updateHealthDisplay();
  }

  useStamina(amount: number): boolean {
    if (this.stamina < amount) {
      return false;
    }

    this.stamina -= amount;
    this.lastStaminaUseTime = performance.now() / 1000;
    this.updateStaminaDisplay();
    return true;
  }

  regenerateStamina(delta: number): void {
    const currentTime = performance.now() / 1000;
    if (currentTime - this.lastStaminaUseTime > this.staminaRegenDelay) {
      this.stamina = Math.min(this.stamina + this.staminaRegenRate * delta, this.maxStamina);
      this.updateStaminaDisplay();
    }
  }

  updateStaminaDisplay(): void {
    const staminaFill = document.getElementById("stamina");
    if (staminaFill) {
      const staminaPercent = (this.stamina / this.maxStamina) * 100;
      staminaFill.style.width = `${staminaPercent}%`;
    }
  }

  die(): void {
    console.log("Player died!");

    // Create death screen
    const deathScreen = document.createElement("div");
    deathScreen.id = "death-screen";
    deathScreen.style.position = "absolute";
    deathScreen.style.top = "0";
    deathScreen.style.left = "0";
    deathScreen.style.width = "100%";
    deathScreen.style.height = "100%";
    deathScreen.style.backgroundColor = "rgba(139, 0, 0, 0.7)";
    deathScreen.style.color = "white";
    deathScreen.style.display = "flex";
    deathScreen.style.flexDirection = "column";
    deathScreen.style.justifyContent = "center";
    deathScreen.style.alignItems = "center";
    deathScreen.style.fontSize = "32px";
    deathScreen.style.fontFamily = "Arial, sans-serif";
    deathScreen.style.zIndex = "1000";

    // Add death message
    const deathMessage = document.createElement("h1");
    deathMessage.textContent = "You Died";
    deathScreen.appendChild(deathMessage);

    // Add restart button
    const restartButton = document.createElement("button");
    restartButton.textContent = "Restart Game";
    restartButton.style.padding = "10px 20px";
    restartButton.style.fontSize = "20px";
    restartButton.style.marginTop = "20px";
    restartButton.style.cursor = "pointer";
    restartButton.onclick = () => {
      location.reload();
    };
    deathScreen.appendChild(restartButton);

    // Add to DOM
    document.body.appendChild(deathScreen);

    // Exit pointer lock
    document.exitPointerLock();
  }

  updateHealthDisplay(): void {
    // Update health bar width
    const healthBar = document.getElementById("health");
    if (healthBar) {
      const healthPercent = (this.health / this.maxHealth) * 100;
      healthBar.style.width = `${healthPercent}%`;

      // Change color based on health
      if (healthPercent < 30) {
        healthBar.style.backgroundColor = "#f44336"; // Red
      } else if (healthPercent < 70) {
        healthBar.style.backgroundColor = "#ff9800"; // Orange
      } else {
        healthBar.style.backgroundColor = "#4caf50"; // Green
      }
    }

    // Update health text
    const healthDisplay = document.getElementById("health-display");
    if (healthDisplay) {
      healthDisplay.textContent = `Health: ${Math.round(this.health)}`;

      // Update health bar color based on health percentage
      const healthPercent = (this.health / this.maxHealth) * 100;
      let color = "#4CAF50"; // Green

      if (healthPercent < 30) {
        color = "#F44336"; // Red
      } else if (healthPercent < 70) {
        color = "#FFC107"; // Yellow
      }

      healthDisplay.style.color = color;
    }
  }

  update(delta: number): void {
    // Update fire flicker effect
    this.updateFireEffect(delta);

    // Check if player is on the ground
    this.updateGroundCheck();

    // Apply gravity
    this.velocity.y -= this.gravity * delta;

    // Get movement direction from input
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    // Apply movement based on camera direction
    if (this.moveForward || this.moveBackward) {
      this.velocity.z = -this.direction.z * this.speed;
    } else {
      this.velocity.z = 0;
    }

    if (this.moveLeft || this.moveRight) {
      this.velocity.x = -this.direction.x * this.speed;
    } else {
      this.velocity.x = 0;
    }

    // Move the player
    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);

    // Apply vertical movement (gravity/jumping)
    this.controls.getObject().position.y += this.velocity.y * delta;

    // Check for collision with ground
    if (this.controls.getObject().position.y < this.getTerrainHeight() + this.height) {
      this.velocity.y = 0;
      this.controls.getObject().position.y = this.getTerrainHeight() + this.height;
      this.canJump = true;
    }

    // Check if player is inside a building
    this.checkIfInsideBuilding();

    // Regenerate stamina
    this.regenerateStamina(delta);
  }

  updateFireEffect(delta: number): void {
    if (this.fireLight && this.fireMesh) {
      // Update flicker time
      this.flickerTime += delta * this.flickerSpeed;

      // Calculate flicker intensity using sine wave
      const flickerIntensity = 1.5 + Math.sin(this.flickerTime) * this.flickerAmount;

      // Apply flicker to light intensity
      this.fireLight.intensity = flickerIntensity;

      // Also slightly adjust the fire material's emissive intensity
      const fireMaterial = this.fireMesh.material as THREE.MeshStandardMaterial;
      fireMaterial.emissiveIntensity = 0.8 + Math.sin(this.flickerTime * 1.5) * 0.2;
      fireMaterial.needsUpdate = true;
    }
  }

  updateGroundCheck(): void {
    // Update raycaster origin to player position
    this.raycaster.ray.origin.copy(this.controls.getObject().position);

    // Check for intersections with the ground
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);

    // If we're close to the ground, allow jumping
    this.canJump = intersections.length > 0 && intersections[0].distance <= this.height + 0.1;
  }

  getTerrainHeight(): number {
    if (!this.world) return 0;

    const position = this.controls.getObject().position;
    return this.world.getInterpolatedHeightAt(position.x, position.z);
  }

  checkIfInsideBuilding(): void {
    if (!this.world) return;

    const position = this.controls.getObject().position;
    const wasInsideBuilding = this.insideBuilding;

    // Use the World's isInsideBuilding method to check if player is inside any building
    this.insideBuilding = this.world.isInsideBuilding(position);

    // If player just entered or exited a building, update lighting
    if (wasInsideBuilding !== this.insideBuilding) {
      if (this.insideBuilding) {
        console.log("Entered building");
        // Adjust lighting for interior
        this.adjustLightingForInterior();
      } else {
        console.log("Exited building");
        // Restore exterior lighting
        this.adjustLightingForExterior();
      }
    }
  }

  adjustLightingForInterior(): void {
    // Reduce ambient light intensity for interior
    const ambientLights = this.scene.children.filter(
      (child) => child instanceof THREE.AmbientLight
    ) as THREE.AmbientLight[];

    if (ambientLights.length > 0) {
      ambientLights[0].intensity = 0.3;
    }
  }

  adjustLightingForExterior(): void {
    // Restore ambient light intensity for exterior
    const ambientLights = this.scene.children.filter(
      (child) => child instanceof THREE.AmbientLight
    ) as THREE.AmbientLight[];

    if (ambientLights.length > 0) {
      ambientLights[0].intensity = 0.7;
    }
  }

  createFireplaceEffect(): void {
    // Create fire geometry based on fireplace width and depth
    const fireWidth = 1.5;
    const fireDepth = 0.8;
    const fireGeometry = new THREE.BoxGeometry(fireWidth, 0.5, fireDepth);

    // Create fire material with emissive properties for glow
    const fireMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff4500,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.7,
    });

    // Create fire mesh and position it in the fireplace
    this.fireMesh = new THREE.Mesh(fireGeometry, fireMaterial);
    this.fireMesh.position.set(0, 0.25, -5);
    this.scene.add(this.fireMesh);

    // Add flickering light for the fire
    this.fireLight = new THREE.PointLight(0xff6a00, 1.5, 10);
    this.fireLight.position.set(0, 0.5, -5);
    this.scene.add(this.fireLight);
  }
}
