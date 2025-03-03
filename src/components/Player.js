import * as THREE from "three";

export class Player {
  constructor(camera, scene, controls) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;

    // Movement properties
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.canJump = true;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.speed = 10.0;
    this.jumpHeight = 10.0;
    this.gravity = 30.0;

    // Player properties
    this.height = 1.6; // Player height in blocks
    this.radius = 0.5; // Player collision radius
    this.health = 100;
    this.maxHealth = 100;

    // Raycaster for collision detection and interaction
    this.raycaster = new THREE.Raycaster();
    this.interactionDistance = 3; // How far the player can interact with objects

    // Collision detection
    this.collisionRaycaster = new THREE.Raycaster();
    this.collisionDirections = [
      new THREE.Vector3(1, 0, 0), // Right
      new THREE.Vector3(-1, 0, 0), // Left
      new THREE.Vector3(0, 0, 1), // Forward
      new THREE.Vector3(0, 0, -1), // Backward
      new THREE.Vector3(0.7, 0, 0.7), // Forward-Right
      new THREE.Vector3(-0.7, 0, 0.7), // Forward-Left
      new THREE.Vector3(0.7, 0, -0.7), // Backward-Right
      new THREE.Vector3(-0.7, 0, -0.7), // Backward-Left
    ];

    // Reference to the world for terrain height checks
    this.world = null;

    // Update health UI
    this.updateHealthUI();
  }

  setWorld(world) {
    this.world = world;
  }

  update(delta) {
    if (!this.world) return;

    const position = this.controls.getObject().position;

    // Check for collisions with objects in all directions
    // This is needed both outside and inside buildings
    this.checkAllDirectionCollisions();

    // If inside a building, we don't need terrain collision checks
    if (this.insideBuilding) {
      // Apply gravity
      this.velocity.y -= this.gravity * delta;

      // Apply vertical velocity (gravity or jumping)
      position.y += this.velocity.y * delta;

      // Prevent falling through the floor
      if (position.y < this.height) {
        position.y = this.height;
        this.velocity.y = 0;
        this.canJump = true;
      }

      // Calculate movement
      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize();

      // Calculate velocity
      if (this.moveForward || this.moveBackward) {
        this.velocity.z = this.direction.z * this.speed;
      } else {
        this.velocity.z = 0;
      }

      if (this.moveLeft || this.moveRight) {
        this.velocity.x = this.direction.x * this.speed;
      } else {
        this.velocity.x = 0;
      }

      // Store current position before movement
      const oldPosition = position.clone();

      // Calculate new position
      const newPosition = oldPosition.clone();
      newPosition.x += this.velocity.x * delta;
      newPosition.z += this.velocity.z * delta;

      // Check for object collisions
      if (!this.checkObjectCollisions(oldPosition, newPosition)) {
        // No collision, apply horizontal velocity
        this.controls.moveRight(this.velocity.x * delta);
        this.controls.moveForward(this.velocity.z * delta);
      }

      return;
    }

    // Get terrain height at current position using interpolation for smoother movement
    const terrainHeight = this.world.getInterpolatedHeightAt(position.x, position.z);
    const playerHeightAboveTerrain = position.y - terrainHeight;

    // Apply gravity if above terrain
    if (playerHeightAboveTerrain > this.height) {
      this.velocity.y -= this.gravity * delta;
      this.canJump = false;
    } else {
      // On ground
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
      position.y = terrainHeight + this.height;
      this.canJump = true;
    }

    // Get movement direction
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    // Calculate velocity
    if (this.moveForward || this.moveBackward) {
      this.velocity.z = this.direction.z * this.speed;
    } else {
      this.velocity.z = 0;
    }

    if (this.moveLeft || this.moveRight) {
      this.velocity.x = this.direction.x * this.speed;
    } else {
      this.velocity.x = 0;
    }

    // Store current position before movement
    const oldPosition = position.clone();

    // Calculate new position
    const newPosition = oldPosition.clone();
    newPosition.x += this.velocity.x * delta;
    newPosition.z += this.velocity.z * delta;

    // Check for object collisions
    if (!this.checkObjectCollisions(oldPosition, newPosition)) {
      // No collision, apply horizontal velocity
      this.controls.moveRight(this.velocity.x * delta);
      this.controls.moveForward(this.velocity.z * delta);

      // Check for terrain collision after horizontal movement
      const newTerrainHeight = this.world.getInterpolatedHeightAt(position.x, position.z);
      const heightDifference = newTerrainHeight - terrainHeight;

      // If trying to go up a slope that's too steep (more than 1 unit difference), revert movement
      if (heightDifference > 1.0 && playerHeightAboveTerrain <= this.height) {
        position.copy(oldPosition);
      } else {
        // Apply vertical velocity (gravity or jumping)
        position.y += this.velocity.y * delta;

        // Ensure player doesn't go below terrain
        const finalTerrainHeight = this.world.getInterpolatedHeightAt(position.x, position.z);
        if (position.y < finalTerrainHeight + this.height) {
          position.y = finalTerrainHeight + this.height;
          this.velocity.y = 0;
          this.canJump = true;
        }
      }
    }
  }

  checkObjectCollisions(oldPosition, newPosition) {
    // Calculate movement direction
    const moveDirection = new THREE.Vector3().subVectors(newPosition, oldPosition).normalize();

    // Set up raycaster from player position in movement direction
    this.collisionRaycaster.set(
      oldPosition.clone().setY(oldPosition.y - this.height / 2), // Start at player's center
      moveDirection
    );

    // Get all objects in the scene that are collidable
    const collidableObjects = this.scene.children.filter(
      (obj) => obj.userData && obj.userData.isCollidable
    );

    // Add interior objects if inside a building
    if (this.insideBuilding && this.interiorGroup) {
      // Add all interior objects that are collidable
      this.interiorGroup.traverse((obj) => {
        if (obj.userData && obj.userData.isCollidable) {
          collidableObjects.push(obj);
        }
      });
    }

    // Check for collisions with all objects and their children
    const intersects = this.collisionRaycaster.intersectObjects(collidableObjects, true);

    // Check if there's a collision within the player's radius
    return intersects.length > 0 && intersects[0].distance < this.radius;
  }

  // Check collisions in all directions
  checkAllDirectionCollisions() {
    const position = this.controls.getObject().position.clone();
    position.y -= this.height / 2; // Adjust to player's center

    // Also check for vertical collisions
    this.checkVerticalCollisions(position);

    // Get all objects in the scene that are collidable
    const collidableObjects = this.scene.children.filter(
      (obj) => obj.userData && obj.userData.isCollidable
    );

    // Add interior objects if inside a building
    if (this.insideBuilding && this.interiorGroup) {
      // Add all interior objects that are collidable
      this.interiorGroup.traverse((obj) => {
        if (obj.userData && obj.userData.isCollidable) {
          collidableObjects.push(obj);
        }
      });
    }

    // Check for collisions in all directions
    for (const direction of this.collisionDirections) {
      this.collisionRaycaster.set(position, direction);

      // Check for collisions with all objects and their children
      const intersects = this.collisionRaycaster.intersectObjects(collidableObjects, true);

      // If there's a collision within the player's radius, adjust position
      if (intersects.length > 0 && intersects[0].distance < this.radius) {
        // Calculate push-back vector
        const pushBack = direction.clone().multiplyScalar(-(this.radius - intersects[0].distance));
        this.controls.getObject().position.add(pushBack);
      }
    }

    // Add downward collision check to prevent falling through floors
    const downDirection = new THREE.Vector3(0, -1, 0);
    this.collisionRaycaster.set(position, downDirection);

    // Check for collisions with all objects and their children
    const downIntersects = this.collisionRaycaster.intersectObjects(collidableObjects, true);

    // If there's a collision within the player's height, adjust position
    if (downIntersects.length > 0 && downIntersects[0].distance < this.height / 2) {
      // Calculate push-back vector to keep player above the floor
      const pushBack = new THREE.Vector3(0, this.height / 2 - downIntersects[0].distance, 0);
      this.controls.getObject().position.add(pushBack);

      // Reset vertical velocity and allow jumping
      this.velocity.y = 0;
      this.canJump = true;
    }
  }

  // Check for collisions above the player
  checkVerticalCollisions(position) {
    // Check upward for ceilings and other objects
    const upDirection = new THREE.Vector3(0, 1, 0);
    this.collisionRaycaster.set(position, upDirection);

    // Get all objects in the scene that are collidable
    const collidableObjects = this.scene.children.filter(
      (obj) => obj.userData && obj.userData.isCollidable
    );

    // Add interior objects if inside a building
    if (this.insideBuilding && this.interiorGroup) {
      // Add all interior objects that are collidable
      this.interiorGroup.traverse((obj) => {
        if (obj.userData && obj.userData.isCollidable) {
          collidableObjects.push(obj);
        }
      });
    }

    // Check for collisions with all objects and their children
    const intersects = this.collisionRaycaster.intersectObjects(collidableObjects, true);

    // If there's a collision within the player's height + a small buffer, adjust position
    if (intersects.length > 0 && intersects[0].distance < this.height + 0.5) {
      // Push player down slightly
      const pushBack = new THREE.Vector3(0, -0.1, 0);
      this.controls.getObject().position.add(pushBack);

      // Stop upward velocity
      if (this.velocity.y > 0) {
        this.velocity.y = 0;
      }
    }
  }

  jump() {
    if (this.canJump) {
      this.velocity.y = this.jumpHeight;
      this.canJump = false;
    }
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.updateHealthUI();

    if (this.health <= 0) {
      this.die();
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.updateHealthUI();
  }

  die() {
    // Reset player position
    this.controls.getObject().position.set(0, this.height, 0);
    this.velocity.set(0, 0, 0);

    // Reset health
    this.health = this.maxHealth;
    this.updateHealthUI();
  }

  updateHealthUI() {
    // Update health bar
    const healthFill = document.getElementById("health-fill");
    const healthText = document.getElementById("health-text");

    if (healthFill && healthText) {
      healthFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
      healthText.textContent = `Health: ${this.health}/${this.maxHealth}`;
    }
  }

  interact(chestSystem) {
    // Set up raycaster from camera
    const raycaster = new THREE.Raycaster();
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    raycaster.set(this.camera.position, cameraDirection);

    // Check if player is inside a building and wants to exit
    if (this.insideBuilding) {
      // When inside, check if player is near the door to exit
      const doorPosition = new THREE.Vector3(0, 1.5, 7); // Door position in interior map
      const playerPos = this.controls.getObject().position;
      const distanceToDoor = playerPos.distanceTo(doorPosition);

      if (distanceToDoor < 3) {
        this.exitBuilding();
        return true;
      }

      // If not near door, show a hint message
      this.showMessage("Go to the door to exit the building.");
      return false;
    }

    // Check for chest interactions
    if (chestSystem) {
      // Get all chest meshes and their children for interaction
      const chestMeshes = [];
      chestSystem.chests.forEach((chest) => {
        chestMeshes.push(chest.mesh);
        // Also add all children of the chest mesh
        if (chest.mesh.children) {
          chest.mesh.children.forEach((child) => {
            chestMeshes.push(child);
          });
        }
      });

      // Intersect with all chest meshes
      const intersects = raycaster.intersectObjects(chestMeshes);

      if (intersects.length > 0 && intersects[0].distance < 3) {
        // Find which chest was hit (either directly or one of its children)
        const hitObject = intersects[0].object;
        let chestIndex = chestSystem.chests.findIndex((chest) => chest.mesh === hitObject);

        // If not found directly, check if it's a child of a chest
        if (chestIndex === -1) {
          chestIndex = chestSystem.chests.findIndex(
            (chest) =>
              chest.mesh.children && chest.mesh.children.some((child) => child === hitObject)
          );
        }

        if (chestIndex !== -1) {
          chestSystem.openChest(chestIndex);
          return true;
        }
      }
    }

    // Check for interactable objects in the scene
    const sceneIntersects = raycaster.intersectObjects(this.scene.children, true);
    for (const intersect of sceneIntersects) {
      if (
        intersect.distance < this.interactionDistance &&
        intersect.object.userData &&
        intersect.object.userData.isInteractable
      ) {
        // Handle interaction with the object
        console.log("Interacting with object:", intersect.object);

        // If it's a chest, find and open it
        if (chestSystem) {
          const chestIndex = chestSystem.chests.findIndex(
            (chest) =>
              chest.mesh === intersect.object || chest.mesh.children.includes(intersect.object)
          );
          if (chestIndex !== -1) {
            chestSystem.openChest(chestIndex);
            return true;
          }
        }

        return true;
      }
    }

    // Check for door interactions (only if not inside a building)
    if (!this.insideBuilding && this.scene) {
      // Cast ray to detect doors
      const intersects = raycaster.intersectObjects(this.scene.children, true);

      for (const intersect of intersects) {
        // Check if the object is a door or part of a building
        if (
          intersect.distance < 3 &&
          ((intersect.object.userData && intersect.object.userData.isDoor) ||
            this.isPartOfBuilding(intersect.object))
        ) {
          // Find which building this door belongs to
          const building = this.findBuildingFromObject(intersect.object);

          if (building) {
            this.enterBuilding(building);
            return true;
          }
        }
      }
    }

    return false;
  }

  isPartOfBuilding(object) {
    // Check if object is part of a building by traversing up the parent chain
    let current = object;
    while (current) {
      if (current.userData && current.userData.isBuilding) {
        return true;
      }
      current = current.parent;
    }

    // Also check if it's a door by material color
    if (object.material && object.material.color) {
      const color = object.material.color.getHex();
      if (color === 0x4d2600) {
        // Dark brown (door color)
        return true;
      }
    }

    return false;
  }

  findBuildingFromObject(object) {
    // Find which building an object belongs to
    if (!this.world || !this.world.buildings) return null;

    // Check if the object is directly part of a building group
    for (const building of this.world.buildings) {
      if (building.group.children.includes(object)) {
        return building;
      }

      // Check if the object is a child of any mesh in the building group
      for (const child of building.group.children) {
        if (child === object || (child.children && child.children.includes(object))) {
          return building;
        }
      }
    }

    return null;
  }

  enterBuilding(building) {
    // Store the player's current position for exiting later
    this.lastOutsidePosition = this.controls.getObject().position.clone();

    // Mark that the player is inside a building
    this.insideBuilding = building;

    // Clear the current scene except for the player
    this.clearSceneForInterior();

    // Create interior environment
    this.createInteriorEnvironment();

    // Make sure all interior objects are collidable
    this.interiorGroup.traverse((object) => {
      if (object.isMesh && object !== this.interiorGroup) {
        // Don't make the door collidable so player can exit
        if (object.userData && !object.userData.isDoor) {
          object.userData.isCollidable = true;
        }
      }
    });

    // Position player inside the building near the door
    this.controls.getObject().position.set(0, this.height, 5);
    this.velocity.set(0, 0, 0);

    // Display a message to the player
    this.showMessage("You entered the building. Go to the door to exit.");
  }

  clearSceneForInterior() {
    // Store a reference to the original scene objects
    this.outsideSceneObjects = [];

    // Clone the scene children array to avoid modification during iteration
    const children = [...this.scene.children];

    for (const object of children) {
      // Skip the player camera and any UI elements
      if (object === this.controls.getObject()) continue;

      // Store the object for later restoration
      this.outsideSceneObjects.push(object);

      // Remove from scene
      this.scene.remove(object);
    }

    // Set up basic lighting for interior
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);
  }

  createInteriorEnvironment() {
    // Create a group for all interior objects
    this.interiorGroup = new THREE.Group();
    this.scene.add(this.interiorGroup);

    // Materials
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Tan
      flatShading: true,
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4d2600, // Dark brown
      flatShading: true,
    });

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gray
      flatShading: true,
    });

    const fireMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4500, // Orange-red
      emissive: 0xff4500,
      emissiveIntensity: 0.5,
    });

    // Room dimensions
    const roomWidth = 15;
    const roomDepth = 15;
    const roomHeight = 5;

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
    floorGeometry.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    floor.userData.isCollidable = true;
    this.interiorGroup.add(floor);

    // Create walls
    // Front wall (with door)
    const frontWallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, 0.2);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, roomHeight / 2, roomDepth / 2);
    frontWall.receiveShadow = true;
    frontWall.castShadow = true;
    frontWall.userData.isCollidable = true;
    this.interiorGroup.add(frontWall);

    // Door in front wall
    const doorWidth = 2;
    const doorHeight = 3;
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.3);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, doorHeight / 2, roomDepth / 2 + 0.1);
    door.userData.isDoor = true;
    door.userData.isCollidable = true;
    this.interiorGroup.add(door);

    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, 0.2);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, roomHeight / 2, -roomDepth / 2);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    backWall.userData.isCollidable = true;
    this.interiorGroup.add(backWall);

    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(0.2, roomHeight, roomDepth);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData.isCollidable = true;
    this.interiorGroup.add(leftWall);

    // Right wall
    const rightWallGeometry = new THREE.BoxGeometry(0.2, roomHeight, roomDepth);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    rightWall.userData.isCollidable = true;
    this.interiorGroup.add(rightWall);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
    ceilingGeometry.rotateX(Math.PI / 2);
    const ceiling = new THREE.Mesh(ceilingGeometry, wallMaterial);
    ceiling.position.set(0, roomHeight, 0);
    ceiling.receiveShadow = true;
    ceiling.userData.isCollidable = true;
    this.interiorGroup.add(ceiling);

    // Add fireplace on the back wall
    const fireplaceWidth = 3;
    const fireplaceDepth = 1;
    const fireplaceHeight = 3;

    // Fireplace base
    const fireplaceBaseGeometry = new THREE.BoxGeometry(fireplaceWidth, 1, fireplaceDepth);
    const fireplaceBase = new THREE.Mesh(fireplaceBaseGeometry, stoneMaterial);
    fireplaceBase.position.set(0, 0.5, -roomDepth / 2 + fireplaceDepth / 2);
    fireplaceBase.userData.isCollidable = true;
    this.interiorGroup.add(fireplaceBase);

    // Fireplace sides
    const fireplaceSideGeometry = new THREE.BoxGeometry(0.5, fireplaceHeight, fireplaceDepth);

    const fireplaceSideLeft = new THREE.Mesh(fireplaceSideGeometry, stoneMaterial);
    fireplaceSideLeft.position.set(
      -fireplaceWidth / 2 + 0.25,
      fireplaceHeight / 2,
      -roomDepth / 2 + fireplaceDepth / 2
    );
    fireplaceSideLeft.userData.isCollidable = true;
    this.interiorGroup.add(fireplaceSideLeft);

    const fireplaceSideRight = new THREE.Mesh(fireplaceSideGeometry, stoneMaterial);
    fireplaceSideRight.position.set(
      fireplaceWidth / 2 - 0.25,
      fireplaceHeight / 2,
      -roomDepth / 2 + fireplaceDepth / 2
    );
    fireplaceSideRight.userData.isCollidable = true;
    this.interiorGroup.add(fireplaceSideRight);

    // Fireplace top
    const fireplaceTopGeometry = new THREE.BoxGeometry(fireplaceWidth, 0.5, fireplaceDepth);
    const fireplaceTop = new THREE.Mesh(fireplaceTopGeometry, stoneMaterial);
    fireplaceTop.position.set(0, fireplaceHeight - 0.25, -roomDepth / 2 + fireplaceDepth / 2);
    fireplaceTop.userData.isCollidable = true;
    this.interiorGroup.add(fireplaceTop);

    // Fire
    const fireGeometry = new THREE.BoxGeometry(fireplaceWidth - 0.6, 0.8, fireplaceDepth - 0.2);
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.set(0, 1, -roomDepth / 2 + fireplaceDepth / 2);
    // Fire is not collidable
    this.interiorGroup.add(fire);

    // Add desk on the right wall
    const deskWidth = 3;
    const deskDepth = 1.5;
    const deskHeight = 1.2;

    // Desk top
    const deskTopGeometry = new THREE.BoxGeometry(deskWidth, 0.2, deskDepth);
    const deskTop = new THREE.Mesh(deskTopGeometry, woodMaterial);
    deskTop.position.set(roomWidth / 2 - deskDepth / 2 - 0.5, deskHeight, 0);
    deskTop.rotation.y = Math.PI / 2;
    deskTop.userData.isCollidable = true;
    this.interiorGroup.add(deskTop);

    // Desk legs
    const deskLegGeometry = new THREE.BoxGeometry(0.2, deskHeight, 0.2);

    for (let i = 0; i < 4; i++) {
      const legX =
        roomWidth / 2 - deskDepth / 2 - 0.5 + (i < 2 ? -deskDepth / 2 + 0.1 : deskDepth / 2 - 0.1);
      const legZ = i % 2 === 0 ? -deskWidth / 2 + 0.1 : deskWidth / 2 - 0.1;

      const deskLeg = new THREE.Mesh(deskLegGeometry, woodMaterial);
      deskLeg.position.set(legX, deskHeight / 2, legZ);
      deskLeg.userData.isCollidable = true;
      this.interiorGroup.add(deskLeg);
    }

    // Add bed on the left wall
    const bedWidth = 3;
    const bedLength = 6;
    const bedHeight = 0.8;

    // Bed base
    const bedBaseGeometry = new THREE.BoxGeometry(bedWidth, bedHeight, bedLength);
    const bedBase = new THREE.Mesh(bedBaseGeometry, woodMaterial);
    bedBase.position.set(
      -roomWidth / 2 + bedWidth / 2 + 0.5,
      bedHeight / 2,
      -roomDepth / 2 + bedLength / 2 + 2
    );
    bedBase.userData.isCollidable = true;
    this.interiorGroup.add(bedBase);

    // Bed mattress
    const mattressGeometry = new THREE.BoxGeometry(bedWidth - 0.2, 0.3, bedLength - 0.2);
    const mattressMaterial = new THREE.MeshStandardMaterial({ color: 0x964b00 });
    const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
    mattress.position.set(
      -roomWidth / 2 + bedWidth / 2 + 0.5,
      bedHeight + 0.15,
      -roomDepth / 2 + bedLength / 2 + 2
    );
    mattress.userData.isCollidable = true;
    this.interiorGroup.add(mattress);

    // Bed pillow
    const pillowGeometry = new THREE.BoxGeometry(bedWidth - 0.6, 0.2, 1);
    const pillowMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
    const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
    pillow.position.set(-roomWidth / 2 + bedWidth / 2 + 0.5, bedHeight + 0.4, -roomDepth / 2 + 1.5);
    pillow.userData.isCollidable = true;
    this.interiorGroup.add(pillow);

    // Add chest near the door
    const chestWidth = 2;
    const chestDepth = 1;
    const chestHeight = 1;

    // Chest base
    const chestBaseGeometry = new THREE.BoxGeometry(chestWidth, chestHeight * 0.7, chestDepth);
    const chestBase = new THREE.Mesh(chestBaseGeometry, woodMaterial);
    chestBase.position.set(
      roomWidth / 2 - chestWidth / 2 - 1,
      chestHeight * 0.35,
      roomDepth / 2 - chestDepth / 2 - 2
    );
    chestBase.userData.isCollidable = true;
    this.interiorGroup.add(chestBase);

    // Chest lid
    const chestLidGeometry = new THREE.BoxGeometry(chestWidth, chestHeight * 0.3, chestDepth);
    const chestLid = new THREE.Mesh(chestLidGeometry, woodMaterial);
    chestLid.position.set(
      roomWidth / 2 - chestWidth / 2 - 1,
      chestHeight * 0.85,
      roomDepth / 2 - chestDepth / 2 - 2
    );
    chestLid.userData.isCollidable = true;
    this.interiorGroup.add(chestLid);

    // Add metal details to chest
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Add lock
    const lockGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const lock = new THREE.Mesh(lockGeometry, metalMaterial);
    lock.position.set(
      roomWidth / 2 - chestWidth / 2 - 1,
      chestHeight * 0.7,
      roomDepth / 2 - chestDepth / 2 - 2 + chestDepth / 2 + 0.05
    );
    this.interiorGroup.add(lock);

    // Make all interior objects collidable
    this.interiorGroup.traverse((object) => {
      if (object.isMesh) {
        object.userData.isCollidable = true;
      }
    });
  }

  exitBuilding() {
    if (!this.insideBuilding || !this.lastOutsidePosition) return;

    // Remove interior environment
    if (this.interiorGroup) {
      this.scene.remove(this.interiorGroup);
      this.interiorGroup = null;
    }

    // Remove interior lights
    const children = [...this.scene.children];
    for (const object of children) {
      if (object instanceof THREE.Light && object !== this.controls.getObject()) {
        this.scene.remove(object);
      }
    }

    // Restore outside scene
    if (this.outsideSceneObjects) {
      for (const object of this.outsideSceneObjects) {
        this.scene.add(object);
      }
      this.outsideSceneObjects = null;
    }

    // Teleport the player back outside
    this.controls.getObject().position.copy(this.lastOutsidePosition);

    // Move the player slightly away from the building to prevent re-entry
    const doorSide = this.insideBuilding.entranceSide;
    const moveDistance = 2;

    switch (doorSide) {
      case 0: // Front
        this.controls.getObject().position.z += moveDistance;
        break;
      case 1: // Right
        this.controls.getObject().position.x += moveDistance;
        break;
      case 2: // Back
        this.controls.getObject().position.z -= moveDistance;
        break;
      case 3: // Left
        this.controls.getObject().position.x -= moveDistance;
        break;
    }

    // Clear the building reference
    this.insideBuilding = null;

    // Display a message
    this.showMessage("You exited the building.");
  }

  showMessage(text, duration = 3000) {
    // Create or update message element
    let messageEl = document.getElementById("game-message");

    if (!messageEl) {
      messageEl = document.createElement("div");
      messageEl.id = "game-message";
      messageEl.style.position = "absolute";
      messageEl.style.top = "50%";
      messageEl.style.left = "50%";
      messageEl.style.transform = "translate(-50%, -50%)";
      messageEl.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      messageEl.style.color = "white";
      messageEl.style.padding = "10px 20px";
      messageEl.style.borderRadius = "5px";
      messageEl.style.fontFamily = "Arial, sans-serif";
      messageEl.style.fontSize = "18px";
      messageEl.style.textAlign = "center";
      messageEl.style.zIndex = "1000";
      messageEl.style.pointerEvents = "none";
      document.body.appendChild(messageEl);
    }

    // Set message text
    messageEl.textContent = text;
    messageEl.style.display = "block";

    // Hide message after duration
    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      messageEl.style.display = "none";
    }, duration);
  }

  consumeItem(inventorySlot) {
    // Get inventory
    const inventory = document.getElementById("inventory-items");

    if (inventory && inventory.children.length > inventorySlot) {
      const slot = inventory.children[inventorySlot];

      // Check if slot has an item
      if (slot.dataset.item) {
        const item = JSON.parse(slot.dataset.item);

        // Check if item is food
        if (item.type === "food") {
          // Heal player
          this.heal(item.healAmount);

          // Remove item from inventory
          slot.innerHTML = "";
          slot.dataset.item = "";

          console.log(`Consumed ${item.name} and healed ${item.healAmount} health.`);
        }
      }
    }
  }
}
