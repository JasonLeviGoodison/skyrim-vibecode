import * as THREE from "three";
import { CollidableObject, CollidableObjectOptions } from "./CollidableObject";

export interface FurnitureOptions extends CollidableObjectOptions {
  type?: string;
  width?: number;
  height?: number;
  depth?: number;
  color?: number;
  [key: string]: any;
}

export class Furniture extends CollidableObject {
  type: string;
  parts: THREE.Object3D[];

  constructor(scene: THREE.Scene, options: FurnitureOptions = {}) {
    // Call parent constructor
    super(scene, options);

    // Furniture specific properties
    this.type = options.type || "generic";
    this.parts = [];
  }

  // Factory method to create different types of furniture
  static create(
    scene: THREE.Scene,
    type: string,
    position: THREE.Vector3,
    options: FurnitureOptions = {}
  ): Furniture | null {
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

  static createBed(
    scene: THREE.Scene,
    position: THREE.Vector3,
    options: FurnitureOptions = {}
  ): Furniture {
    // Default bed options
    const bedOptions: FurnitureOptions = {
      type: "bed",
      width: 2,
      height: 0.5,
      depth: 3,
      color: 0x8b4513, // Brown
      ...options,
      position: position.clone(),
    };

    // Create bed instance
    const bed = new Furniture(scene, bedOptions);

    // Create bed frame
    const frameGeometry = new THREE.BoxGeometry(
      bedOptions.width!,
      bedOptions.height! * 0.5,
      bedOptions.depth!
    );
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: bedOptions.color,
      flatShading: true,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, bedOptions.height! * 0.25, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;

    // Create mattress
    const mattressGeometry = new THREE.BoxGeometry(
      bedOptions.width! * 0.9,
      bedOptions.height! * 0.5,
      bedOptions.depth! * 0.9
    );
    const mattressMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5dc, // Beige
      flatShading: true,
    });
    const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
    mattress.position.set(0, bedOptions.height! * 0.75, 0);
    mattress.castShadow = true;
    mattress.receiveShadow = true;

    // Create pillow
    const pillowGeometry = new THREE.BoxGeometry(
      bedOptions.width! * 0.8,
      bedOptions.height! * 0.3,
      bedOptions.depth! * 0.2
    );
    const pillowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White
      flatShading: true,
    });
    const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
    pillow.position.set(0, bedOptions.height! * 0.9, -bedOptions.depth! * 0.35);
    pillow.castShadow = true;
    pillow.receiveShadow = true;

    // Create bed group
    const bedGroup = new THREE.Group();
    bedGroup.add(frame);
    bedGroup.add(mattress);
    bedGroup.add(pillow);
    bedGroup.position.copy(position);

    // Add to scene
    scene.add(bedGroup);

    // Store parts
    bed.parts = [frame, mattress, pillow];
    bed.mesh = frame; // Use frame as the main collision mesh

    return bed;
  }

  static createDesk(
    scene: THREE.Scene,
    position: THREE.Vector3,
    options: FurnitureOptions = {}
  ): Furniture {
    // Default desk options
    const deskOptions: FurnitureOptions = {
      type: "desk",
      width: 2,
      height: 0.8,
      depth: 1,
      color: 0x8b4513, // Brown
      ...options,
      position: position.clone(),
    };

    // Create desk instance
    const desk = new Furniture(scene, deskOptions);

    // Create desk top
    const topGeometry = new THREE.BoxGeometry(
      deskOptions.width!,
      deskOptions.height! * 0.1,
      deskOptions.depth!
    );
    const deskMaterial = new THREE.MeshStandardMaterial({
      color: deskOptions.color,
      flatShading: true,
    });
    const top = new THREE.Mesh(topGeometry, deskMaterial);
    top.position.set(0, deskOptions.height! * 0.95, 0);
    top.castShadow = true;
    top.receiveShadow = true;

    // Create legs
    const legGeometry = new THREE.BoxGeometry(
      deskOptions.width! * 0.05,
      deskOptions.height! * 0.9,
      deskOptions.depth! * 0.05
    );

    // Front left leg
    const frontLeftLeg = new THREE.Mesh(legGeometry, deskMaterial);
    frontLeftLeg.position.set(
      -deskOptions.width! * 0.45,
      deskOptions.height! * 0.45,
      deskOptions.depth! * 0.45
    );
    frontLeftLeg.castShadow = true;
    frontLeftLeg.receiveShadow = true;

    // Front right leg
    const frontRightLeg = new THREE.Mesh(legGeometry, deskMaterial);
    frontRightLeg.position.set(
      deskOptions.width! * 0.45,
      deskOptions.height! * 0.45,
      deskOptions.depth! * 0.45
    );
    frontRightLeg.castShadow = true;
    frontRightLeg.receiveShadow = true;

    // Back left leg
    const backLeftLeg = new THREE.Mesh(legGeometry, deskMaterial);
    backLeftLeg.position.set(
      -deskOptions.width! * 0.45,
      deskOptions.height! * 0.45,
      -deskOptions.depth! * 0.45
    );
    backLeftLeg.castShadow = true;
    backLeftLeg.receiveShadow = true;

    // Back right leg
    const backRightLeg = new THREE.Mesh(legGeometry, deskMaterial);
    backRightLeg.position.set(
      deskOptions.width! * 0.45,
      deskOptions.height! * 0.45,
      -deskOptions.depth! * 0.45
    );
    backRightLeg.castShadow = true;
    backRightLeg.receiveShadow = true;

    // Create desk group
    const deskGroup = new THREE.Group();
    deskGroup.add(top);
    deskGroup.add(frontLeftLeg);
    deskGroup.add(frontRightLeg);
    deskGroup.add(backLeftLeg);
    deskGroup.add(backRightLeg);
    deskGroup.position.copy(position);

    // Add to scene
    scene.add(deskGroup);

    // Store parts
    desk.parts = [top, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg];
    desk.mesh = top; // Use top as the main collision mesh

    return desk;
  }

  static createChair(
    scene: THREE.Scene,
    position: THREE.Vector3,
    options: FurnitureOptions = {}
  ): Furniture {
    // Default chair options
    const chairOptions: FurnitureOptions = {
      type: "chair",
      width: 0.6,
      height: 1.2,
      depth: 0.6,
      color: 0x8b4513, // Brown
      ...options,
      position: position.clone(),
    };

    // Create chair instance
    const chair = new Furniture(scene, chairOptions);

    // Create chair seat
    const seatGeometry = new THREE.BoxGeometry(
      chairOptions.width!,
      chairOptions.height! * 0.1,
      chairOptions.depth!
    );
    const chairMaterial = new THREE.MeshStandardMaterial({
      color: chairOptions.color,
      flatShading: true,
    });
    const seat = new THREE.Mesh(seatGeometry, chairMaterial);
    seat.position.set(0, chairOptions.height! * 0.4, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;

    // Create chair back
    const backGeometry = new THREE.BoxGeometry(
      chairOptions.width!,
      chairOptions.height! * 0.5,
      chairOptions.depth! * 0.1
    );
    const back = new THREE.Mesh(backGeometry, chairMaterial);
    back.position.set(0, chairOptions.height! * 0.7, -chairOptions.depth! * 0.45);
    back.castShadow = true;
    back.receiveShadow = true;

    // Create legs
    const legGeometry = new THREE.BoxGeometry(
      chairOptions.width! * 0.05,
      chairOptions.height! * 0.4,
      chairOptions.depth! * 0.05
    );

    // Front left leg
    const frontLeftLeg = new THREE.Mesh(legGeometry, chairMaterial);
    frontLeftLeg.position.set(
      -chairOptions.width! * 0.4,
      chairOptions.height! * 0.2,
      chairOptions.depth! * 0.4
    );
    frontLeftLeg.castShadow = true;
    frontLeftLeg.receiveShadow = true;

    // Front right leg
    const frontRightLeg = new THREE.Mesh(legGeometry, chairMaterial);
    frontRightLeg.position.set(
      chairOptions.width! * 0.4,
      chairOptions.height! * 0.2,
      chairOptions.depth! * 0.4
    );
    frontRightLeg.castShadow = true;
    frontRightLeg.receiveShadow = true;

    // Back left leg
    const backLeftLeg = new THREE.Mesh(legGeometry, chairMaterial);
    backLeftLeg.position.set(
      -chairOptions.width! * 0.4,
      chairOptions.height! * 0.2,
      -chairOptions.depth! * 0.4
    );
    backLeftLeg.castShadow = true;
    backLeftLeg.receiveShadow = true;

    // Back right leg
    const backRightLeg = new THREE.Mesh(legGeometry, chairMaterial);
    backRightLeg.position.set(
      chairOptions.width! * 0.4,
      chairOptions.height! * 0.2,
      -chairOptions.depth! * 0.4
    );
    backRightLeg.castShadow = true;
    backRightLeg.receiveShadow = true;

    // Create chair group
    const chairGroup = new THREE.Group();
    chairGroup.add(seat);
    chairGroup.add(back);
    chairGroup.add(frontLeftLeg);
    chairGroup.add(frontRightLeg);
    chairGroup.add(backLeftLeg);
    chairGroup.add(backRightLeg);
    chairGroup.position.copy(position);

    // Add to scene
    scene.add(chairGroup);

    // Store parts
    chair.parts = [seat, back, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg];
    chair.mesh = seat; // Use seat as the main collision mesh

    return chair;
  }

  static createChest(
    scene: THREE.Scene,
    position: THREE.Vector3,
    options: FurnitureOptions = {}
  ): Furniture {
    // Default chest options
    const chestOptions: FurnitureOptions = {
      type: "chest",
      width: 1,
      height: 0.8,
      depth: 0.7,
      color: 0x8b4513, // Brown
      ...options,
      position: position.clone(),
    };

    // Create chest instance
    const chest = new Furniture(scene, chestOptions);

    // Create chest base
    const baseGeometry = new THREE.BoxGeometry(
      chestOptions.width!,
      chestOptions.height! * 0.5,
      chestOptions.depth!
    );
    const chestMaterial = new THREE.MeshStandardMaterial({
      color: chestOptions.color,
      flatShading: true,
    });
    const base = new THREE.Mesh(baseGeometry, chestMaterial);
    base.position.set(0, chestOptions.height! * 0.25, 0);
    base.castShadow = true;
    base.receiveShadow = true;

    // Create chest lid
    const lidGeometry = new THREE.BoxGeometry(
      chestOptions.width!,
      chestOptions.height! * 0.1,
      chestOptions.depth!
    );
    const lid = new THREE.Mesh(lidGeometry, chestMaterial);
    lid.position.set(0, chestOptions.height! * 0.55, 0);
    lid.castShadow = true;
    lid.receiveShadow = true;

    // Create lock
    const lockGeometry = new THREE.BoxGeometry(
      chestOptions.width! * 0.1,
      chestOptions.height! * 0.1,
      chestOptions.depth! * 0.05
    );
    const lockMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold
      metalness: 0.8,
      roughness: 0.2,
    });
    const lock = new THREE.Mesh(lockGeometry, lockMaterial);
    lock.position.set(0, chestOptions.height! * 0.55, chestOptions.depth! * 0.525);
    lock.castShadow = true;
    lock.receiveShadow = true;

    // Create chest group
    const chestGroup = new THREE.Group();
    chestGroup.add(base);
    chestGroup.add(lid);
    chestGroup.add(lock);
    chestGroup.position.copy(position);

    // Add to scene
    scene.add(chestGroup);

    // Store parts
    chest.parts = [base, lid, lock];
    chest.mesh = base; // Use base as the main collision mesh

    return chest;
  }

  static createTable(
    scene: THREE.Scene,
    position: THREE.Vector3,
    options: FurnitureOptions = {}
  ): Furniture {
    // Default table options
    const tableOptions: FurnitureOptions = {
      type: "table",
      width: 2,
      height: 0.8,
      depth: 1,
      color: 0x8b4513, // Brown
      ...options,
      position: position.clone(),
    };

    // Create table instance
    const table = new Furniture(scene, tableOptions);

    // Create table top
    const topGeometry = new THREE.BoxGeometry(
      tableOptions.width!,
      tableOptions.height! * 0.05,
      tableOptions.depth!
    );
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: tableOptions.color,
      flatShading: true,
    });
    const top = new THREE.Mesh(topGeometry, tableMaterial);
    top.position.set(0, tableOptions.height! * 0.975, 0);
    top.castShadow = true;
    top.receiveShadow = true;

    // Create legs
    const legGeometry = new THREE.BoxGeometry(
      tableOptions.width! * 0.05,
      tableOptions.height! * 0.95,
      tableOptions.depth! * 0.05
    );

    // Front left leg
    const frontLeftLeg = new THREE.Mesh(legGeometry, tableMaterial);
    frontLeftLeg.position.set(
      -tableOptions.width! * 0.45,
      tableOptions.height! * 0.475,
      tableOptions.depth! * 0.45
    );
    frontLeftLeg.castShadow = true;
    frontLeftLeg.receiveShadow = true;

    // Front right leg
    const frontRightLeg = new THREE.Mesh(legGeometry, tableMaterial);
    frontRightLeg.position.set(
      tableOptions.width! * 0.45,
      tableOptions.height! * 0.475,
      tableOptions.depth! * 0.45
    );
    frontRightLeg.castShadow = true;
    frontRightLeg.receiveShadow = true;

    // Back left leg
    const backLeftLeg = new THREE.Mesh(legGeometry, tableMaterial);
    backLeftLeg.position.set(
      -tableOptions.width! * 0.45,
      tableOptions.height! * 0.475,
      -tableOptions.depth! * 0.45
    );
    backLeftLeg.castShadow = true;
    backLeftLeg.receiveShadow = true;

    // Back right leg
    const backRightLeg = new THREE.Mesh(legGeometry, tableMaterial);
    backRightLeg.position.set(
      tableOptions.width! * 0.45,
      tableOptions.height! * 0.475,
      -tableOptions.depth! * 0.45
    );
    backRightLeg.castShadow = true;
    backRightLeg.receiveShadow = true;

    // Create table group
    const tableGroup = new THREE.Group();
    tableGroup.add(top);
    tableGroup.add(frontLeftLeg);
    tableGroup.add(frontRightLeg);
    tableGroup.add(backLeftLeg);
    tableGroup.add(backRightLeg);
    tableGroup.position.copy(position);

    // Add to scene
    scene.add(tableGroup);

    // Store parts
    table.parts = [top, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg];
    table.mesh = top; // Use top as the main collision mesh

    return table;
  }

  create(): THREE.Mesh {
    // This is a base implementation
    // Specific furniture types are created using the static factory methods
    return super.create();
  }
}
