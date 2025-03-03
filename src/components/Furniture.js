import * as THREE from "three";
import { CollidableObject } from "./CollidableObject";

export class Furniture extends CollidableObject {
  constructor(scene, options = {}) {
    // Call parent constructor
    super(scene, options);

    // Furniture specific properties
    this.type = options.type || "generic";
    this.parts = [];
  }

  // Factory method to create different types of furniture
  static create(scene, type, position, options = {}) {
    switch (type.toLowerCase()) {
      case "bed":
        return Furniture.createBed(scene, position, options);
      case "desk":
        return Furniture.createDesk(scene, position, options);
      case "chair":
        return Furniture.createChair(scene, position, options);
      case "chest":
        return Furniture.createChest(scene, position, options);
      case "table":
        return Furniture.createTable(scene, position, options);
      default:
        console.warn(`Unknown furniture type: ${type}`);
        return null;
    }
  }

  // Create a bed
  static createBed(scene, position, options = {}) {
    const bedGroup = new THREE.Group();
    scene.add(bedGroup);

    // Default dimensions for a bed
    const width = options.width || 3;
    const length = options.length || 6;
    const height = options.height || 0.8;
    const mattressHeight = options.mattressHeight || 0.3;

    // Create bed base as a collidable object
    const bedBase = new Furniture(scene, {
      type: "bed-base",
      position: new THREE.Vector3(position.x, position.y + height / 2, position.z),
      dimensions: new THREE.Vector3(width, height, length),
      color: options.baseColor || 0x8b4513, // Brown
      ...options,
    });
    const baseMesh = bedBase.create();
    baseMesh.userData.isCollidable = true;
    bedGroup.add(baseMesh);

    // Create mattress (also collidable)
    const mattress = new Furniture(scene, {
      type: "bed-mattress",
      position: new THREE.Vector3(position.x, position.y + height + mattressHeight / 2, position.z),
      dimensions: new THREE.Vector3(width - 0.2, mattressHeight, length - 0.2),
      color: options.mattressColor || 0x964b00, // Darker brown
      ...options,
    });
    const mattressMesh = mattress.create();
    mattressMesh.userData.isCollidable = true;
    bedGroup.add(mattressMesh);

    // Create pillow (also collidable)
    const pillow = new Furniture(scene, {
      type: "bed-pillow",
      position: new THREE.Vector3(
        position.x,
        position.y + height + mattressHeight + 0.1,
        position.z - length / 2 + 0.5
      ),
      dimensions: new THREE.Vector3(width - 0.6, 0.2, 1),
      color: options.pillowColor || 0xf5f5dc, // Beige
      ...options,
    });
    const pillowMesh = pillow.create();
    pillowMesh.userData.isCollidable = true;
    bedGroup.add(pillowMesh);

    // Create a wrapper object to represent the whole bed
    const bed = new Furniture(scene, {
      type: "bed-complete",
      position: position.clone(),
      ...options,
    });
    bed.mesh = bedGroup;
    bed.parts = [bedBase, mattress, pillow];

    // Ensure the group and all meshes are collidable
    bedGroup.userData.isCollidable = true;
    bedGroup.traverse((object) => {
      if (object.isMesh) {
        object.userData.isCollidable = true;
      }
    });

    return bed;
  }

  // Create a desk
  static createDesk(scene, position, options = {}) {
    const deskGroup = new THREE.Group();
    scene.add(deskGroup);

    // Default dimensions for a desk
    const width = options.width || 3;
    const depth = options.depth || 1.5;
    const height = options.height || 1.2;
    const legWidth = options.legWidth || 0.2;

    // Create desk top as a collidable object
    const deskTop = new Furniture(scene, {
      type: "desk-top",
      position: new THREE.Vector3(position.x, position.y + height, position.z),
      dimensions: new THREE.Vector3(width, 0.2, depth),
      color: options.color || 0x8b4513, // Brown
      ...options,
    });
    const topMesh = deskTop.create();
    topMesh.userData.isCollidable = true;
    deskGroup.add(topMesh);

    // Create desk legs
    const legs = [];
    for (let i = 0; i < 4; i++) {
      const legX =
        position.x + (i % 2 === 0 ? -width / 2 + legWidth / 2 : width / 2 - legWidth / 2);
      const legZ = position.z + (i < 2 ? -depth / 2 + legWidth / 2 : depth / 2 - legWidth / 2);

      const leg = new Furniture(scene, {
        type: "desk-leg",
        position: new THREE.Vector3(legX, position.y + height / 2, legZ),
        dimensions: new THREE.Vector3(legWidth, height, legWidth),
        color: options.color || 0x8b4513, // Brown
        ...options,
      });
      const legMesh = leg.create();
      legMesh.userData.isCollidable = true;
      deskGroup.add(legMesh);
      legs.push(leg);
    }

    // Create a wrapper object to represent the whole desk
    const desk = new Furniture(scene, {
      type: "desk-complete",
      position: position.clone(),
      ...options,
    });
    desk.mesh = deskGroup;
    desk.parts = [deskTop, ...legs];

    // Ensure the group and all meshes are collidable
    deskGroup.userData.isCollidable = true;
    deskGroup.traverse((object) => {
      if (object.isMesh) {
        object.userData.isCollidable = true;
      }
    });

    return desk;
  }

  // Create a chair
  static createChair(scene, position, options = {}) {
    const chairGroup = new THREE.Group();
    scene.add(chairGroup);

    // Default dimensions for a chair
    const width = options.width || 1;
    const depth = options.depth || 1;
    const seatHeight = options.seatHeight || 1.2;
    const backHeight = options.backHeight || 1.0;
    const legWidth = options.legWidth || 0.15;

    // Create chair seat
    const seat = new Furniture(scene, {
      type: "chair-seat",
      position: new THREE.Vector3(position.x, position.y + seatHeight, position.z),
      dimensions: new THREE.Vector3(width, 0.2, depth),
      color: options.color || 0x8b4513, // Brown
      ...options,
    });
    const seatMesh = seat.create();
    seatMesh.userData.isCollidable = true;
    chairGroup.add(seatMesh);

    // Create chair back
    const back = new Furniture(scene, {
      type: "chair-back",
      position: new THREE.Vector3(
        position.x,
        position.y + seatHeight + backHeight / 2,
        position.z - depth / 2 + 0.1
      ),
      dimensions: new THREE.Vector3(width, backHeight, 0.2),
      color: options.color || 0x8b4513, // Brown
      ...options,
    });
    const backMesh = back.create();
    backMesh.userData.isCollidable = true;
    chairGroup.add(backMesh);

    // Create chair legs
    const legs = [];
    for (let i = 0; i < 4; i++) {
      const legX =
        position.x + (i % 2 === 0 ? -width / 2 + legWidth / 2 : width / 2 - legWidth / 2);
      const legZ = position.z + (i < 2 ? -depth / 2 + legWidth / 2 : depth / 2 - legWidth / 2);

      const leg = new Furniture(scene, {
        type: "chair-leg",
        position: new THREE.Vector3(legX, position.y + seatHeight / 2, legZ),
        dimensions: new THREE.Vector3(legWidth, seatHeight, legWidth),
        color: options.color || 0x8b4513, // Brown
        ...options,
      });
      const legMesh = leg.create();
      legMesh.userData.isCollidable = true;
      chairGroup.add(legMesh);
      legs.push(leg);
    }

    // Create a wrapper object to represent the whole chair
    const chair = new Furniture(scene, {
      type: "chair-complete",
      position: position.clone(),
      ...options,
    });
    chair.mesh = chairGroup;
    chair.parts = [seat, back, ...legs];

    // Ensure the group and all meshes are collidable
    chairGroup.userData.isCollidable = true;
    chairGroup.traverse((object) => {
      if (object.isMesh) {
        object.userData.isCollidable = true;
      }
    });

    return chair;
  }

  // Create a chest/storage box
  static createChest(scene, position, options = {}) {
    const chestGroup = new THREE.Group();
    scene.add(chestGroup);

    // Default dimensions for a chest
    const width = options.width || 2;
    const depth = options.depth || 1;
    const height = options.height || 1;
    const baseHeight = height * 0.7;
    const lidHeight = height * 0.3;

    // Create chest base
    const base = new Furniture(scene, {
      type: "chest-base",
      position: new THREE.Vector3(position.x, position.y + baseHeight / 2, position.z),
      dimensions: new THREE.Vector3(width, baseHeight, depth),
      color: options.color || 0x8b4513, // Brown
      ...options,
    });
    const baseMesh = base.create();
    baseMesh.userData.isCollidable = true;
    chestGroup.add(baseMesh);

    // Create chest lid
    const lid = new Furniture(scene, {
      type: "chest-lid",
      position: new THREE.Vector3(position.x, position.y + baseHeight + lidHeight / 2, position.z),
      dimensions: new THREE.Vector3(width, lidHeight, depth),
      color: options.color || 0x8b4513, // Brown
      ...options,
    });
    const lidMesh = lid.create();
    lidMesh.userData.isCollidable = true;
    chestGroup.add(lidMesh);

    // Add decorative lock
    const lockSize = 0.2;
    const lockGeometry = new THREE.BoxGeometry(lockSize, lockSize, 0.1);
    const lockMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2,
    });
    const lock = new THREE.Mesh(lockGeometry, lockMaterial);
    lock.position.set(
      position.x,
      position.y + baseHeight + lidHeight / 2,
      position.z + depth / 2 + 0.05
    );
    lock.userData.isCollidable = true;
    chestGroup.add(lock);

    // Create a wrapper object to represent the whole chest
    const chest = new Furniture(scene, {
      type: "chest-complete",
      position: position.clone(),
      ...options,
    });
    chest.mesh = chestGroup;
    chest.parts = [base, lid];

    // Ensure the group and all meshes are collidable
    chestGroup.userData.isCollidable = true;
    chestGroup.traverse((object) => {
      if (object.isMesh) {
        object.userData.isCollidable = true;
      }
    });

    return chest;
  }

  // Create a table
  static createTable(scene, position, options = {}) {
    const tableGroup = new THREE.Group();
    scene.add(tableGroup);

    // Default dimensions for a table
    const width = options.width || 4;
    const depth = options.depth || 2;
    const height = options.height || 1.4;
    const legWidth = options.legWidth || 0.2;

    // Create table top
    const top = new Furniture(scene, {
      type: "table-top",
      position: new THREE.Vector3(position.x, position.y + height, position.z),
      dimensions: new THREE.Vector3(width, 0.2, depth),
      color: options.color || 0x8b4513, // Brown
      ...options,
    });
    const topMesh = top.create();
    topMesh.userData.isCollidable = true;
    tableGroup.add(topMesh);

    // Create table legs
    const legs = [];
    for (let i = 0; i < 4; i++) {
      const legX =
        position.x + (i % 2 === 0 ? -width / 2 + legWidth / 2 : width / 2 - legWidth / 2);
      const legZ = position.z + (i < 2 ? -depth / 2 + legWidth / 2 : depth / 2 - legWidth / 2);

      const leg = new Furniture(scene, {
        type: "table-leg",
        position: new THREE.Vector3(legX, position.y + height / 2, legZ),
        dimensions: new THREE.Vector3(legWidth, height, legWidth),
        color: options.color || 0x8b4513, // Brown
        ...options,
      });
      const legMesh = leg.create();
      legMesh.userData.isCollidable = true;
      tableGroup.add(legMesh);
      legs.push(leg);
    }

    // Create a wrapper object to represent the whole table
    const table = new Furniture(scene, {
      type: "table-complete",
      position: position.clone(),
      ...options,
    });
    table.mesh = tableGroup;
    table.parts = [top, ...legs];

    // Ensure the group and all meshes are collidable
    tableGroup.userData.isCollidable = true;
    tableGroup.traverse((object) => {
      if (object.isMesh) {
        object.userData.isCollidable = true;
      }
    });

    return table;
  }

  create() {
    // Create geometry based on dimensions
    const geometry = new THREE.BoxGeometry(
      this.options.dimensions.x,
      this.options.dimensions.y,
      this.options.dimensions.z
    );

    // Create material based on type
    let material;
    switch (this.options.materialType) {
      case "basic":
        material = new THREE.MeshBasicMaterial({
          color: this.options.color,
          ...this.options.materialOptions,
        });
        break;
      case "phong":
        material = new THREE.MeshPhongMaterial({
          color: this.options.color,
          ...this.options.materialOptions,
        });
        break;
      case "standard":
      default:
        material = new THREE.MeshStandardMaterial({
          color: this.options.color,
          ...this.options.materialOptions,
        });
        break;
    }

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.options.position);
    this.mesh.rotation.copy(this.options.rotation);

    // Set mesh properties for collision - consistent with tree approach
    this.mesh.userData.isCollidable = this.isCollidable;
    this.mesh.userData.parentObject = this;

    // Cast and receive shadows
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Add to scene
    this.scene.add(this.mesh);

    return this.mesh;
  }
}
