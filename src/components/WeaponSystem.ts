import * as THREE from "three";
import { Player } from "./Player";
import { Weapon, Weapons } from "../types";

export class WeaponSystem {
  scene: THREE.Scene;
  camera: THREE.Camera;
  player: Player;
  currentWeapon: string;
  weapons: Weapons;
  attackCooldown: number;
  lastAttackTime: number;
  isAttacking: boolean;
  arrowsInFlight: THREE.Object3D[];
  weaponOrder: string[]; // Order of weapons for cycling

  constructor(scene: THREE.Scene, camera: THREE.Camera, player: Player) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;

    // Define weapon order for cycling
    this.weaponOrder = ["dagger", "sword", "bow"];

    // Weapon properties
    this.currentWeapon = "dagger"; // Start with dagger
    this.weapons = {
      dagger: {
        damage: 10,
        range: 1.5,
        cooldown: 0.3,
        model: null,
        acquired: true,
      },
      sword: {
        damage: 20,
        range: 2,
        cooldown: 0.5,
        model: null,
        acquired: true,
      },
      betterSword: {
        damage: 35,
        range: 2.5,
        cooldown: 0.4,
        model: null,
        acquired: false,
      },
      bow: {
        damage: 15,
        range: 20,
        cooldown: 1.0,
        model: null,
        arrow: null,
        lastFired: 0,
        acquired: true,
      },
    };

    // Attack properties
    this.attackCooldown = 0.5;
    this.lastAttackTime = 0;
    this.isAttacking = false;
    this.arrowsInFlight = [];

    // Create weapon models
    this.createWeaponModels();

    // Make sure starting weapon is visible
    this.showCurrentWeapon();

    // Update weapon indicator
    this.updateWeaponIndicator();

    console.log("Weapon system initialized with " + this.currentWeapon);
  }

  createWeaponModels(): void {
    console.log("Creating weapon models...");

    // Ensure the camera has the correct matrixWorldNeedsUpdate flag
    this.camera.matrixWorldNeedsUpdate = true;

    // Create dagger model
    const daggerGroup = new THREE.Group();
    daggerGroup.name = "dagger-model";

    // Dagger handle
    const handleGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.3,
      roughness: 0.8,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -0.07;
    daggerGroup.add(handle);

    // Dagger guard
    const guardGeometry = new THREE.BoxGeometry(0.08, 0.015, 0.03);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969, // Dim gray
      metalness: 0.7,
      roughness: 0.3,
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.z = -0.01;
    daggerGroup.add(guard);

    // Dagger blade
    const bladeGeometry = new THREE.BoxGeometry(0.03, 0.008, 0.25);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0, // Silver
      metalness: 0.9,
      roughness: 0.1,
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.z = 0.12;
    daggerGroup.add(blade);

    // Position dagger in the center-right of the screen
    daggerGroup.position.set(0.4, -0.2, -0.5);
    // Fix orientation - flip the dagger 180 degrees around the Y axis so the blade points outward
    daggerGroup.rotation.set(0.3, -0.4 + Math.PI, 0.1);
    daggerGroup.scale.set(2, 2, 2);

    // Add dagger to camera
    this.camera.add(daggerGroup);
    this.weapons.dagger.model = daggerGroup;

    // Initially show the dagger for testing
    daggerGroup.visible = true;
    console.log("Dagger model created and visible at:", daggerGroup.position);

    // Create sword model
    const swordGroup = new THREE.Group();
    swordGroup.name = "sword-model";

    // Sword handle
    const swordHandleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
    const swordHandleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.3,
      roughness: 0.8,
    });
    const swordHandle = new THREE.Mesh(swordHandleGeometry, swordHandleMaterial);
    swordHandle.rotation.x = Math.PI / 2;
    swordHandle.position.z = -0.1;
    swordGroup.add(swordHandle);

    // Sword guard
    const swordGuardGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.04);
    const swordGuardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold
      metalness: 0.7,
      roughness: 0.3,
    });
    const swordGuard = new THREE.Mesh(swordGuardGeometry, swordGuardMaterial);
    swordGuard.position.z = -0.01;
    swordGroup.add(swordGuard);

    // Sword blade
    const swordBladeGeometry = new THREE.BoxGeometry(0.05, 0.01, 0.5);
    const swordBladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0, // Silver
      metalness: 0.9,
      roughness: 0.1,
    });
    const swordBlade = new THREE.Mesh(swordBladeGeometry, swordBladeMaterial);
    swordBlade.position.z = 0.25;
    swordGroup.add(swordBlade);

    // Position sword in the center-right of the screen with corrected orientation
    swordGroup.position.set(0.5, -0.2, -0.5);
    swordGroup.rotation.set(0.4, -0.5, 0.1); // Adjusted rotation to point forward
    swordGroup.scale.set(2, 2, 2);

    // Add sword to camera
    this.camera.add(swordGroup);
    this.weapons.sword.model = swordGroup;

    // Hide sword initially
    swordGroup.visible = false;
    console.log("Sword model created");

    // Create better sword model
    const betterSwordGroup = new THREE.Group();
    betterSwordGroup.name = "better-sword-model";

    // Better sword handle
    const betterHandleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8);
    const betterHandleMaterial = new THREE.MeshStandardMaterial({
      color: 0x800000, // Maroon
      metalness: 0.4,
      roughness: 0.7,
    });
    const betterHandle = new THREE.Mesh(betterHandleGeometry, betterHandleMaterial);
    betterHandle.rotation.x = Math.PI / 2;
    betterHandle.position.z = -0.125;
    betterSwordGroup.add(betterHandle);

    // Better sword guard
    const betterGuardGeometry = new THREE.BoxGeometry(0.2, 0.03, 0.05);
    const betterGuardMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8860b, // Dark goldenrod
      metalness: 0.8,
      roughness: 0.2,
    });
    const betterGuard = new THREE.Mesh(betterGuardGeometry, betterGuardMaterial);
    betterGuard.position.z = -0.01;
    betterSwordGroup.add(betterGuard);

    // Better sword blade
    const betterBladeGeometry = new THREE.BoxGeometry(0.06, 0.015, 0.6);
    const betterBladeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4682b4, // Steel blue
      metalness: 1.0,
      roughness: 0.0,
      emissive: 0x4682b4,
      emissiveIntensity: 0.2,
    });
    const betterBlade = new THREE.Mesh(betterBladeGeometry, betterBladeMaterial);
    betterBlade.position.z = 0.3;
    betterSwordGroup.add(betterBlade);

    // Position better sword with corrected orientation
    betterSwordGroup.position.set(0.5, -0.2, -0.5);
    betterSwordGroup.rotation.set(0.4, -0.5, 0.1); // Adjusted rotation to point forward
    betterSwordGroup.scale.set(2.2, 2.2, 2.2);

    // Add better sword to camera
    this.camera.add(betterSwordGroup);
    this.weapons.betterSword.model = betterSwordGroup;

    // Hide better sword until acquired
    betterSwordGroup.visible = false;
    console.log("Better sword model created");

    // Create bow model
    const bowGroup = new THREE.Group();
    bowGroup.name = "bow-model";

    // Bow body - make it more visible with a thicker torus
    const bowGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 16, Math.PI);
    const bowMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.1,
      roughness: 0.9,
    });
    const bow = new THREE.Mesh(bowGeometry, bowMaterial);
    bow.rotation.y = Math.PI / 2;
    bowGroup.add(bow);

    // Bow string - make it more visible
    const stringGeometry = new THREE.CylinderGeometry(0.004, 0.004, 0.4, 4);
    const stringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff, // White
    });
    const string = new THREE.Mesh(stringGeometry, stringMaterial);
    string.position.z = 0.1;
    bowGroup.add(string);

    // Position bow in the center-right of the screen
    bowGroup.position.set(0.6, -0.2, -0.4);
    bowGroup.rotation.set(0, 0, -Math.PI / 3);
    bowGroup.scale.set(2, 2, 2);

    // Add bow to camera
    this.camera.add(bowGroup);
    this.weapons.bow.model = bowGroup;

    // Hide bow initially
    bowGroup.visible = false;
    console.log("Bow model created");

    // Create arrow for bow
    const arrowGroup = new THREE.Group();
    arrowGroup.name = "arrow-model";

    // Arrow shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.3, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.1,
      roughness: 0.9,
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft);

    // Arrow head
    const headGeometry = new THREE.ConeGeometry(0.01, 0.05, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gray
      metalness: 0.7,
      roughness: 0.3,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.rotation.x = -Math.PI / 2;
    head.position.z = 0.17;
    arrowGroup.add(head);

    // Arrow fletching
    const fletchingGeometry = new THREE.BoxGeometry(0.03, 0.001, 0.03);
    const fletchingMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Red
      metalness: 0.1,
      roughness: 0.9,
    });
    const fletching = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
    fletching.rotation.y = Math.PI / 4;
    fletching.position.z = -0.13;
    arrowGroup.add(fletching);

    // Position arrow with the bow
    arrowGroup.position.set(0.6, -0.2, -0.4);
    arrowGroup.rotation.set(Math.PI / 2, 0.3, 0);
    arrowGroup.scale.set(2, 2, 2);
    arrowGroup.visible = false;

    // Add arrow to camera
    this.camera.add(arrowGroup);
    this.weapons.bow.arrow = arrowGroup;

    console.log("Arrow model created");

    // Force the camera to update its world matrix
    this.camera.updateMatrixWorld(true);
  }

  showCurrentWeapon(): void {
    console.log("Showing current weapon: " + this.currentWeapon);

    // Hide all weapons first
    Object.keys(this.weapons).forEach((weaponName) => {
      const weapon = this.weapons[weaponName];
      if (weapon.model) {
        weapon.model.visible = false;
      }
    });

    // Hide bow arrow
    if (this.weapons.bow.arrow) {
      this.weapons.bow.arrow.visible = false;
    }

    // Show current weapon if acquired
    if (this.currentWeapon && this.weapons[this.currentWeapon]) {
      const weapon = this.weapons[this.currentWeapon];
      if (weapon.model && (weapon.acquired === undefined || weapon.acquired === true)) {
        // Make sure weapon is visible
        weapon.model.visible = true;

        // If the weapon is a bow, also show the arrow
        if (this.currentWeapon === "bow" && this.weapons.bow.arrow) {
          this.weapons.bow.arrow.visible = true;
        }

        console.log(`${this.currentWeapon} is now visible, visibility:`, weapon.model.visible);

        // Force a camera update
        this.camera.updateMatrixWorld(true);

        // Put weapon on camera log
        console.log(`Weapon is on camera: ${this.camera.children.includes(weapon.model)}`);
      } else {
        console.log(`Cannot show ${this.currentWeapon} - not acquired or no model`);
        // If current weapon can't be shown, switch to the next available one
        this.nextAvailableWeapon();
      }
    }
  }

  nextAvailableWeapon(): void {
    const startWeapon = this.currentWeapon;
    let found = false;

    // Try to find the next available weapon in the order list
    for (let i = 0; i < this.weaponOrder.length; i++) {
      // Find current weapon in order
      const currentIndex = this.weaponOrder.indexOf(this.currentWeapon);
      const nextIndex = (currentIndex + 1) % this.weaponOrder.length;
      this.currentWeapon = this.weaponOrder[nextIndex];

      // Check if this weapon is available
      const weapon = this.weapons[this.currentWeapon];
      if (weapon && weapon.model && (weapon.acquired === undefined || weapon.acquired === true)) {
        found = true;
        break;
      }
    }

    // If no weapon is available, default to dagger
    if (!found) {
      console.warn("No weapons available, defaulting to dagger");
      this.currentWeapon = "dagger";
      // Ensure dagger is acquired
      this.weapons.dagger.acquired = true;
    }

    // Show the selected weapon
    this.showCurrentWeapon();

    // Update the indicator
    this.updateWeaponIndicator();
  }

  toggleWeapon(): void {
    // Get current index in weapon order
    const currentIndex = this.weaponOrder.indexOf(this.currentWeapon);
    if (currentIndex === -1) {
      // Current weapon not in order, default to first
      this.currentWeapon = this.weaponOrder[0];
    } else {
      // Find next available weapon
      let nextIndex = (currentIndex + 1) % this.weaponOrder.length;
      let nextWeapon = this.weaponOrder[nextIndex];

      // Skip weapons that aren't acquired
      while (
        this.weapons[nextWeapon] &&
        this.weapons[nextWeapon].acquired === false &&
        nextWeapon !== this.currentWeapon
      ) {
        nextIndex = (nextIndex + 1) % this.weaponOrder.length;
        nextWeapon = this.weaponOrder[nextIndex];
      }

      this.currentWeapon = nextWeapon;
    }

    // Show the current weapon
    this.showCurrentWeapon();

    // Update the weapon indicator
    this.updateWeaponIndicator();

    console.log("Switched to weapon: " + this.currentWeapon);

    // Debug - list all children of the camera
    console.log(
      "Camera children:",
      this.camera.children.map((child) => child.name || "unnamed")
    );
  }

  acquireBetterSword(): void {
    this.weapons.betterSword.acquired = true;

    // Add better sword to weapon order after regular sword
    const swordIndex = this.weaponOrder.indexOf("sword");
    if (swordIndex !== -1) {
      this.weaponOrder.splice(swordIndex + 1, 0, "betterSword");
    } else {
      this.weaponOrder.push("betterSword");
    }

    // If current weapon is sword, switch to better sword
    if (this.currentWeapon === "sword") {
      this.currentWeapon = "betterSword";
      this.showCurrentWeapon();
    }

    // Update the weapon indicator
    this.updateWeaponIndicator();

    console.log("Acquired better sword!");
  }

  updateWeaponIndicator(): void {
    // Get the weapon indicator element
    const weaponIndicator = document.getElementById("current-weapon");
    if (weaponIndicator) {
      // Capitalize first letter of weapon name and remove "better" prefix
      let displayName = this.currentWeapon;
      if (displayName === "betterSword") {
        displayName = "Steel Sword";
      } else {
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      }
      weaponIndicator.textContent = displayName;
    }

    // Update the weapon icon
    const weaponIcon = document.querySelector(".weapon-icon");
    if (weaponIcon) {
      // Remove all weapon icon classes
      weaponIcon.classList.remove("icon-dagger", "icon-sword", "icon-bow");

      // Add the appropriate icon class
      let iconClass = "icon-dagger"; // Default icon

      if (this.currentWeapon === "sword" || this.currentWeapon === "betterSword") {
        iconClass = "icon-sword";
      } else if (this.currentWeapon === "bow") {
        iconClass = "icon-bow";
      }

      weaponIcon.classList.add(iconClass);
    }
  }

  attack(): void {
    const currentTime = performance.now() / 1000;
    const currentWeapon = this.weapons[this.currentWeapon];

    // Check if weapon is on cooldown
    if (
      currentWeapon &&
      currentTime - this.lastAttackTime < (currentWeapon.cooldown || this.attackCooldown)
    ) {
      return;
    }

    // Set last attack time
    this.lastAttackTime = currentTime;

    // Skip if already attacking
    if (this.isAttacking) {
      return;
    }

    this.isAttacking = true;

    // Perform attack based on weapon type
    if (this.currentWeapon === "bow") {
      this.bowAttack();
    } else {
      // Melee attack (dagger, sword, better sword)
      this.meleeAttack();
    }
  }

  meleeAttack(): void {
    const weapon = this.weapons[this.currentWeapon];
    if (!weapon || !weapon.model) return;

    const weaponModel = weapon.model;
    const originalRotation = weaponModel.rotation.clone();
    const originalPosition = weaponModel.position.clone();

    // Different attack animations for different melee weapons
    let swingAngle = Math.PI / 4;
    let swingDuration = 0.3;
    let swingDirection = 1; // 1 for forward, -1 for sideways

    if (this.currentWeapon === "dagger") {
      // Dagger uses a forward stabbing motion
      swingAngle = Math.PI / 3;
      swingDuration = 0.25; // Faster animation
      swingDirection = 1;
    } else if (this.currentWeapon === "sword") {
      // Sword uses a side-to-side slashing motion
      swingAngle = Math.PI / 4;
      swingDuration = 0.3;
      swingDirection = -1;
    } else if (this.currentWeapon === "betterSword") {
      // Better sword uses a wider, more powerful slash
      swingAngle = Math.PI / 3.5;
      swingDuration = 0.35; // Slower, more powerful
      swingDirection = -1;
    }

    // Start timing
    const startTime = performance.now();

    // Attach a sound effect to the attack
    if (typeof Audio !== "undefined") {
      const sound = new Audio();
      if (this.currentWeapon === "dagger") {
        sound.src =
          "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAALAAAbPgAREhISFBUVFRcYGBgaGxwcHiAhISMlJiYmKCkpKSstLS8xMjIyNDU1NTc4ODg6Ozw8PkBBQUFDREREQkMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UMQAAApkARiUAAAr5LHHPBgARAAVJTGqE9GTEFTBoJqJmJgaFQCmKFiGHCAgICAgICAgICAgICAgICAgICAgICAvpvX2/v89FnZV5tgTWAYMYwjUZUjYVhwFAnGJRJRQ2VH5Kh8QJf/7UMQHgAthax34wAAj6zvnoAYARTQZDLUQrS5QL0Bt6NdqOKAAAJvB5KRhaY7YgioAAAAAAP39/fx2dnZ2eHh4d3d3d3qGhoZ4eHqX5Nz62LuQTpxZ3I+u14eMXz5xMBwMnUt4Tn6Qav/7UMQIgAo0Wx2AjAFJCjFjsBGAKDfhUGPRbHGZMcbYxLm+Vt77WwA0nfj+x3//5csMB5TgCAYBpvkzf+p8Ou28UKN+mzqyEyZpKlZDRq+mrUq8bsaTpxhSlM5rvWqCfTnfQJJtTf/7UMQSgAssYr0FBACJX4xW4IYAkT8Ym00m3Uk1gKQYJpI3TWWuZ0IYfA2hqDRxoWzb8Yx1//7e//9D7//9DdgAGgO6EYdmZMuPNsujJk1f+aYgBuihiChGLQMGjHxqVZwfGAf/7UMQYAAq8HpdFAAApPw7M9KAABgAHJAQiImkjH///6///////9BBgwPBAZkWyLo///oiIiOwAABwOnHR////////9v////+v6///9UREREf+v//Yh//1HwxZf//GG3/xVZciv/7UMQogAwcGo8FgAAJjg9HsMAAAAAAACOMEQaqqhg7oGKomMvT1pN3WPl7Qefu3cLnBOCw7NUtmRmUuUzlKyD/9vE+7k95WVnLnS1VYRVZZHVXLHVmlDKrLHVlX7a/63/rf/1v/7UMQrgAqIeyelAAAJRY9n9KAABLf/////fRRa+oqADAEJfFsrO2JtLVe///UpQjZcbX/utqb/3/9b4nrq+rUoZ8VWlrWv/3X2UtVVXDVL9VtbVX+//+0Cy3//+7/TLUEktqqv/7UMQxgAqwipfQwAALFhXl+hgAEV+lqVkk621/XX+qv//6//3///v/99/////7f9P////7fxWPHDHAuIsxADgRwoEgwU1YQJ0BJJAKt//f/3//p/////////+oIAAgAOEgF//7UMQ6AAogepbFAAAJRY9S2KAABKiQH+rMtirL9////////+yrUsH//u///b9b0/6/+m+mqHAEHF1qc1YvHxN/61pYK/s/9bfr31v20+t////+36///////7//7IYwhBhCDAEU//7UMRGARDUcuVBDAEs9jVSqGAJRMB0pzKqr//7f9vV///20rf+3///b/t/+3////b//9vRwwhxEVViO4D8VCvl/////7ev/+u3//////qIRFFb/////////+3//////hzgEAi6UAAAT//7UMROA4mQPqVQQABNdkVPYy8ANIAOHkSBrjO4Xbg1QQRIlJgdKS87f/9f+t+77fr/t//7e//p/7/+/+gQUPBCqJJMTi9KrZpaTSrWlNqWn01N/X0u1LS/V//+3///////////7f/7UMRJAAAACrAQAADUIf///////rbDAMcAAAqimZ3MaCMlnNrKUTEK5mRTrrfUdMZkbT6I5jnQh//lRRaPlYKuW+bXUo/L6jrrXXWWvTQNWLJXZWo96LovqOp9Gjtdv10er6ft+u39d//7UMRJA8mBZngJbAALiBTZBK2ABaGjsbb769F0a62+v////39fr60ZTWtG3RRaiM4hCQUgaQHxGDKRFSS5clnMp5FYiLLlQ1hTMrKgpXSspSoP+k+OUYcE/ikP/QP4cH+OP+H8n6kB+Af/7UMQwA8sBQYAFrAAL1hTDAV4AAgfMKqJ5E84aEJBIvT1GtSKIilFdF0fR9b9ddOv14fRdFdGiNVoxptXRVv///vRq9GaXdNXrXr06/X66K6IxXVorGKKL0iuiMRoj60TXRFNG//7UMQ/g88sUYAVeAALdhTCALWAAhtGa66NFFHH4jx8cQj45j45R8XH8cQfHx8cfxySc5JJJJz///+gH0oH3//dE/6QA//5ID6QBJCXlQrCiSQWoYkQsVCZWIRLWXkQsWCwWCwXC/Nxf/7UMRSg88IMQAVrAALDjCxwDAAF5cJwqlQ0+mQ0NFYuF2amkNIYLhaLhYKhYLBcKhUKJQzEgL1vqAQBaP8qCST8qPQP//6QP0//0//h///xAAAoIj/SyT/SyUKInKo/SgRKRKCi//7UMRmg824knAFbAALSBJIAMPAUJUBBBYkmQokkRUMhQMkRUMhWe6u4nZVVYonEMKBQMERVwqmUyqe4pS9/6DAgADDBBgYiuP///UAGDBgwZLV1WTEFNRTMuMTAwqqqqqqqqqqqqqqq//7UMR2g4AAAqQQAADUIAAANIAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//7UMSjA74AAqAAAADcIAAANIAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg==";
      } else if (this.currentWeapon === "sword" || this.currentWeapon === "betterSword") {
        sound.src =
          "data:audio/mp3;base64,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";
      }
      sound.volume = 0.3;
      sound.play().catch((e) => console.log("Audio play error:", e));
    }

    // Start animation
    const animate = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / swingDuration, 1);

      if (progress < 1) {
        if (swingDirection === 1) {
          // Forward stabbing motion (good for dagger)
          weaponModel.position.z = originalPosition.z - Math.sin(progress * Math.PI) * 0.3;
          weaponModel.rotation.x =
            originalRotation.x - Math.sin(progress * Math.PI) * (swingAngle * 0.5);
        } else {
          // Side slashing motion (good for swords)
          weaponModel.rotation.z = originalRotation.z - Math.sin(progress * Math.PI) * swingAngle;
          weaponModel.position.x = originalPosition.x + Math.sin(progress * Math.PI * 2) * 0.1;
        }

        requestAnimationFrame(animate);
      } else {
        // Reset rotation and position
        weaponModel.rotation.copy(originalRotation);
        weaponModel.position.copy(originalPosition);

        // Check for hits
        this.checkMeleeHits();

        // End attack
        this.isAttacking = false;
      }
    };

    // Start animation
    animate();
  }

  checkMeleeHits(): void {
    const weapon = this.weapons[this.currentWeapon];
    if (!weapon) return;

    // Get weapon range
    const range = weapon.range || 2;
    const damage = weapon.damage || 10;

    // Get camera direction
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(this.camera.quaternion);

    // Create a raycaster from the camera
    const raycaster = new THREE.Raycaster(this.camera.position, cameraDirection, 0, range);

    // Get all objects in the scene
    const objects: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (object.userData.canBeDamaged || object.userData.isEnemy) {
        objects.push(object);
      }
    });

    // Check for intersections
    const intersects = raycaster.intersectObjects(objects);

    // Process hits
    for (const intersect of intersects) {
      const object = intersect.object;

      // Check if object can be damaged
      if (object.userData.canBeDamaged) {
        console.log(`Hit object with ${this.currentWeapon} for ${damage} damage!`);
        // Add particle effect at hit point
        this.createHitEffect(intersect.point);

        // Trigger damage event
        const event = new CustomEvent("objectDamaged", {
          detail: {
            object: object,
            damage: damage,
            hitPoint: intersect.point,
            weaponType: this.currentWeapon,
          },
        });
        document.dispatchEvent(event);

        // Only process the first hit
        break;
      }
    }
  }

  createHitEffect(position: THREE.Vector3): void {
    // Create a particle system for hit effect
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    // Set all particles at hit position initially
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      particlePositions[i3] = position.x;
      particlePositions[i3 + 1] = position.y;
      particlePositions[i3 + 2] = position.z;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    // Material based on weapon type
    let particleColor = 0xffff00; // Default yellow
    if (this.currentWeapon === "dagger") {
      particleColor = 0xff0000; // Red for dagger
    } else if (this.currentWeapon === "sword" || this.currentWeapon === "betterSword") {
      particleColor = 0xffa500; // Orange for swords
    }

    const particleMaterial = new THREE.PointsMaterial({
      color: particleColor,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);

    // Animate particles
    interface ParticleVelocity {
      x: number;
      y: number;
      z: number;
    }

    const velocities: ParticleVelocity[] = [];
    for (let i = 0; i < particleCount; i++) {
      velocities.push({
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2 + 0.1,
        z: (Math.random() - 0.5) * 0.2,
      });
    }

    const startTime = performance.now();
    const duration = 500; // 500ms duration

    const animateParticles = () => {
      const now = performance.now();
      const elapsed = now - startTime;

      if (elapsed < duration) {
        const positions = particleGeometry.attributes.position.array;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3] += velocities[i].x;
          positions[i3 + 1] += velocities[i].y;
          positions[i3 + 2] += velocities[i].z;

          // Apply gravity
          velocities[i].y -= 0.01;
        }

        particleGeometry.attributes.position.needsUpdate = true;
        particleMaterial.opacity = 1 - elapsed / duration;

        requestAnimationFrame(animateParticles);
      } else {
        // Remove particles from scene after animation
        this.scene.remove(particles);
      }
    };

    animateParticles();
  }

  bowAttack(): void {
    if (!this.weapons.bow.model || !this.weapons.bow.arrow) return;

    // Show arrow
    const arrowModel = this.weapons.bow.arrow;
    arrowModel.visible = true;

    // Get original position and rotation
    const originalPosition = arrowModel.position.clone();

    // Animation timing
    const drawDuration = 0.5; // Time to draw the bow
    const startTime = performance.now();

    // Draw the bow animation
    const drawBow = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      if (elapsed < drawDuration) {
        // Pull back the arrow as the bow is drawn
        arrowModel.position.z = originalPosition.z + (elapsed / drawDuration) * 0.15;

        requestAnimationFrame(drawBow);
      } else {
        // Fire the arrow
        this.fireArrow();

        // Hide the arrow model
        arrowModel.visible = false;

        // Reset arrow position
        arrowModel.position.copy(originalPosition);

        // End attack
        this.isAttacking = false;
      }
    };

    // Start animation
    drawBow();
  }

  fireArrow(): void {
    // Create arrow for firing
    const arrowGroup = new THREE.Group();
    arrowGroup.name = "fired-arrow";

    // Arrow shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.3, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.1,
      roughness: 0.9,
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft);

    // Arrow head
    const headGeometry = new THREE.ConeGeometry(0.01, 0.05, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gray
      metalness: 0.7,
      roughness: 0.3,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.rotation.x = -Math.PI / 2;
    head.position.z = 0.17;
    arrowGroup.add(head);

    // Arrow fletching
    const fletchingGeometry = new THREE.BoxGeometry(0.03, 0.001, 0.03);
    const fletchingMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Red
      metalness: 0.1,
      roughness: 0.9,
    });
    const fletching = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
    fletching.rotation.y = Math.PI / 4;
    fletching.position.z = -0.13;
    arrowGroup.add(fletching);

    // Get camera position and direction
    const cameraPosition = this.camera.position.clone();
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(this.camera.quaternion);

    // Position the arrow at the camera position, slightly in front
    arrowGroup.position.copy(cameraPosition).add(cameraDirection.multiplyScalar(0.5));

    // Rotate the arrow to match the camera direction
    arrowGroup.lookAt(cameraPosition.clone().add(cameraDirection.clone().multiplyScalar(10)));

    // Add the arrow to the scene
    this.scene.add(arrowGroup);

    // Add to tracking array
    this.arrowsInFlight.push(arrowGroup);

    // Arrow properties
    const speed = 20; // Units per second
    const maxDistance = this.weapons.bow.range || 20;
    const startPosition = arrowGroup.position.clone();
    const damage = this.weapons.bow.damage || 15;

    // Update the arrow position over time
    const animateArrow = () => {
      // Move the arrow forward in its current direction
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(arrowGroup.quaternion);
      arrowGroup.position.add(forward.multiplyScalar(speed * 0.05));

      // Calculate distance traveled
      const distanceTraveled = arrowGroup.position.distanceTo(startPosition);

      // Check for collisions
      const raycaster = new THREE.Raycaster();
      const rayOrigin = arrowGroup.position.clone();
      raycaster.set(rayOrigin, forward);

      // Get all objects in the scene
      const objects: THREE.Object3D[] = [];
      this.scene.traverse((object) => {
        if (object.userData.canBeDamaged || object.userData.isEnemy) {
          objects.push(object);
        }
      });

      // Check for intersections
      const intersects = raycaster.intersectObjects(objects);

      if (intersects.length > 0 && intersects[0].distance < 1) {
        // Hit something!
        const hitPoint = intersects[0].point;
        const hitObject = intersects[0].object;

        console.log(`Arrow hit object for ${damage} damage!`);

        // Create impact effect
        this.createHitEffect(hitPoint);

        // Trigger damage event
        const event = new CustomEvent("objectDamaged", {
          detail: {
            object: hitObject,
            damage: damage,
            hitPoint: hitPoint,
            weaponType: "bow",
          },
        });
        document.dispatchEvent(event);

        // Remove arrow
        this.scene.remove(arrowGroup);
        this.arrowsInFlight = this.arrowsInFlight.filter((a) => a !== arrowGroup);
        return;
      }

      if (distanceTraveled < maxDistance) {
        // Continue animating
        requestAnimationFrame(animateArrow);
      } else {
        // Remove arrow after max distance
        this.scene.remove(arrowGroup);
        this.arrowsInFlight = this.arrowsInFlight.filter((a) => a !== arrowGroup);
      }
    };

    // Start animation
    animateArrow();
  }

  update(delta: number): void {
    // Update arrows in flight
    for (let i = this.arrowsInFlight.length - 1; i >= 0; i--) {
      const arrow = this.arrowsInFlight[i];

      // Check if arrow still exists in scene
      if (!arrow.parent) {
        this.arrowsInFlight.splice(i, 1);
        continue;
      }
    }

    // Check if player is moving using the movement flags
    const isPlayerMoving =
      this.player.moveForward ||
      this.player.moveBackward ||
      this.player.moveLeft ||
      this.player.moveRight;

    // Add subtle weapon bobbing animation while walking
    if (isPlayerMoving && !this.isAttacking) {
      const weaponModel = this.weapons[this.currentWeapon]?.model;

      if (weaponModel) {
        // Use sin wave to create bobbing effect based on time and movement
        const now = Date.now() / 1000;
        const bobAmount = Math.sin(now * 5) * 0.01;
        const swayAmount = Math.cos(now * 2.5) * 0.005;

        // Store original position/rotation if not already stored
        if (!weaponModel.userData.originalPosition) {
          weaponModel.userData.originalPosition = weaponModel.position.clone();
          weaponModel.userData.originalRotation = weaponModel.rotation.clone();
        }

        // Apply bobbing and swaying
        weaponModel.position.y = weaponModel.userData.originalPosition.y + bobAmount;
        weaponModel.rotation.z = weaponModel.userData.originalRotation.z + swayAmount;
      }
    } else if (!this.isAttacking) {
      // Reset position and rotation when not moving or attacking
      const weaponModel = this.weapons[this.currentWeapon]?.model;

      if (weaponModel && weaponModel.userData.originalPosition) {
        weaponModel.position.copy(weaponModel.userData.originalPosition);
        weaponModel.rotation.copy(weaponModel.userData.originalRotation);
      }
    }
  }

  isWeaponVisible(): boolean {
    if (!this.currentWeapon || !this.weapons[this.currentWeapon]) {
      return false;
    }

    const weapon = this.weapons[this.currentWeapon];
    if (!weapon.model) {
      return false;
    }

    return weapon.model.visible;
  }
}
