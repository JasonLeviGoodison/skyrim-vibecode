import * as THREE from "three";
import { Furniture } from "./Furniture";

export interface BuildingOptions {
  width?: number;
  depth?: number;
  height?: number;
  doorWidth?: number;
  doorHeight?: number;
  entranceSide?: string;
  [key: string]: any;
}

export class Building {
  scene: THREE.Scene;
  position: THREE.Vector3;
  options: BuildingOptions;
  interiorGroup: THREE.Group | null;
  interiorObjects: THREE.Object3D[];
  entranceSide: string;
  furniture: Furniture[];
  group: THREE.Group;

  constructor(scene: THREE.Scene, position: THREE.Vector3, options: BuildingOptions = {}) {
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
    this.group = new THREE.Group();

    // Create the building
    this.createExterior();
  }

  createExterior(): void {
    // Create exterior mesh for the building
    const geometry = new THREE.BoxGeometry(
      this.options.width!,
      this.options.height!,
      this.options.depth!
    );

    // Create material for the building
    const material = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Tan color
      flatShading: true,
    });

    // Create mesh
    const buildingMesh = new THREE.Mesh(geometry, material);
    buildingMesh.position.copy(this.position);
    buildingMesh.position.y += this.options.height! / 2; // Adjust to sit on ground
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;

    // Add to group
    this.group.add(buildingMesh);

    // Add door
    this.addExteriorDoor();

    // Add to scene
    this.scene.add(this.group);

    // Set userData for collision detection
    buildingMesh.userData.isBuilding = true;
    buildingMesh.userData.building = this;
  }

  addExteriorDoor(): void {
    // Door dimensions
    const doorWidth = this.options.doorWidth!;
    const doorHeight = this.options.doorHeight!;
    const wallThickness = 0.2;

    // Door material
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    // Create door geometry
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, wallThickness);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);

    // Position door based on entrance side
    switch (this.entranceSide) {
      case "front":
        door.position.set(0, doorHeight / 2, this.options.depth! / 2 + wallThickness / 2);
        break;
      case "back":
        door.position.set(0, doorHeight / 2, -this.options.depth! / 2 - wallThickness / 2);
        door.rotation.y = Math.PI;
        break;
      case "left":
        door.position.set(-this.options.width! / 2 - wallThickness / 2, doorHeight / 2, 0);
        door.rotation.y = -Math.PI / 2;
        break;
      case "right":
        door.position.set(this.options.width! / 2 + wallThickness / 2, doorHeight / 2, 0);
        door.rotation.y = Math.PI / 2;
        break;
    }

    // Add door to building group
    door.position.add(this.position);
    door.position.y += doorHeight / 2; // Adjust to sit on ground
    door.castShadow = true;
    door.receiveShadow = true;

    // Add to group
    this.group.add(door);

    // Set userData for interaction
    door.userData.isDoor = true;
    door.userData.isOpen = false;
    door.userData.building = this;
  }

  createInterior(): void {
    // If interior already exists, remove it first
    if (this.interiorGroup) {
      this.removeInterior();
    }

    // Create a new group for interior objects
    this.interiorGroup = new THREE.Group();
    this.interiorGroup.position.copy(this.position);
    this.interiorGroup.position.y += 0.1; // Slight offset to prevent z-fighting

    // Create room structure
    this.createRoomStructure();

    // Create fireplace
    this.createFireplace();

    // Create furniture
    this.createFurniture();

    // Add interior group to scene
    this.scene.add(this.interiorGroup);
  }

  createRoomStructure(): void {
    if (!this.interiorGroup) return;

    // Room dimensions
    const width = this.options.width! - 0.4; // Slightly smaller than exterior
    const depth = this.options.depth! - 0.4;
    const height = this.options.height! - 0.4;
    const wallThickness = 0.2;

    // Materials
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5dc, // Beige
      flatShading: true,
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Tan
      flatShading: true,
    });

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.interiorGroup.add(floor);

    // Create ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(width, depth);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.receiveShadow = true;
    this.interiorGroup.add(ceiling);

    // Create walls
    // Front wall
    const frontWallGeometry = new THREE.PlaneGeometry(width, height);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.z = depth / 2;
    frontWall.position.y = height / 2;
    frontWall.receiveShadow = true;
    this.interiorGroup.add(frontWall);

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.z = -depth / 2;
    backWall.position.y = height / 2;
    backWall.rotation.y = Math.PI;
    backWall.receiveShadow = true;
    this.interiorGroup.add(backWall);

    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(depth, height);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.x = -width / 2;
    leftWall.position.y = height / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.interiorGroup.add(leftWall);

    // Right wall
    const rightWallGeometry = new THREE.PlaneGeometry(depth, height);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.x = width / 2;
    rightWall.position.y = height / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.interiorGroup.add(rightWall);

    // Add door opening based on entrance side
    const doorWidth = this.options.doorWidth!;
    const doorHeight = this.options.doorHeight!;

    // Create door frame
    const doorFrameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    // Position door frame based on entrance side
    switch (this.entranceSide) {
      case "front":
        // Door frame for front entrance
        this.createDoorFrame(
          doorWidth,
          doorHeight,
          0,
          doorHeight / 2,
          depth / 2 + 0.01,
          doorFrameMaterial
        );
        break;
      case "back":
        // Door frame for back entrance
        this.createDoorFrame(
          doorWidth,
          doorHeight,
          0,
          doorHeight / 2,
          -depth / 2 - 0.01,
          doorFrameMaterial,
          Math.PI
        );
        break;
      case "left":
        // Door frame for left entrance
        this.createDoorFrame(
          doorWidth,
          doorHeight,
          -width / 2 - 0.01,
          doorHeight / 2,
          0,
          doorFrameMaterial,
          -Math.PI / 2
        );
        break;
      case "right":
        // Door frame for right entrance
        this.createDoorFrame(
          doorWidth,
          doorHeight,
          width / 2 + 0.01,
          doorHeight / 2,
          0,
          doorFrameMaterial,
          Math.PI / 2
        );
        break;
    }

    // Add windows
    this.addWindows(width, depth, height, wallThickness);
  }

  createDoorFrame(
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    rotation: number = 0
  ): void {
    if (!this.interiorGroup) return;

    const frameThickness = 0.1;
    const frameWidth = 0.2;

    // Top frame
    const topFrameGeometry = new THREE.BoxGeometry(
      width + frameWidth * 2,
      frameWidth,
      frameThickness
    );
    const topFrame = new THREE.Mesh(topFrameGeometry, material);
    topFrame.position.set(x, y + height / 2 + frameWidth / 2, z);
    topFrame.rotation.y = rotation;
    this.interiorGroup.add(topFrame);

    // Left frame
    const leftFrameGeometry = new THREE.BoxGeometry(frameWidth, height, frameThickness);
    const leftFrame = new THREE.Mesh(leftFrameGeometry, material);
    leftFrame.position.set(x - width / 2 - frameWidth / 2, y, z);
    leftFrame.rotation.y = rotation;
    this.interiorGroup.add(leftFrame);

    // Right frame
    const rightFrameGeometry = new THREE.BoxGeometry(frameWidth, height, frameThickness);
    const rightFrame = new THREE.Mesh(rightFrameGeometry, material);
    rightFrame.position.set(x + width / 2 + frameWidth / 2, y, z);
    rightFrame.rotation.y = rotation;
    this.interiorGroup.add(rightFrame);
  }

  addWindows(width: number, depth: number, height: number, wallThickness: number): void {
    if (!this.interiorGroup) return;

    // Window material
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xadd8e6, // Light blue
      transparent: true,
      opacity: 0.5,
      flatShading: true,
    });

    // Window frame material
    const frameColor = 0xffffff; // White
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: frameColor,
      flatShading: true,
    });

    // Window dimensions
    const windowWidth = 1.5;
    const windowHeight = 1.5;
    const frameWidth = 0.1;

    // Add windows to walls that don't have the door
    if (this.entranceSide !== "front") {
      // Front wall windows
      this.createWindow(
        -width / 4,
        height / 2,
        depth / 2 + wallThickness / 2,
        windowWidth,
        windowHeight,
        frameWidth,
        windowMaterial,
        frameMaterial
      );
      this.createWindow(
        width / 4,
        height / 2,
        depth / 2 + wallThickness / 2,
        windowWidth,
        windowHeight,
        frameWidth,
        windowMaterial,
        frameMaterial
      );
    }

    if (this.entranceSide !== "back") {
      // Back wall windows
      this.createWindow(
        -width / 4,
        height / 2,
        -depth / 2 - wallThickness / 2,
        windowWidth,
        windowHeight,
        frameWidth,
        windowMaterial,
        frameMaterial,
        Math.PI
      );
      this.createWindow(
        width / 4,
        height / 2,
        -depth / 2 - wallThickness / 2,
        windowWidth,
        windowHeight,
        frameWidth,
        windowMaterial,
        frameMaterial,
        Math.PI
      );
    }

    if (this.entranceSide !== "left") {
      // Left wall windows
      this.createWindow(
        -width / 2 - wallThickness / 2,
        height / 2,
        -depth / 4,
        windowWidth,
        windowHeight,
        frameWidth,
        windowMaterial,
        frameMaterial,
        Math.PI / 2
      );
      this.createWindow(
        -width / 2 - wallThickness / 2,
        height / 2,
        depth / 4,
        windowWidth,
        windowHeight,
        frameWidth,
        windowMaterial,
        frameMaterial,
        Math.PI / 2
      );
    }

    if (this.entranceSide !== "right") {
      // Right wall windows
      this.createWindow(
        width / 2 + wallThickness / 2,
        height / 2,
        -depth / 4,
        windowWidth,
        windowHeight,
        frameWidth,
        windowMaterial,
        frameMaterial,
        -Math.PI / 2
      );
      this.createWindow(
        width / 2 + wallThickness / 2,
        height / 2,
        depth / 4,
        windowWidth,
        windowHeight,
        frameWidth,
        windowMaterial,
        frameMaterial,
        -Math.PI / 2
      );
    }
  }

  createWindow(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    frameWidth: number,
    glassMaterial: THREE.Material,
    frameMaterial: THREE.Material,
    rotation: number = 0
  ): void {
    if (!this.interiorGroup) return;

    // Create window group
    const windowGroup = new THREE.Group();
    windowGroup.position.set(x, y, z);
    windowGroup.rotation.y = rotation;

    // Create glass
    const glassGeometry = new THREE.PlaneGeometry(width - frameWidth * 2, height - frameWidth * 2);
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.z = 0.01; // Slight offset to prevent z-fighting
    windowGroup.add(glass);

    // Create frame
    // Top frame
    const topFrameGeometry = new THREE.BoxGeometry(width, frameWidth, 0.05);
    const topFrame = new THREE.Mesh(topFrameGeometry, frameMaterial);
    topFrame.position.y = height / 2 - frameWidth / 2;
    windowGroup.add(topFrame);

    // Bottom frame
    const bottomFrameGeometry = new THREE.BoxGeometry(width, frameWidth, 0.05);
    const bottomFrame = new THREE.Mesh(bottomFrameGeometry, frameMaterial);
    bottomFrame.position.y = -height / 2 + frameWidth / 2;
    windowGroup.add(bottomFrame);

    // Left frame
    const leftFrameGeometry = new THREE.BoxGeometry(frameWidth, height, 0.05);
    const leftFrame = new THREE.Mesh(leftFrameGeometry, frameMaterial);
    leftFrame.position.x = -width / 2 + frameWidth / 2;
    windowGroup.add(leftFrame);

    // Right frame
    const rightFrameGeometry = new THREE.BoxGeometry(frameWidth, height, 0.05);
    const rightFrame = new THREE.Mesh(rightFrameGeometry, frameMaterial);
    rightFrame.position.x = width / 2 - frameWidth / 2;
    windowGroup.add(rightFrame);

    // Add window group to interior
    this.interiorGroup.add(windowGroup);
  }

  createFireplace(): void {
    if (!this.interiorGroup) return;

    // Fireplace dimensions
    const fireplaceWidth = 3;
    const fireplaceHeight = 2;
    const fireplaceDepth = 1;

    // Materials
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gray
      flatShading: true,
    });

    const fireMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4500, // Orange-red
      emissive: 0xff4500,
      emissiveIntensity: 1.0,
    });

    // Position fireplace on back wall
    const x = 0;
    const y = fireplaceHeight / 2;
    const z = -(this.options.depth! - 0.4) / 2 + fireplaceDepth / 2;

    // Create fireplace base
    const baseGeometry = new THREE.BoxGeometry(fireplaceWidth, 0.5, fireplaceDepth);
    const base = new THREE.Mesh(baseGeometry, stoneMaterial);
    base.position.set(x, 0.25, z);
    this.interiorGroup.add(base);

    // Create fireplace back
    const backGeometry = new THREE.BoxGeometry(fireplaceWidth, fireplaceHeight, 0.2);
    const back = new THREE.Mesh(backGeometry, stoneMaterial);
    back.position.set(x, y, z - fireplaceDepth / 2 + 0.1);
    this.interiorGroup.add(back);

    // Create fireplace sides
    const sideGeometry = new THREE.BoxGeometry(0.2, fireplaceHeight, fireplaceDepth);

    // Left side
    const leftSide = new THREE.Mesh(sideGeometry, stoneMaterial);
    leftSide.position.set(x - fireplaceWidth / 2 + 0.1, y, z);
    this.interiorGroup.add(leftSide);

    // Right side
    const rightSide = new THREE.Mesh(sideGeometry, stoneMaterial);
    rightSide.position.set(x + fireplaceWidth / 2 - 0.1, y, z);
    this.interiorGroup.add(rightSide);

    // Create fireplace top
    const topGeometry = new THREE.BoxGeometry(fireplaceWidth, 0.2, fireplaceDepth);
    const top = new THREE.Mesh(topGeometry, stoneMaterial);
    top.position.set(x, fireplaceHeight, z);
    this.interiorGroup.add(top);

    // Create fire
    const fireGeometry = new THREE.BoxGeometry(fireplaceWidth - 0.4, 0.8, fireplaceDepth - 0.4);
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.set(x, 0.7, z);
    this.interiorGroup.add(fire);

    // Add fire light
    const fireLight = new THREE.PointLight(0xff6a00, 1.5, 10);
    fireLight.position.set(x, 1.5, z);
    this.interiorGroup.add(fireLight);
  }

  createFurniture(): void {
    if (!this.interiorGroup) return;

    // Room dimensions
    const width = this.options.width! - 0.4;
    const depth = this.options.depth! - 0.4;

    // Clear existing furniture
    this.furniture = [];

    // Add a bed
    const bedPosition = new THREE.Vector3(width / 3, 0, -depth / 3);
    const bed = Furniture.createBed(this.scene, bedPosition);
    if (bed) {
      this.furniture.push(bed);
      // Remove from scene as it will be added to interior group
      if (bed.mesh) this.scene.remove(bed.mesh);
      this.interiorGroup.add(bed.mesh!);
    }

    // Add a table
    const tablePosition = new THREE.Vector3(-width / 3, 0, depth / 3);
    const table = Furniture.createTable(this.scene, tablePosition);
    if (table) {
      this.furniture.push(table);
      // Remove from scene as it will be added to interior group
      if (table.mesh) this.scene.remove(table.mesh);
      this.interiorGroup.add(table.mesh!);
    }

    // Add chairs around the table
    const chair1Position = new THREE.Vector3(-width / 3, 0, depth / 3 + 0.8);
    const chair1 = Furniture.createChair(this.scene, chair1Position);
    if (chair1) {
      this.furniture.push(chair1);
      // Remove from scene as it will be added to interior group
      if (chair1.mesh) this.scene.remove(chair1.mesh);
      this.interiorGroup.add(chair1.mesh!);
    }

    const chair2Position = new THREE.Vector3(-width / 3, 0, depth / 3 - 0.8);
    const chair2 = Furniture.createChair(this.scene, chair2Position);
    if (chair2) {
      this.furniture.push(chair2);
      // Remove from scene as it will be added to interior group
      if (chair2.mesh) this.scene.remove(chair2.mesh);
      this.interiorGroup.add(chair2.mesh!);
      // Rotate chair to face table
      chair2.mesh!.rotation.y = Math.PI;
    }

    // Add a chest
    const chestPosition = new THREE.Vector3(width / 3, 0, depth / 3);
    const chest = Furniture.createChest(this.scene, chestPosition);
    if (chest) {
      this.furniture.push(chest);
      // Remove from scene as it will be added to interior group
      if (chest.mesh) this.scene.remove(chest.mesh);
      this.interiorGroup.add(chest.mesh!);
    }
  }

  removeInterior(): void {
    if (this.interiorGroup) {
      this.scene.remove(this.interiorGroup);
      this.interiorGroup = null;
    }
  }

  remove(): void {
    // Remove interior
    this.removeInterior();

    // Remove exterior
    this.scene.remove(this.group);
  }
}
