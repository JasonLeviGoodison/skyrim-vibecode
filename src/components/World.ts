import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import seedrandom from "seedrandom";
import { Building } from "../types";

export class World {
  scene: THREE.Scene;
  worldSize: number;
  blockSize: number;
  heightMap: number[][];
  blocks: THREE.Mesh[];
  trees: THREE.Group[];
  buildings: Building[];
  seed: string;

  // Day/night cycle properties
  dayDuration: number = 300; // 5 minutes per day
  timeOfDay: number = 0; // 0 to 1, where 0 is dawn, 0.25 is noon, 0.5 is dusk, 0.75 is midnight
  sunLight: THREE.DirectionalLight | null = null;
  moonLight: THREE.DirectionalLight | null = null;
  ambientLight: THREE.AmbientLight | null = null;
  sky: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.worldSize = 100; // Size of the world in blocks
    this.blockSize = 1; // Size of each block
    this.heightMap = [];
    this.blocks = [];
    this.trees = [];
    this.buildings = [];

    // Fixed seed for consistent terrain generation
    this.seed = "skyrim-minecraft-game-v1";

    // Create terrain
    this.generateTerrain();

    // Add trees
    this.generateTrees();

    // Add buildings
    this.generateBuildings();

    // Initialize day/night cycle
    this.initDayNightCycle();
  }

  // Simple hash function for seeding the noise
  hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  seededRandom(x: number, y: number): number {
    const seedVal = this.hash(this.seed + x.toString() + y.toString());
    return (Math.sin(seedVal) + 1) / 2;
  }

  generateTerrain(): void {
    // Create a ground plane
    const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 100, 100);
    groundGeometry.rotateX(-Math.PI / 2);

    // Create a material with better light reflection properties
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a7e4d,
      metalness: 0.1,
      roughness: 0.8,
      flatShading: false,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Generate height map using simplex noise
    // Fix: Create a random number generator with the seed
    const rng = seedrandom(this.seed);

    // Create an object with a random method that uses our seeded rng
    const randomObj = {
      random: function () {
        return rng();
      },
    };

    // Pass the object with the random method to SimplexNoise
    const simplex = new SimplexNoise(randomObj);

    const vertices = groundGeometry.attributes.position.array;

    // Create height map
    this.heightMap = [];
    for (let i = 0; i < this.worldSize; i++) {
      this.heightMap[i] = [];
      for (let j = 0; j < this.worldSize; j++) {
        // Calculate world coordinates
        const x = i - this.worldSize / 2;
        const z = j - this.worldSize / 2;

        // Generate height using multiple octaves of noise
        let height = 0;
        let frequency = 0.02;
        let amplitude = 5;
        for (let k = 0; k < 3; k++) {
          height += simplex.noise(x * frequency, z * frequency) * amplitude;
          frequency *= 2;
          amplitude *= 0.5;
        }

        this.heightMap[i][j] = height;
      }
    }

    // Apply height map to ground vertices
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];

      // Convert world coordinates to heightmap indices
      const ix = Math.floor(x + this.worldSize / 2);
      const iz = Math.floor(z + this.worldSize / 2);

      // Check if indices are within bounds
      if (ix >= 0 && ix < this.worldSize && iz >= 0 && iz < this.worldSize) {
        vertices[i + 1] = this.heightMap[ix][iz];
      }
    }

    // Update the geometry
    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    // Add sky dome
    this.addSkyDome();

    // Add grass
    this.addGrass();
  }

  addSkyDome(): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb, // Sky blue
      side: THREE.BackSide,
    });
    this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.sky);
  }

  addGrass(): void {
    // Create grass instances
    const grassCount = 5000;
    const grassGeometry = new THREE.PlaneGeometry(0.5, 0.5);
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x4caf50,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
      transparent: true,
    });

    // Create grass instances
    const grassInstances = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount);
    grassInstances.castShadow = true;
    grassInstances.receiveShadow = true;

    // Position grass blades
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < grassCount; i++) {
      // Random position within world bounds
      const x = Math.random() * this.worldSize - this.worldSize / 2;
      const z = Math.random() * this.worldSize - this.worldSize / 2;

      // Get height at position
      const y = this.getHeightAt(x, z);

      // Set position
      position.set(x, y, z);

      // Random rotation around Y axis
      rotation.set(0, Math.random() * Math.PI, 0);
      quaternion.setFromEuler(rotation);

      // Random scale
      const grassHeight = 0.3 + Math.random() * 0.5;
      scale.set(1, grassHeight, 1);

      // Create matrix
      matrix.compose(position, quaternion, scale);

      // Set matrix for instance
      grassInstances.setMatrixAt(i, matrix);
    }

    // Add grass to scene
    this.scene.add(grassInstances);

    console.log("Added grass to the terrain");
  }

  generateTrees(): void {
    // Number of trees to create
    const numTrees = 50;

    // Tree materials with improved lighting properties
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.1,
      roughness: 0.8,
      flatShading: false,
    });

    const leavesMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e8b57, // Sea green
      metalness: 0.0,
      roughness: 0.7,
      flatShading: false,
    });

    // Create trees at random positions
    for (let i = 0; i < numTrees; i++) {
      // Random position
      const x = Math.floor(Math.random() * this.worldSize) - this.worldSize / 2;
      const z = Math.floor(Math.random() * this.worldSize) - this.worldSize / 2;

      // Get terrain height at this position
      const y = this.getHeightAt(x, z);

      // Create tree group
      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, y, z);

      // Create trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 1;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Create leaves
      const leavesGeometry = new THREE.ConeGeometry(1, 2, 8);
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = 2.5;
      leaves.castShadow = true;
      treeGroup.add(leaves);

      // Add tree to scene
      this.scene.add(treeGroup);
      this.trees.push(treeGroup);

      // Make tree collidable
      trunk.userData.isCollidable = true;
    }
  }

  generateBuildings(): void {
    // Number of buildings to create
    const numBuildings = 5;

    // Building materials with improved lighting properties
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Tan
      metalness: 0.1,
      roughness: 0.7,
      flatShading: false,
    });

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.2,
      roughness: 0.6,
      flatShading: false,
    });

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4d2600, // Dark brown
      metalness: 0.3,
      roughness: 0.5,
      flatShading: false,
    });

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xadd8e6, // Light blue
      metalness: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.6,
    });

    // Create buildings at random positions
    for (let i = 0; i < numBuildings; i++) {
      // Random position
      const x = Math.floor(Math.random() * 80) - 40;
      const z = Math.floor(Math.random() * 80) - 40;

      // Random dimensions (smaller than before)
      const width = Math.floor(Math.random() * 4) + 8; // 8-12 units wide
      const depth = Math.floor(Math.random() * 4) + 8; // 8-12 units deep
      const height = Math.floor(Math.random() * 2) + 5; // 5-7 units tall
      const roofHeight = 3; // Roof height

      // Get terrain height at this position
      const terrainHeight = this.getHeightAt(x, z);

      // Create building group
      const buildingGroup = new THREE.Group();
      buildingGroup.position.set(x, terrainHeight, z);
      buildingGroup.userData.isBuilding = true;

      // Randomly select which side the door will be on
      // 0 = front (positive z), 1 = right (positive x), 2 = back (negative z), 3 = left (negative x)
      const entranceSide = Math.floor(Math.random() * 4);

      // Create walls
      const wallThickness = 0.2;

      // Front wall
      const frontWallGeometry = new THREE.BoxGeometry(width, height, wallThickness);
      const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
      frontWall.position.set(0, height / 2, depth / 2);
      frontWall.castShadow = true;
      buildingGroup.add(frontWall);

      // Back wall
      const backWallGeometry = new THREE.BoxGeometry(width, height, wallThickness);
      const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
      backWall.position.set(0, height / 2, -depth / 2);
      backWall.castShadow = true;
      buildingGroup.add(backWall);

      // Left wall
      const leftWallGeometry = new THREE.BoxGeometry(wallThickness, height, depth);
      const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
      leftWall.position.set(-width / 2, height / 2, 0);
      leftWall.castShadow = true;
      buildingGroup.add(leftWall);

      // Right wall
      const rightWallGeometry = new THREE.BoxGeometry(wallThickness, height, depth);
      const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
      rightWall.position.set(width / 2, height / 2, 0);
      rightWall.castShadow = true;
      buildingGroup.add(rightWall);

      // Add door
      const doorWidth = 1.5;
      const doorHeight = 3;
      const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, wallThickness * 2);
      const door = new THREE.Mesh(doorGeometry, doorMaterial);

      // Position door based on entrance side
      switch (entranceSide) {
        case 0: // Front
          door.position.set(0, doorHeight / 2, depth / 2 + wallThickness / 2);
          break;
        case 1: // Right
          door.rotation.y = Math.PI / 2;
          door.position.set(width / 2 + wallThickness / 2, doorHeight / 2, 0);
          break;
        case 2: // Back
          door.position.set(0, doorHeight / 2, -depth / 2 - wallThickness / 2);
          break;
        case 3: // Left
          door.rotation.y = Math.PI / 2;
          door.position.set(-width / 2 - wallThickness / 2, doorHeight / 2, 0);
          break;
      }

      door.castShadow = true;
      buildingGroup.add(door);

      // Add windows
      const windowWidth = 1;
      const windowHeight = 1;
      const windowDepth = wallThickness * 2;
      const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);

      // Add windows to front wall if door is not there
      if (entranceSide !== 0) {
        const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow1.position.set(-width / 4, height / 2, depth / 2 + wallThickness / 2);
        buildingGroup.add(frontWindow1);

        const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow2.position.set(width / 4, height / 2, depth / 2 + wallThickness / 2);
        buildingGroup.add(frontWindow2);
      }

      // Add windows to back wall if door is not there
      if (entranceSide !== 2) {
        const backWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        backWindow1.position.set(-width / 4, height / 2, -depth / 2 - wallThickness / 2);
        buildingGroup.add(backWindow1);

        const backWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        backWindow2.position.set(width / 4, height / 2, -depth / 2 - wallThickness / 2);
        buildingGroup.add(backWindow2);
      }

      // Add windows to left wall if door is not there
      if (entranceSide !== 3) {
        const leftWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        leftWindow1.rotation.y = Math.PI / 2;
        leftWindow1.position.set(-width / 2 - wallThickness / 2, height / 2, -depth / 4);
        buildingGroup.add(leftWindow1);

        const leftWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        leftWindow2.rotation.y = Math.PI / 2;
        leftWindow2.position.set(-width / 2 - wallThickness / 2, height / 2, depth / 4);
        buildingGroup.add(leftWindow2);
      }

      // Add windows to right wall if door is not there
      if (entranceSide !== 1) {
        const rightWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        rightWindow1.rotation.y = Math.PI / 2;
        rightWindow1.position.set(width / 2 + wallThickness / 2, height / 2, -depth / 4);
        buildingGroup.add(rightWindow1);

        const rightWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        rightWindow2.rotation.y = Math.PI / 2;
        rightWindow2.position.set(width / 2 + wallThickness / 2, height / 2, depth / 4);
        buildingGroup.add(rightWindow2);
      }

      // Add roof
      const roofGeometry = new THREE.ConeGeometry(
        Math.sqrt(width * width + depth * depth) / 2 + 1,
        roofHeight,
        4
      );
      roofGeometry.rotateY(Math.PI / 4); // Rotate to align with building
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.set(0, height + roofHeight / 2, 0);
      roof.castShadow = true;
      buildingGroup.add(roof);

      // Add building to scene
      this.scene.add(buildingGroup);

      // Store building reference with metadata
      this.buildings.push({
        group: buildingGroup,
        position: new THREE.Vector3(x, terrainHeight, z),
        width: width,
        depth: depth,
        height: height,
        entranceSide: entranceSide,
      });

      // Make building collidable
      buildingGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.userData.isCollidable = true;
        }
      });
    }
  }

  getHeightAt(x: number, z: number): number {
    // Convert world coordinates to heightmap indices
    const ix = Math.floor(x + this.worldSize / 2);
    const iz = Math.floor(z + this.worldSize / 2);

    // Check if indices are within bounds
    if (ix >= 0 && ix < this.worldSize && iz >= 0 && iz < this.worldSize) {
      return this.heightMap[ix][iz];
    }

    return 0;
  }

  getInterpolatedHeightAt(x: number, z: number): number {
    // Convert world coordinates to heightmap indices
    const ix = Math.floor(x + this.worldSize / 2);
    const iz = Math.floor(z + this.worldSize / 2);

    // Check if indices are within bounds
    if (ix >= 0 && ix < this.worldSize - 1 && iz >= 0 && iz < this.worldSize - 1) {
      // Get fractional parts for interpolation
      const fx = x + this.worldSize / 2 - ix;
      const fz = z + this.worldSize / 2 - iz;

      // Get heights at the four corners
      const h00 = this.heightMap[ix][iz];
      const h10 = this.heightMap[ix + 1][iz];
      const h01 = this.heightMap[ix][iz + 1];
      const h11 = this.heightMap[ix + 1][iz + 1];

      // Bilinear interpolation
      const h0 = h00 * (1 - fx) + h10 * fx;
      const h1 = h01 * (1 - fx) + h11 * fx;

      return h0 * (1 - fz) + h1 * fz;
    }

    return this.getHeightAt(x, z);
  }

  initDayNightCycle(): void {
    // Create ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    // Create sun light
    this.sunLight = new THREE.DirectionalLight(0xffffaa, 1.0);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Create moon light
    this.moonLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    this.moonLight.position.set(-50, 100, -50);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 500;
    this.moonLight.shadow.camera.left = -100;
    this.moonLight.shadow.camera.right = 100;
    this.moonLight.shadow.camera.top = 100;
    this.moonLight.shadow.camera.bottom = -100;
    this.moonLight.shadow.bias = -0.0005;
    this.moonLight.visible = false;
    this.scene.add(this.moonLight);
  }

  updateDayNightCycle(delta: number): void {
    // Update time of day
    this.timeOfDay = (this.timeOfDay + delta / this.dayDuration) % 1;

    // Calculate sun position
    const sunAngle = this.timeOfDay * Math.PI * 2;
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.sin(sunAngle) * 100;
    const sunZ = 0;

    // Update sun position
    if (this.sunLight) {
      this.sunLight.position.set(sunX, sunY, sunZ);
    }

    // Update moon position (opposite to sun)
    if (this.moonLight) {
      this.moonLight.position.set(-sunX, -sunY, -sunZ);
    }

    // Day/night transition
    if (this.timeOfDay > 0.25 && this.timeOfDay < 0.75) {
      // Evening to night
      const t = (this.timeOfDay - 0.25) / 0.5; // 0 to 1

      // Fade out sun, fade in moon
      if (this.sunLight) {
        this.sunLight.intensity = Math.max(0, 1.0 - t * 2);
        this.sunLight.visible = this.sunLight.intensity > 0;
      }

      if (this.moonLight) {
        this.moonLight.intensity = Math.min(0.5, t * 2);
        this.moonLight.visible = this.moonLight.intensity > 0;
      }

      // Adjust ambient light
      if (this.ambientLight) {
        this.ambientLight.intensity = Math.max(0.1, 0.3 - t * 0.2);
      }

      // Change sky color
      if (this.sky) {
        const skyMaterial = this.sky.material as THREE.MeshBasicMaterial;
        const dayColor = new THREE.Color(0x87ceeb); // Sky blue
        const nightColor = new THREE.Color(0x0a0a2a); // Dark blue
        skyMaterial.color.copy(dayColor).lerp(nightColor, t);
      }
    } else {
      // Night to morning
      const t = this.timeOfDay < 0.25 ? this.timeOfDay / 0.25 : (1 - this.timeOfDay) / 0.25;

      // Fade in sun, fade out moon
      if (this.sunLight) {
        this.sunLight.intensity = Math.min(1.0, t * 2);
        this.sunLight.visible = this.sunLight.intensity > 0;
      }

      if (this.moonLight) {
        this.moonLight.intensity = Math.max(0, 0.5 - t * 2);
        this.moonLight.visible = this.moonLight.intensity > 0;
      }

      // Adjust ambient light
      if (this.ambientLight) {
        this.ambientLight.intensity = Math.min(0.3, 0.1 + t * 0.2);
      }

      // Change sky color
      if (this.sky) {
        const skyMaterial = this.sky.material as THREE.MeshBasicMaterial;
        const nightColor = new THREE.Color(0x0a0a2a); // Dark blue
        const dayColor = new THREE.Color(0x87ceeb); // Sky blue
        skyMaterial.color.copy(nightColor).lerp(dayColor, t);
      }
    }

    // Create a HUD element to show time of day
    this.updateTimeDisplay();
  }

  updateTimeDisplay(): void {
    // Get or create time display element
    let timeDisplay = document.getElementById("time-display");
    if (!timeDisplay) {
      timeDisplay = document.createElement("div");
      timeDisplay.id = "time-display";
      timeDisplay.style.position = "absolute";
      timeDisplay.style.top = "10px";
      timeDisplay.style.right = "10px";
      timeDisplay.style.color = "white";
      timeDisplay.style.fontFamily = "Arial, sans-serif";
      timeDisplay.style.padding = "5px";
      timeDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      timeDisplay.style.borderRadius = "5px";
      document.body.appendChild(timeDisplay);
    }

    // Calculate time in hours (0-24)
    const hours = Math.floor(this.timeOfDay * 24);
    const minutes = Math.floor((this.timeOfDay * 24 * 60) % 60);

    // Format time string
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;

    // Determine time of day label
    let timeLabel = "";
    if (hours >= 5 && hours < 12) {
      timeLabel = "Morning";
    } else if (hours >= 12 && hours < 17) {
      timeLabel = "Afternoon";
    } else if (hours >= 17 && hours < 21) {
      timeLabel = "Evening";
    } else {
      timeLabel = "Night";
    }

    // Update display
    timeDisplay.textContent = `${timeString} - ${timeLabel}`;
  }

  update(delta: number): void {
    // Update any animated elements in the world
    this.updateDayNightCycle(delta);
  }

  isInsideBuilding(position: THREE.Vector3): boolean {
    // Check if the position is inside any building
    for (const building of this.buildings) {
      const buildingPos = building.position;

      // Check if position is within building bounds
      if (
        position.x >= buildingPos.x - building.width / 2 &&
        position.x <= buildingPos.x + building.width / 2 &&
        position.z >= buildingPos.z - building.depth / 2 &&
        position.z <= buildingPos.z + building.depth / 2 &&
        position.y >= buildingPos.y &&
        position.y <= buildingPos.y + building.height
      ) {
        return true;
      }
    }

    return false;
  }
}
