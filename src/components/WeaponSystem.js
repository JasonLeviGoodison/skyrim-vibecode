import * as THREE from "three";

export class WeaponSystem {
  constructor(scene, camera, player) {
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
      },
    };

    this.lastAttackTime = 0;
    this.isAttacking = false;

    // Raycaster for hit detection
    this.raycaster = new THREE.Raycaster();

    // Create weapon models
    this.createWeaponModels();

    // Update weapon indicator
    this.updateWeaponIndicator();
  }

  createWeaponModels() {
    // Create sword model - a proper sword with blade, guard and handle
    const swordGroup = new THREE.Group();

    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.08, 0.6, 0.02);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.8,
      roughness: 0.2,
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.3, 0);
    swordGroup.add(blade);

    // Guard
    const guardGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.04);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      metalness: 0.5,
      roughness: 0.5,
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, 0, 0);
    swordGroup.add(guard);

    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.05, 0.2, 0.05);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      metalness: 0.1,
      roughness: 0.8,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.12, 0);
    swordGroup.add(handle);

    // Position sword in front of camera - closer to the player
    swordGroup.position.set(0.3, -0.2, -0.5);
    swordGroup.rotation.set(0, -Math.PI / 4, -Math.PI / 8);

    // Add sword to camera
    this.camera.add(swordGroup);
    this.weapons.sword.model = swordGroup;

    // Create better sword model - larger and more impressive
    const betterSwordGroup = new THREE.Group();

    // Better Blade
    const betterBladeGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.025);
    const betterBladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.9,
      roughness: 0.1,
    });
    const betterBlade = new THREE.Mesh(betterBladeGeometry, betterBladeMaterial);
    betterBlade.position.set(0, 0.4, 0);
    betterSwordGroup.add(betterBlade);

    // Better Guard
    const betterGuardGeometry = new THREE.BoxGeometry(0.25, 0.06, 0.05);
    const betterGuardMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8860b, // Dark goldenrod
      metalness: 0.7,
      roughness: 0.3,
    });
    const betterGuard = new THREE.Mesh(betterGuardGeometry, betterGuardMaterial);
    betterGuard.position.set(0, 0, 0);
    betterSwordGroup.add(betterGuard);

    // Better Handle
    const betterHandleGeometry = new THREE.BoxGeometry(0.06, 0.25, 0.06);
    const betterHandleMaterial = new THREE.MeshStandardMaterial({
      color: 0x800000, // Maroon
      metalness: 0.2,
      roughness: 0.7,
    });
    const betterHandle = new THREE.Mesh(betterHandleGeometry, betterHandleMaterial);
    betterHandle.position.set(0, -0.15, 0);
    betterSwordGroup.add(betterHandle);

    // Position better sword in front of camera - closer to the player
    betterSwordGroup.position.set(0.3, -0.2, -0.5);
    betterSwordGroup.rotation.set(0, -Math.PI / 4, -Math.PI / 8);
    betterSwordGroup.visible = false; // Hide until acquired

    // Add better sword to camera
    this.camera.add(betterSwordGroup);
    this.weapons.betterSword.model = betterSwordGroup;

    // Create bow model
    const bowGeometry = new THREE.TorusGeometry(0.3, 0.03, 16, 32, Math.PI);
    const bowMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const bow = new THREE.Mesh(bowGeometry, bowMaterial);

    // Add string to bow
    const stringGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.6, 8);
    const stringMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const string = new THREE.Mesh(stringGeometry, stringMaterial);
    string.rotation.set(0, 0, Math.PI / 2);
    bow.add(string);

    // Position bow in front of camera
    bow.position.set(0.3, -0.2, -0.5);
    bow.rotation.set(0, Math.PI / 2, 0);

    // Add bow to camera
    this.camera.add(bow);
    this.weapons.bow.model = bow;

    // Hide bow initially
    bow.visible = false;

    // Create arrow model
    const arrowGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

    // Add arrowhead
    const arrowheadGeometry = new THREE.ConeGeometry(0.03, 0.1, 8);
    const arrowheadMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const arrowhead = new THREE.Mesh(arrowheadGeometry, arrowheadMaterial);
    arrowhead.position.y = 0.3;
    arrow.add(arrowhead);

    // Add arrow to scene
    this.scene.add(arrow);
    this.weapons.bow.arrow = arrow;

    // Hide arrow initially
    arrow.visible = false;
  }

  toggleWeapon() {
    // Cycle through available weapons
    if (this.currentWeapon === "sword") {
      this.currentWeapon = this.weapons.betterSword.acquired ? "betterSword" : "bow";
    } else if (this.currentWeapon === "betterSword") {
      this.currentWeapon = "bow";
    } else {
      this.currentWeapon = "sword";
    }

    // Show current weapon
    this.weapons.sword.model.visible = this.currentWeapon === "sword";
    this.weapons.betterSword.model.visible = this.currentWeapon === "betterSword";
    this.weapons.bow.model.visible = this.currentWeapon === "bow";

    // Update weapon indicator
    this.updateWeaponIndicator();

    console.log(`Switched to ${this.currentWeapon}.`);
  }

  acquireBetterSword() {
    if (!this.weapons.betterSword.acquired) {
      this.weapons.betterSword.acquired = true;
      console.log("Acquired a better sword!");
      return true;
    }
    return false;
  }

  updateWeaponIndicator() {
    // Update weapon indicator
    const weaponIndicator = document.getElementById("weapon-indicator");

    if (weaponIndicator) {
      let weaponName = this.currentWeapon;
      if (weaponName === "betterSword") {
        weaponName = "Better Sword";
      } else {
        weaponName = weaponName.charAt(0).toUpperCase() + weaponName.slice(1);
      }
      weaponIndicator.textContent = `Current Weapon: ${weaponName}`;
    }
  }

  attack() {
    // Check cooldown
    const now = performance.now();
    if (now - this.lastAttackTime < this.weapons[this.currentWeapon].cooldown * 1000) {
      return;
    }

    // Set last attack time
    this.lastAttackTime = now;

    // Handle attack based on weapon
    if (this.currentWeapon === "sword" || this.currentWeapon === "betterSword") {
      this.swordAttack();
    } else if (this.currentWeapon === "bow") {
      this.bowAttack();
    }
  }

  swordAttack() {
    // Set attacking flag
    this.isAttacking = true;

    // Animate sword swing
    const sword = this.weapons[this.currentWeapon].model;
    const originalRotation = sword.rotation.clone();

    // Swing animation - modified to swing the blade outward
    const swingTween = {
      progress: 0,
      duration: 300, // ms
      startTime: performance.now(),
    };

    const animateSwing = () => {
      const now = performance.now();
      const elapsed = now - swingTween.startTime;
      swingTween.progress = Math.min(elapsed / swingTween.duration, 1);

      // Swing sword with blade moving outward (corrected direction)
      const swingProgress = Math.sin(swingTween.progress * Math.PI);
      sword.rotation.x = originalRotation.x - (swingProgress * Math.PI) / 4; // Reverse direction
      sword.rotation.y = originalRotation.y + (swingProgress * Math.PI) / 6; // Reverse direction

      // Move sword slightly forward during swing
      sword.position.z =
        this.currentWeapon === "sword" ? -0.5 - swingProgress * 0.2 : -0.5 - swingProgress * 0.2;

      if (swingTween.progress < 1) {
        requestAnimationFrame(animateSwing);
      } else {
        // Reset sword position and rotation
        sword.rotation.copy(originalRotation);
        sword.position.z = this.currentWeapon === "sword" ? -0.5 : -0.5;
        this.isAttacking = false;
      }
    };

    animateSwing();

    // Check for hits
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children);

    for (const intersect of intersects) {
      // Check if hit is within range
      if (intersect.distance <= this.weapons[this.currentWeapon].range) {
        // Check if hit object is an enemy
        if (intersect.object.userData.isEnemy) {
          // Damage enemy
          intersect.object.userData.takeDamage(this.weapons[this.currentWeapon].damage);
          console.log(`Hit enemy for ${this.weapons[this.currentWeapon].damage} damage.`);
          break;
        }
      }
    }
  }

  bowAttack() {
    // Set attacking flag
    this.isAttacking = true;

    // Get arrow
    const arrow = this.weapons.bow.arrow;

    // Position arrow at camera
    arrow.position.copy(this.camera.position);
    arrow.visible = true;

    // Get direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);

    // Set arrow rotation
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    // Shoot arrow
    const arrowSpeed = 20;
    const arrowVelocity = direction.multiplyScalar(arrowSpeed);

    // Arrow animation
    const animateArrow = () => {
      // Move arrow
      arrow.position.add(arrowVelocity.clone().multiplyScalar(0.016)); // Assuming 60fps

      // Check for hits
      const raycaster = new THREE.Raycaster(arrow.position, direction, 0, 1);
      const intersects = raycaster.intersectObjects(this.scene.children);

      let hit = false;

      for (const intersect of intersects) {
        // Skip arrow itself
        if (intersect.object === arrow || arrow.children.includes(intersect.object)) {
          continue;
        }

        // Check if hit object is an enemy
        if (intersect.object.userData.isEnemy) {
          // Damage enemy
          intersect.object.userData.takeDamage(this.weapons.bow.damage);
          console.log(`Arrow hit enemy for ${this.weapons.bow.damage} damage.`);
          hit = true;
          break;
        } else {
          // Hit something else
          hit = true;
          break;
        }
      }

      // Check if arrow is too far
      if (arrow.position.distanceTo(this.camera.position) > this.weapons.bow.range || hit) {
        // Hide arrow
        arrow.visible = false;
        this.isAttacking = false;
      } else {
        // Continue animation
        requestAnimationFrame(animateArrow);
      }
    };

    animateArrow();
  }

  update(delta) {
    // Any weapon updates can go here
  }
}
