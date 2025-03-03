import * as THREE from "three";

export class CollidableObject {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.mesh = null;
    this.isCollidable = true;

    // Default options
    this.options = {
      position: new THREE.Vector3(0, 0, 0),
      dimensions: new THREE.Vector3(1, 1, 1),
      rotation: new THREE.Euler(0, 0, 0),
      color: 0x8b4513, // Brown by default
      materialType: "standard", // standard, basic, phong, etc.
      materialOptions: {
        flatShading: true,
      },
      ...options,
    };
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

    // Set mesh properties for collision
    this.mesh.userData.isCollidable = this.isCollidable;
    this.mesh.userData.parentObject = this;

    // Cast and receive shadows
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Add to scene
    this.scene.add(this.mesh);

    return this.mesh;
  }

  // Method to check if a point is inside or near this object
  checkCollision(point, radius = 0.5) {
    if (!this.mesh || !this.isCollidable) return false;

    // Create a bounding box for the mesh
    const box = new THREE.Box3().setFromObject(this.mesh);

    // Expand the box by the radius for near-collision detection
    box.expandByScalar(radius);

    // Check if the point is inside the expanded box
    return box.containsPoint(point);
  }

  // Method to position relative to another object
  positionRelativeTo(object, offsetX = 0, offsetY = 0, offsetZ = 0) {
    if (!this.mesh || !object.mesh) return;

    this.mesh.position.set(
      object.mesh.position.x + offsetX,
      object.mesh.position.y + offsetY,
      object.mesh.position.z + offsetZ
    );
  }

  // Enable/disable collision
  setCollidable(value) {
    this.isCollidable = value;
    if (this.mesh) {
      this.mesh.userData.isCollidable = value;
    }
  }

  // Remove from scene
  remove() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
  }
}
