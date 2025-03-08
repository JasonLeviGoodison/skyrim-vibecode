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

  constructor(scene: THREE.Scene, camera: THREE.Camera, player: Player) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;

    // Weapon properties
    this.currentWeapon = "sword"; // 'sword' or 'bow'
    this.weapons = {
      sword: {
        damage: 20,
        range: 2,
        cooldown: 0.5,
        model: null,
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
    // Create sword model
    const swordGroup = new THREE.Group();
    swordGroup.name = "sword-model";

    // Sword handle
    const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.3,
      roughness: 0.8,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -0.1;
    swordGroup.add(handle);

    // Sword guard
    const guardGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.04);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold
      metalness: 0.7,
      roughness: 0.3,
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.z = -0.01;
    swordGroup.add(guard);

    // Sword blade
    const bladeGeometry = new THREE.BoxGeometry(0.05, 0.01, 0.5);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0, // Silver
      metalness: 0.9,
      roughness: 0.1,
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.z = 0.25;
    swordGroup.add(blade);

    // Position sword in front of camera
    swordGroup.position.set(0.3, -0.2, -0.5);
    swordGroup.rotation.y = Math.PI / 6;

    // Add sword to scene
    this.camera.add(swordGroup);
    this.weapons.sword.model = swordGroup;

    // Initially hide the sword until showCurrentWeapon is called
    swordGroup.visible = false;

    // Create better sword model
    const betterSwordGroup = new THREE.Group();

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

    // Position better sword in front of camera
    betterSwordGroup.position.set(0.3, -0.2, -0.5);
    betterSwordGroup.rotation.y = Math.PI / 6;
    betterSwordGroup.visible = false;

    // Add better sword to scene
    this.camera.add(betterSwordGroup);
    this.weapons.betterSword.model = betterSwordGroup;

    // Create bow model
    const bowGroup = new THREE.Group();

    // Bow body
    const bowCurve = new THREE.EllipseCurve(
      0,
      0, // Center x, y
      0.3,
      0.5, // x radius, y radius
      Math.PI / 2,
      (3 * Math.PI) / 2, // Start angle, end angle
      false, // Clockwise
      0 // Rotation
    );

    const bowPoints = bowCurve.getPoints(20);
    const bowGeometry = new THREE.BufferGeometry().setFromPoints(bowPoints);
    const bowMaterial = new THREE.LineBasicMaterial({ color: 0x8b4513, linewidth: 2 });
    const bow = new THREE.Line(bowGeometry, bowMaterial);
    bowGroup.add(bow);

    // Bow string
    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.5, 0),
      new THREE.Vector3(0, 0.5, 0),
    ]);
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const string = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(string);

    // Position bow in front of camera
    bowGroup.position.set(0.3, -0.2, -0.5);
    bowGroup.rotation.z = Math.PI / 2;
    bowGroup.visible = false;

    // Add bow to scene
    this.camera.add(bowGroup);
    this.weapons.bow.model = bowGroup;

    // Create arrow model
    const arrowGroup = new THREE.Group();

    // Arrow shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.3,
      roughness: 0.8,
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft);

    // Arrow head
    const headGeometry = new THREE.ConeGeometry(0.02, 0.05, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0, // Silver
      metalness: 0.9,
      roughness: 0.1,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.275;
    arrowGroup.add(head);

    // Arrow fletching
    const fletchingGeometry = new THREE.BoxGeometry(0.05, 0.01, 0.05);
    const fletchingMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Red
      metalness: 0.1,
      roughness: 0.9,
    });
    const fletching = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
    fletching.rotation.x = Math.PI / 2;
    fletching.position.z = -0.225;
    arrowGroup.add(fletching);

    // Position arrow in front of camera
    arrowGroup.position.set(0.3, -0.2, -0.3);
    arrowGroup.visible = false;

    // Add arrow to scene
    this.camera.add(arrowGroup);
    this.weapons.bow.arrow = arrowGroup;
  }

  showCurrentWeapon(): void {
    // Hide all weapons first
    if (this.weapons.sword.model) this.weapons.sword.model.visible = false;
    if (this.weapons.betterSword.model && this.weapons.betterSword.acquired)
      this.weapons.betterSword.model.visible = false;
    if (this.weapons.bow.model) this.weapons.bow.model.visible = false;

    // Show current weapon
    if (this.currentWeapon === "sword" && this.weapons.sword.model) {
      this.weapons.sword.model.visible = true;
      console.log("Sword is now visible");
    } else if (
      this.currentWeapon === "betterSword" &&
      this.weapons.betterSword.model &&
      this.weapons.betterSword.acquired
    ) {
      this.weapons.betterSword.model.visible = true;
    } else if (this.currentWeapon === "bow" && this.weapons.bow.model) {
      this.weapons.bow.model.visible = true;
    }
  }

  toggleWeapon(): void {
    // Toggle between sword and bow
    if (this.currentWeapon === "sword") {
      // Check if better sword is acquired
      if (this.weapons.betterSword.acquired) {
        this.currentWeapon = "betterSword";
      } else {
        this.currentWeapon = "bow";
      }
    } else if (this.currentWeapon === "betterSword") {
      this.currentWeapon = "bow";
    } else {
      this.currentWeapon = "sword";
    }

    // Show the current weapon
    this.showCurrentWeapon();

    // Update the weapon indicator
    this.updateWeaponIndicator();

    console.log("Switched to weapon: " + this.currentWeapon);
  }

  acquireBetterSword(): void {
    this.weapons.betterSword.acquired = true;
    console.log("Acquired better sword!");

    // Switch to better sword
    this.currentWeapon = "betterSword";
    this.weapons.sword.model!.visible = false;
    this.weapons.betterSword.model!.visible = true;
    this.weapons.bow.model!.visible = false;
    this.weapons.bow.arrow!.visible = false;

    // Update weapon indicator
    this.updateWeaponIndicator();
  }

  updateWeaponIndicator(): void {
    // Update weapon indicator text
    const weaponIndicator = document.getElementById("weapon-indicator");
    if (weaponIndicator) {
      let weaponName = "Sword";

      if (this.currentWeapon === "betterSword") {
        weaponName = "Enhanced Sword";
      } else if (this.currentWeapon === "bow") {
        weaponName = "Bow";
      }

      weaponIndicator.textContent = `Current Weapon: ${weaponName}`;
    }
  }

  attack(): void {
    // Check if attack is on cooldown
    const now = performance.now();
    if (now - this.lastAttackTime < this.attackCooldown * 1000) {
      return;
    }

    // Set last attack time
    this.lastAttackTime = now;

    // Attack with current weapon
    if (this.currentWeapon === "sword" || this.currentWeapon === "betterSword") {
      this.swordAttack();
    } else {
      this.bowAttack();
    }
  }

  swordAttack(): void {
    if (this.isAttacking) return;

    this.isAttacking = true;

    // Get current weapon
    const weapon = this.weapons[this.currentWeapon];
    const weaponModel = weapon.model;

    if (!weaponModel) return;

    // Store original position and rotation
    const originalPosition = weaponModel.position.clone();
    const originalRotation = weaponModel.rotation.clone();

    // Animate sword swing
    const animateSwing = () => {
      const now = performance.now();
      const elapsed = (now - this.lastAttackTime) / 1000;
      const duration = 0.3;

      if (elapsed < duration) {
        // Swing sword
        const progress = elapsed / duration;
        const swingAngle = (Math.sin(progress * Math.PI) * Math.PI) / 2;

        weaponModel.rotation.y = originalRotation.y + swingAngle;
        weaponModel.position.x = originalPosition.x - Math.sin(swingAngle) * 0.2;
        weaponModel.position.z = originalPosition.z - Math.cos(swingAngle) * 0.2;

        requestAnimationFrame(animateSwing);
      } else {
        // Reset sword position
        weaponModel.position.copy(originalPosition);
        weaponModel.rotation.copy(originalRotation);

        this.isAttacking = false;

        // Check for hits
        this.checkSwordHits();
      }
    };

    animateSwing();
  }

  checkSwordHits(): void {
    // Get current weapon
    const weapon = this.weapons[this.currentWeapon];

    // Create raycaster from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(), this.camera);

    // Get all objects in the scene
    const objects: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.isEnemy) {
        objects.push(object);
      }
    });

    // Check for hits
    const hits = raycaster.intersectObjects(objects);

    if (hits.length > 0 && hits[0].distance <= weapon.range) {
      const enemy = hits[0].object;
      console.log(`Hit enemy with ${this.currentWeapon} for ${weapon.damage} damage!`);

      // Apply damage to enemy
      if (enemy.userData.takeDamage) {
        enemy.userData.takeDamage(weapon.damage);
      }
    }
  }

  bowAttack(): void {
    if (this.isAttacking) return;

    this.isAttacking = true;

    // Get bow and arrow models
    const bow = this.weapons.bow.model;
    const arrowTemplate = this.weapons.bow.arrow;

    if (!bow || !arrowTemplate) return;

    // Create new arrow
    const arrow = arrowTemplate.clone();
    arrow.visible = true;

    // Position arrow in front of camera
    arrow.position.set(0, 0, -0.5);
    this.camera.add(arrow);

    // Store arrow direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);

    // Store arrow position
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(arrow.matrixWorld);

    // Remove arrow from camera
    this.camera.remove(arrow);

    // Add arrow to scene
    arrow.position.copy(position);
    arrow.lookAt(position.clone().add(direction));
    this.scene.add(arrow);

    // Add arrow to arrows in flight
    this.arrowsInFlight.push(arrow);

    // Animate arrow
    const animateArrow = () => {
      // Move arrow forward
      const speed = 20;
      const distance = speed * 0.016; // Assuming 60 FPS

      arrow.translateZ(distance);

      // Check for hits
      const raycaster = new THREE.Raycaster();
      raycaster.set(arrow.position, direction);

      // Get all objects in the scene
      const objects: THREE.Object3D[] = [];
      this.scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          (object.userData.isEnemy || object.userData.isCollidable)
        ) {
          objects.push(object);
        }
      });

      // Check for hits
      const hits = raycaster.intersectObjects(objects);

      if (hits.length > 0 && hits[0].distance <= distance) {
        // Hit something
        const hitObject = hits[0].object;

        if (hitObject.userData.isEnemy) {
          console.log(`Hit enemy with arrow for ${this.weapons.bow.damage} damage!`);

          // Apply damage to enemy
          if (hitObject.userData.takeDamage) {
            hitObject.userData.takeDamage(this.weapons.bow.damage);
          }
        }

        // Remove arrow
        this.scene.remove(arrow);
        this.arrowsInFlight = this.arrowsInFlight.filter((a) => a !== arrow);

        return;
      }

      // Check if arrow has traveled too far
      if (arrow.position.distanceTo(position) > this.weapons.bow.range) {
        // Remove arrow
        this.scene.remove(arrow);
        this.arrowsInFlight = this.arrowsInFlight.filter((a) => a !== arrow);

        return;
      }

      // Continue animation
      requestAnimationFrame(animateArrow);
    };

    animateArrow();

    // Reset attacking state
    setTimeout(() => {
      this.isAttacking = false;
    }, 500);
  }

  update(delta: number): void {
    // Update arrows in flight
    for (let i = this.arrowsInFlight.length - 1; i >= 0; i--) {
      const arrow = this.arrowsInFlight[i];

      // Apply gravity to arrow
      arrow.translateY(-9.8 * delta * 0.1);
    }
  }
}
