import * as THREE from "three";
import { Furniture } from "./Furniture";

export class Building {
  constructor(scene, position, options = {}) {
    this.scene = scene;
    this.position = position.clone();
    this.options = {
      width: 15,
      depth: 15,
      height: 5,
      doorWidth: 2,
      doorHeight: 3.5,
      ...options,
    };

    this.interiorGroup = null;
    this.interiorObjects = [];
    this.entranceSide = options.entranceSide || "front"; // front, back, left, right
    this.furniture = [];
  }

  createExterior() {
    // Create exterior mesh for the building
    const geometry = new THREE.BoxGeometry(
      this.options.width,
      this.options.height,
      this.options.depth
    );

    const material = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Tan
      flatShading: true,
    });

    this.exteriorMesh = new THREE.Mesh(geometry, material);
    this.exteriorMesh.position.copy(this.position);
    this.exteriorMesh.position.y += this.options.height / 2;
    this.exteriorMesh.castShadow = true;
    this.exteriorMesh.receiveShadow = true;
    this.exteriorMesh.userData.isBuilding = true;
    this.exteriorMesh.userData.building = this;

    this.scene.add(this.exteriorMesh);

    // Add door
    this.addExteriorDoor();

    return this.exteriorMesh;
  }

  addExteriorDoor() {
    // Door dimensions
    const doorGeometry = new THREE.BoxGeometry(
      this.options.doorWidth,
      this.options.doorHeight,
      0.4
    );

    // Door materials with more distinctive colors
    const doorMaterialFront = new THREE.MeshStandardMaterial({
      color: 0x8b0000, // Dark red for more visibility
      flatShading: true,
      side: THREE.FrontSide,
    });

    const doorMaterialBack = new THREE.MeshStandardMaterial({
      color: 0x6d3600, // Brown for interior side
      flatShading: true,
      side: THREE.BackSide,
    });

    const doorFrameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold color for frame to make it stand out
      flatShading: true,
      metalness: 0.5,
      roughness: 0.5,
    });

    // Create door with materials for both sides
    const doorMaterials = [
      doorFrameMaterial, // Right side
      doorFrameMaterial, // Left side
      doorFrameMaterial, // Top
      doorFrameMaterial, // Bottom
      doorMaterialBack, // Back (interior side)
      doorMaterialFront, // Front (exterior side)
    ];

    // Create door with frame
    this.exteriorDoor = new THREE.Group();
    const doorMesh = new THREE.Mesh(doorGeometry, doorMaterials);
    this.exteriorDoor.add(doorMesh);

    // Add larger, more visible door handles
    const handleGeometry = new THREE.SphereGeometry(0.2, 12, 12); // Larger handles
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Gold color
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xd4af37,
      emissiveIntensity: 0.2, // Slight glow
    });

    // Front handle
    const frontDoorHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    frontDoorHandle.position.set(this.options.doorWidth / 2 - 0.3, 0, 0.3);
    doorMesh.add(frontDoorHandle);

    // Back handle
    const backDoorHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    backDoorHandle.position.set(this.options.doorWidth / 2 - 0.3, 0, -0.3);
    doorMesh.add(backDoorHandle);

    // Add door frame
    const frameWidth = 0.3; // Wider frame

    // Top frame
    const topFrameGeometry = new THREE.BoxGeometry(
      this.options.doorWidth + frameWidth * 2,
      frameWidth,
      0.6 // Thicker
    );
    const topFrame = new THREE.Mesh(topFrameGeometry, doorFrameMaterial);
    topFrame.position.set(0, this.options.doorHeight + frameWidth / 2, 0);
    this.exteriorDoor.add(topFrame);

    // Side frames
    const sideFrameGeometry = new THREE.BoxGeometry(
      frameWidth,
      this.options.doorHeight + frameWidth,
      0.6 // Thicker
    );
    const leftFrame = new THREE.Mesh(sideFrameGeometry, doorFrameMaterial);
    leftFrame.position.set(
      -this.options.doorWidth / 2 - frameWidth / 2,
      this.options.doorHeight / 2,
      0
    );
    this.exteriorDoor.add(leftFrame);

    const rightFrame = new THREE.Mesh(sideFrameGeometry, doorFrameMaterial);
    rightFrame.position.set(
      this.options.doorWidth / 2 + frameWidth / 2,
      this.options.doorHeight / 2,
      0
    );
    this.exteriorDoor.add(rightFrame);

    // Add a welcome sign above the door
    const signWidth = 2.0;
    const signHeight = 0.5;
    const signGeometry = new THREE.PlaneGeometry(signWidth, signHeight);

    // Create text for the welcome sign
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    context.fillStyle = "#4169E1"; // Royal Blue
    context.fillRect(0, 0, 256, 64);
    context.strokeStyle = "#FFD700"; // Gold
    context.lineWidth = 6;
    context.strokeRect(3, 3, 250, 58);
    context.fillStyle = "white";
    context.font = "bold 32px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("WELCOME", 128, 32);

    const textTexture = new THREE.CanvasTexture(canvas);
    const signMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide, // Visible from both sides
    });

    const welcomeSign = new THREE.Mesh(signGeometry, signMaterial);
    welcomeSign.position.set(0, this.options.doorHeight + 0.8, 0);
    welcomeSign.rotation.y = Math.PI; // Ensure it's visible from the approach side
    this.exteriorDoor.add(welcomeSign);

    // Add decorative lanterns on both sides of the door
    const lanternGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
    const lanternMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6347, // Tomato
      emissive: 0xff6347,
      emissiveIntensity: 0.8,
    });

    // Left lantern
    const leftLantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
    leftLantern.position.set(-this.options.doorWidth / 2 - 0.5, this.options.doorHeight / 2, 0.3);
    this.exteriorDoor.add(leftLantern);

    // Right lantern
    const rightLantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
    rightLantern.position.set(this.options.doorWidth / 2 + 0.5, this.options.doorHeight / 2, 0.3);
    this.exteriorDoor.add(rightLantern);

    // Position the door based on the entrance side
    let doorPosition = new THREE.Vector3();

    switch (this.entranceSide) {
      case "front":
        doorPosition.set(
          this.position.x,
          this.position.y + this.options.doorHeight / 2,
          this.position.z + this.options.depth / 2
        );
        break;
      case "back":
        doorPosition.set(
          this.position.x,
          this.position.y + this.options.doorHeight / 2,
          this.position.z - this.options.depth / 2
        );
        this.exteriorDoor.rotation.y = Math.PI;
        break;
      case "left":
        doorPosition.set(
          this.position.x - this.options.width / 2,
          this.position.y + this.options.doorHeight / 2,
          this.position.z
        );
        this.exteriorDoor.rotation.y = -Math.PI / 2;
        break;
      case "right":
        doorPosition.set(
          this.position.x + this.options.width / 2,
          this.position.y + this.options.doorHeight / 2,
          this.position.z
        );
        this.exteriorDoor.rotation.y = Math.PI / 2;
        break;
    }

    this.exteriorDoor.position.copy(doorPosition);
    this.exteriorDoor.userData.isDoor = true;
    this.exteriorDoor.userData.building = this;

    this.scene.add(this.exteriorDoor);
  }

  createInterior() {
    // Create a group for all interior objects
    this.interiorGroup = new THREE.Group();
    this.scene.add(this.interiorGroup);

    // Create room structure
    this.createRoomStructure();

    // Create fireplace
    this.createFireplace();

    // Create furniture
    this.createFurniture();

    return this.interiorGroup;
  }

  createRoomStructure() {
    const { width, depth, height } = this.options;

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

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    floorGeometry.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    floor.userData.isCollidable = true;
    this.interiorGroup.add(floor);
    this.interiorObjects.push(floor);

    // Create walls with proper collision boxes
    // Front wall (with door)
    const frontWallGeometry = new THREE.BoxGeometry(width, height, 0.2);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, height / 2, depth / 2);
    frontWall.receiveShadow = true;
    frontWall.castShadow = true;
    frontWall.userData.isCollidable = true;
    this.interiorGroup.add(frontWall);
    this.interiorObjects.push(frontWall);

    // Create a doorway (hole) in the front wall
    const doorwayWidth = this.options.doorWidth + 0.2; // Slightly wider than the door
    const doorwayHeight = this.options.doorHeight + 0.2; // Slightly taller than the door
    const doorwayGeometry = new THREE.BoxGeometry(doorwayWidth, doorwayHeight, 0.4);
    const doorwayMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const doorway = new THREE.Mesh(doorwayGeometry, doorwayMaterial);
    doorway.position.set(0, doorwayHeight / 2, depth / 2);
    // Use the stencil effect to create a "hole" in the wall
    doorway.material.colorWrite = false;
    doorway.material.depthWrite = false;
    doorway.renderOrder = 1;
    frontWall.renderOrder = 2;
    this.interiorGroup.add(doorway);

    // Create actual door with two-sided material
    const doorMaterialFront = new THREE.MeshStandardMaterial({
      color: 0x8b0000, // Dark red - same as exterior
      flatShading: true,
      side: THREE.FrontSide,
    });

    const doorMaterialBack = new THREE.MeshStandardMaterial({
      color: 0x8b0000, // Dark red - same as exterior
      flatShading: true,
      side: THREE.BackSide,
    });

    // Create door with materials for both sides
    const doorMaterials = [
      doorFrameMaterial, // Right side
      doorFrameMaterial, // Left side
      doorFrameMaterial, // Top
      doorFrameMaterial, // Bottom
      doorMaterialBack, // Back (interior side)
      doorMaterialFront, // Front (exterior side)
    ];

    // Create the door - thick enough to extend through both sides of the wall
    const doorGeometry = new THREE.BoxGeometry(
      this.options.doorWidth,
      this.options.doorHeight,
      0.6 // Thick enough to extend through the wall
    );

    const door = new THREE.Mesh(doorGeometry, doorMaterials);
    // Position exactly in the middle of the wall
    door.position.set(0, this.options.doorHeight / 2, depth / 2);
    door.userData.isDoor = true;

    // Add door handles on both sides
    const handleGeometry = new THREE.SphereGeometry(0.2, 12, 12); // Larger handles
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Gold color
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xd4af37,
      emissiveIntensity: 0.2,
    });

    // Front handle (exterior)
    const frontDoorHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    frontDoorHandle.position.set(this.options.doorWidth / 2 - 0.3, 0, 0.4);
    door.add(frontDoorHandle);

    // Back handle (interior)
    const backDoorHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    backDoorHandle.position.set(this.options.doorWidth / 2 - 0.3, 0, -0.4);
    door.add(backDoorHandle);

    // Add door frame
    const frameWidth = 0.3;

    // Top frame - make it extend through both sides
    const topFrameGeometry = new THREE.BoxGeometry(
      this.options.doorWidth + frameWidth * 2,
      frameWidth,
      0.8 // Thick enough to be visible from both sides
    );
    const topFrame = new THREE.Mesh(topFrameGeometry, doorFrameMaterial);
    topFrame.position.set(0, this.options.doorHeight + frameWidth / 2, depth / 2);
    this.interiorGroup.add(topFrame);

    // Side frames - make them extend through both sides
    const sideFrameGeometry = new THREE.BoxGeometry(
      frameWidth,
      this.options.doorHeight + frameWidth,
      0.8 // Thick enough to be visible from both sides
    );
    const leftFrame = new THREE.Mesh(sideFrameGeometry, doorFrameMaterial);
    leftFrame.position.set(
      -this.options.doorWidth / 2 - frameWidth / 2,
      this.options.doorHeight / 2,
      depth / 2
    );
    this.interiorGroup.add(leftFrame);

    const rightFrame = new THREE.Mesh(sideFrameGeometry, doorFrameMaterial);
    rightFrame.position.set(
      this.options.doorWidth / 2 + frameWidth / 2,
      this.options.doorHeight / 2,
      depth / 2
    );
    this.interiorGroup.add(rightFrame);

    // Do NOT mark the door as collidable so player can walk through it
    this.interiorGroup.add(door);

    // Create matching exit signs on both sides of the door
    // Interior exit sign
    const signWidth = 0.8;
    const signHeight = 0.3;
    const signGeometry = new THREE.PlaneGeometry(signWidth, signHeight);

    // Create canvas for the sign
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    context.fillStyle = "#00FF00";
    context.fillRect(0, 0, 128, 64);
    context.fillStyle = "black";
    context.font = "bold 48px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("EXIT", 64, 32);

    const textTexture = new THREE.CanvasTexture(canvas);
    const signMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide, // Visible from both sides
    });

    // Inside exit sign
    const exitSignInside = new THREE.Mesh(signGeometry, signMaterial);
    exitSignInside.position.set(0, this.options.doorHeight + 0.3, depth / 2 - 0.5);
    this.interiorGroup.add(exitSignInside);

    // Outside exit sign (on the interior side of the door)
    const exitSignOutside = new THREE.Mesh(signGeometry, signMaterial);
    exitSignOutside.position.set(0, this.options.doorHeight + 0.3, depth / 2 + 0.5);
    exitSignOutside.rotation.y = Math.PI; // Flip to face outside
    this.interiorGroup.add(exitSignOutside);

    // Store exit door position for easier reference
    this.exitDoorPosition = new THREE.Vector3(0, this.options.doorHeight / 2, depth / 2);

    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(width, height, 0.2);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    backWall.userData.isCollidable = true;
    this.interiorGroup.add(backWall);
    this.interiorObjects.push(backWall);

    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(0.2, height, depth);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData.isCollidable = true;
    this.interiorGroup.add(leftWall);
    this.interiorObjects.push(leftWall);

    // Right wall
    const rightWallGeometry = new THREE.BoxGeometry(0.2, height, depth);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    rightWall.userData.isCollidable = true;
    this.interiorGroup.add(rightWall);
    this.interiorObjects.push(rightWall);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(width, depth);
    ceilingGeometry.rotateX(Math.PI / 2);
    const ceiling = new THREE.Mesh(ceilingGeometry, wallMaterial);
    ceiling.position.set(0, height, 0);
    ceiling.receiveShadow = true;
    ceiling.userData.isCollidable = true;
    this.interiorGroup.add(ceiling);
    this.interiorObjects.push(ceiling);
  }

  createFireplace() {
    const { width, depth, height } = this.options;

    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gray
      flatShading: true,
    });

    const fireMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4500, // Orange-red
      emissive: 0xff4500,
      emissiveIntensity: 0.5,
    });

    // Fireplace dimensions
    const fireplaceWidth = 3;
    const fireplaceDepth = 1;
    const fireplaceHeight = 3;

    // Create a fireplace group to hold all components
    const fireplaceGroup = new THREE.Group();
    fireplaceGroup.position.set(0, 0, -depth / 2 + fireplaceDepth / 2);
    this.interiorGroup.add(fireplaceGroup);

    // Fireplace base
    const fireplaceBaseGeometry = new THREE.BoxGeometry(fireplaceWidth, 1, fireplaceDepth);
    const fireplaceBase = new THREE.Mesh(fireplaceBaseGeometry, stoneMaterial);
    fireplaceBase.position.set(0, 0.5, 0);
    fireplaceBase.userData.isCollidable = true;
    fireplaceGroup.add(fireplaceBase);
    this.interiorObjects.push(fireplaceBase);

    // Fireplace sides
    const fireplaceSideGeometry = new THREE.BoxGeometry(0.5, fireplaceHeight, fireplaceDepth);

    const fireplaceSideLeft = new THREE.Mesh(fireplaceSideGeometry, stoneMaterial);
    fireplaceSideLeft.position.set(-fireplaceWidth / 2 + 0.25, fireplaceHeight / 2, 0);
    fireplaceSideLeft.userData.isCollidable = true;
    fireplaceGroup.add(fireplaceSideLeft);
    this.interiorObjects.push(fireplaceSideLeft);

    const fireplaceSideRight = new THREE.Mesh(fireplaceSideGeometry, stoneMaterial);
    fireplaceSideRight.position.set(fireplaceWidth / 2 - 0.25, fireplaceHeight / 2, 0);
    fireplaceSideRight.userData.isCollidable = true;
    fireplaceGroup.add(fireplaceSideRight);
    this.interiorObjects.push(fireplaceSideRight);

    // Fireplace top
    const fireplaceTopGeometry = new THREE.BoxGeometry(fireplaceWidth, 0.5, fireplaceDepth);
    const fireplaceTop = new THREE.Mesh(fireplaceTopGeometry, stoneMaterial);
    fireplaceTop.position.set(0, fireplaceHeight - 0.25, 0);
    fireplaceTop.userData.isCollidable = true;
    fireplaceGroup.add(fireplaceTop);
    this.interiorObjects.push(fireplaceTop);

    // Fire - not collidable
    const fireGeometry = new THREE.BoxGeometry(fireplaceWidth - 0.6, 0.8, fireplaceDepth - 0.2);
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.set(0, 1, 0);
    fireplaceGroup.add(fire);
  }

  createFurniture() {
    const { width, depth } = this.options;

    // Create bed
    const bedPosition = new THREE.Vector3(-width / 2 + 2, 0, -depth / 2 + 5);
    this.bed = Furniture.create(this.scene, "bed", bedPosition, {
      width: 2.5,
      length: 5,
      height: 0.8,
    });
    this.furniture.push(this.bed);

    // Create desk
    const deskPosition = new THREE.Vector3(width / 2 - 1.5, 0, 0);
    this.desk = Furniture.create(this.scene, "desk", deskPosition, {
      width: 2.5,
      depth: 1.2,
      height: 1.3,
    });
    this.furniture.push(this.desk);

    // Create chair
    const chairPosition = new THREE.Vector3(width / 2 - 3, 0, 0);
    this.chair = Furniture.create(this.scene, "chair", chairPosition, {
      width: 0.9,
      depth: 0.9,
      seatHeight: 0.9,
    });
    this.furniture.push(this.chair);

    // Create chest
    const chestPosition = new THREE.Vector3(width / 2 - 2, 0, depth / 2 - 2);
    this.chest = Furniture.create(this.scene, "chest", chestPosition, {
      width: 1.8,
      depth: 1.2,
      height: 1.0,
    });
    this.furniture.push(this.chest);

    // Add all furniture items to the interior objects list for collision detection
    // Traverse furniture and add each part directly to the interiorObjects
    for (const item of this.furniture) {
      if (item && item.mesh) {
        // Add the group to the interior
        this.interiorGroup.add(item.mesh);

        // Add all meshes to interiorObjects for direct collision checking
        if (item.parts && item.parts.length > 0) {
          for (const part of item.parts) {
            if (part && part.mesh) {
              this.interiorObjects.push(part.mesh);
            }
          }
        }

        // Also capture any nested meshes by traversing the group
        item.mesh.traverse((object) => {
          if (object.isMesh && object.userData.isCollidable) {
            this.interiorObjects.push(object);
          }
        });
      }
    }
  }

  removeInterior() {
    if (this.interiorGroup) {
      this.scene.remove(this.interiorGroup);
      this.interiorGroup = null;
      this.interiorObjects = [];
      this.furniture = [];
    }
  }

  remove() {
    // Remove exterior
    if (this.exteriorMesh) {
      this.scene.remove(this.exteriorMesh);
    }

    if (this.exteriorDoor) {
      this.scene.remove(this.exteriorDoor);
    }

    // Remove interior
    this.removeInterior();
  }
}
