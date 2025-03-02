import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

export class World {
  constructor(scene) {
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
  }

  // Simple hash function for seeding the noise
  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // Seeded random function
  seededRandom(x, y) {
    const seedVal = this.hash(this.seed + x.toString() + y.toString());
    return (Math.sin(seedVal) + 1) / 2;
  }

  generateTerrain() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(
      this.worldSize * this.blockSize,
      this.worldSize * this.blockSize,
      this.worldSize - 1,
      this.worldSize - 1
    );
    groundGeometry.rotateX(-Math.PI / 2);

    // Generate height map using Simplex noise with fixed seed
    const noise = new SimplexNoise();
    const vertices = groundGeometry.attributes.position.array;

    // Initialize height map
    for (let i = 0; i < this.worldSize; i++) {
      this.heightMap[i] = [];
      for (let j = 0; j < this.worldSize; j++) {
        this.heightMap[i][j] = 0;
      }
    }

    // Apply noise to vertices
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];

      // Use seeded random values to offset the noise coordinates
      const offsetX = this.seededRandom(1, 1) * 100;
      const offsetZ = this.seededRandom(2, 2) * 100;

      // Generate height using multiple octaves of noise for more interesting terrain
      // But with reduced amplitude for smoother hills
      let height = 0;
      height += noise.noise((x + offsetX) * 0.005, (z + offsetZ) * 0.005) * 5; // Large features (reduced amplitude and frequency)
      height += noise.noise((x + offsetX) * 0.02, (z + offsetZ) * 0.02) * 1; // Medium features (reduced amplitude)
      height += noise.noise((x + offsetX) * 0.05, (z + offsetZ) * 0.05) * 0.5; // Small features (reduced amplitude)

      // Make the terrain smoother with less extreme hills and valleys
      height = Math.pow(Math.abs(height), 0.8) * Math.sign(height);

      // Store height in height map
      const mapX = Math.floor((x + (this.worldSize * this.blockSize) / 2) / this.blockSize);
      const mapZ = Math.floor((z + (this.worldSize * this.blockSize) / 2) / this.blockSize);

      if (mapX >= 0 && mapX < this.worldSize && mapZ >= 0 && mapZ < this.worldSize) {
        this.heightMap[mapX][mapZ] = height;
      }

      // Apply height to vertex
      vertices[i + 1] = height;
    }

    // Update geometry
    groundGeometry.computeVertexNormals();

    // Create ground material
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
      side: THREE.DoubleSide,
    });

    // Create ground mesh
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    ground.name = "ground";

    // Add ground to scene
    this.scene.add(ground);

    // Add grass on top of the terrain
    this.addGrass();

    // Add sky dome instead of black walls
    this.addSkyDome();
  }

  addSkyDome() {
    // Create a large sky dome
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    // Flip the geometry inside out
    skyGeometry.scale(-1, 1, 1);

    // Create sky material with gradient
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) }, // Blue
        bottomColor: { value: new THREE.Color(0xffffff) }, // White
        offset: { value: 400 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);

    // Also set the scene background color to a light blue
    // This ensures we have a blue sky even if the shader doesn't render properly
    this.scene.background = new THREE.Color(0x87ceeb);
  }

  addGrass() {
    // Create grass material
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x567d46, // Green
      flatShading: true,
      side: THREE.DoubleSide,
    });

    // Create grass geometry
    const grassGeometry = new THREE.PlaneGeometry(
      this.worldSize * this.blockSize,
      this.worldSize * this.blockSize,
      this.worldSize - 1,
      this.worldSize - 1
    );
    grassGeometry.rotateX(-Math.PI / 2);

    // Apply height map to grass
    const vertices = grassGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];

      const mapX = Math.floor((x + (this.worldSize * this.blockSize) / 2) / this.blockSize);
      const mapZ = Math.floor((z + (this.worldSize * this.blockSize) / 2) / this.blockSize);

      if (mapX >= 0 && mapX < this.worldSize && mapZ >= 0 && mapZ < this.worldSize) {
        vertices[i + 1] = this.heightMap[mapX][mapZ] + 0.01; // Slightly above ground
      }
    }

    // Update geometry
    grassGeometry.computeVertexNormals();

    // Create grass mesh
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.receiveShadow = true;
    grass.name = "grass";

    // Add grass to scene
    this.scene.add(grass);
  }

  generateTrees() {
    // Number of trees to generate
    const numTrees = 20;

    // Tree trunk material
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    // Tree leaves material
    const leavesMaterial = new THREE.MeshStandardMaterial({
      color: 0x228b22, // Forest green
      flatShading: true,
    });

    // Generate trees at random positions using seeded random
    for (let i = 0; i < numTrees; i++) {
      // Use seeded random for consistent tree placement
      const xRand = this.seededRandom(i, 0);
      const zRand = this.seededRandom(0, i);

      // Random position
      const x = Math.floor(xRand * this.worldSize) - this.worldSize / 2;
      const z = Math.floor(zRand * this.worldSize) - this.worldSize / 2;

      // Get height at position
      const terrainHeight = this.getHeightAt(x, z);

      // Only place trees on relatively flat areas
      if (terrainHeight !== null) {
        // Create tree group
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, terrainHeight, z);
        treeGroup.userData.isCollidable = true; // Mark as collidable for collision detection

        // Create tree trunk
        const trunkGeometry = new THREE.BoxGeometry(0.5, 3, 0.5);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(0, 1.5, 0); // Position relative to group
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.userData.isCollidable = true; // Make trunk collidable
        treeGroup.add(trunk);

        // Create tree leaves
        const leavesGeometry = new THREE.BoxGeometry(2, 2, 2);
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(0, 3.5, 0); // Position relative to group
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        leaves.userData.isCollidable = true; // Make leaves collidable
        treeGroup.add(leaves);

        // Add tree to scene
        this.scene.add(treeGroup);

        // Store tree
        this.trees.push({
          group: treeGroup,
          trunk: trunk,
          leaves: leaves,
          position: new THREE.Vector3(x, terrainHeight, z),
        });
      }
    }
  }

  generateBuildings() {
    // Number of buildings to create
    const numBuildings = 5;

    // Building materials
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Tan
      flatShading: true,
    });

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4d2600, // Dark brown
      flatShading: true,
    });

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xadd8e6, // Light blue
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
      const wallGeometry = new THREE.BoxGeometry(width, height, depth);
      const walls = new THREE.Mesh(wallGeometry, wallMaterial);
      walls.position.set(0, height / 2, 0);
      walls.castShadow = true;
      walls.receiveShadow = true;
      buildingGroup.add(walls);

      // Create door
      const doorWidth = 1.5;
      const doorHeight = 3;
      const doorDepth = 0.2;
      const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
      const door = new THREE.Mesh(doorGeometry, doorMaterial);
      door.userData.isDoor = true;

      // Position door based on entrance side
      switch (entranceSide) {
        case 0: // Front
          door.position.set(0, doorHeight / 2, depth / 2 + 0.01);
          door.rotation.y = 0;
          break;
        case 1: // Right
          door.position.set(width / 2 + 0.01, doorHeight / 2, 0);
          door.rotation.y = Math.PI / 2;
          break;
        case 2: // Back
          door.position.set(0, doorHeight / 2, -depth / 2 - 0.01);
          door.rotation.y = Math.PI;
          break;
        case 3: // Left
          door.position.set(-width / 2 - 0.01, doorHeight / 2, 0);
          door.rotation.y = -Math.PI / 2;
          break;
      }

      buildingGroup.add(door);

      // Create windows
      const windowSize = 1.2;
      const windowDepth = 0.1;
      const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, windowDepth);

      // Calculate number of windows per side based on building dimensions
      const windowsPerWidth = Math.max(1, Math.floor(width / 3));
      const windowsPerDepth = Math.max(1, Math.floor(depth / 3));
      const windowsPerHeight = Math.max(1, Math.floor(height / 3));

      // Add windows to each side
      for (let side = 0; side < 4; side++) {
        // Skip the side with the door or add fewer windows there
        const isEntranceSide = side === entranceSide;
        const windowsOnThisSide = isEntranceSide
          ? Math.max(1, windowsPerWidth - 1)
          : windowsPerWidth;

        for (let wx = 0; wx < windowsOnThisSide; wx++) {
          for (let wy = 0; wy < windowsPerHeight; wy++) {
            // Skip window position if it would overlap with the door
            if (isEntranceSide && wx === Math.floor(windowsOnThisSide / 2) && wy === 0) {
              continue;
            }

            const window = new THREE.Mesh(windowGeometry, windowMaterial);

            // Position window based on side
            switch (side) {
              case 0: // Front
                window.position.set(
                  (wx - (windowsOnThisSide - 1) / 2) * (width / windowsOnThisSide),
                  (wy + 1) * (height / (windowsPerHeight + 1)),
                  depth / 2 + 0.01
                );
                break;
              case 1: // Right
                window.position.set(
                  width / 2 + 0.01,
                  (wy + 1) * (height / (windowsPerHeight + 1)),
                  (wx - (windowsOnThisSide - 1) / 2) * (depth / windowsOnThisSide)
                );
                window.rotation.y = Math.PI / 2;
                break;
              case 2: // Back
                window.position.set(
                  (wx - (windowsOnThisSide - 1) / 2) * (width / windowsOnThisSide),
                  (wy + 1) * (height / (windowsPerHeight + 1)),
                  -depth / 2 - 0.01
                );
                break;
              case 3: // Left
                window.position.set(
                  -width / 2 - 0.01,
                  (wy + 1) * (height / (windowsPerHeight + 1)),
                  (wx - (windowsOnThisSide - 1) / 2) * (depth / windowsOnThisSide)
                );
                window.rotation.y = -Math.PI / 2;
                break;
            }

            buildingGroup.add(window);
          }
        }
      }

      // Create roof (pyramid shape)
      const roofGeometry = new THREE.ConeGeometry(
        Math.sqrt(Math.pow(width / 2, 2) + Math.pow(depth / 2, 2)) + 0.5,
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
        if (object.isMesh) {
          object.userData.isCollidable = true;
        }
      });
    }
  }

  addCozyInterior(buildingGroup, width, depth, height, doorSide) {
    // Materials
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    const fabricMaterial = new THREE.MeshStandardMaterial({
      color: 0x964b00, // Brown
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

    // Calculate interior dimensions
    const interiorWidth = width - 1;
    const interiorDepth = depth - 1;

    // 1. Add Fireplace (opposite to the door)
    const fireplaceWidth = 2;
    const fireplaceDepth = 1;
    const fireplaceHeight = 3;

    // Position fireplace opposite to the door
    let fireplaceX = 0;
    let fireplaceZ = 0;

    switch (doorSide) {
      case 0: // Door on Front, fireplace on Back
        fireplaceZ = -interiorDepth / 2 + fireplaceDepth / 2;
        break;
      case 1: // Door on Right, fireplace on Left
        fireplaceX = -interiorWidth / 2 + fireplaceDepth / 2;
        fireplaceZ = 0;
        break;
      case 2: // Door on Back, fireplace on Front
        fireplaceZ = interiorDepth / 2 - fireplaceDepth / 2;
        break;
      case 3: // Door on Left, fireplace on Right
        fireplaceX = interiorWidth / 2 - fireplaceDepth / 2;
        fireplaceZ = 0;
        break;
    }

    // Create fireplace base
    const fireplaceBaseGeometry = new THREE.BoxGeometry(fireplaceWidth, 1, fireplaceDepth);
    const fireplaceBase = new THREE.Mesh(fireplaceBaseGeometry, stoneMaterial);
    fireplaceBase.position.set(fireplaceX, 0.5, fireplaceZ);
    buildingGroup.add(fireplaceBase);

    // Create fireplace sides
    const fireplaceSideGeometry = new THREE.BoxGeometry(0.5, fireplaceHeight, fireplaceDepth);

    const fireplaceSideLeft = new THREE.Mesh(fireplaceSideGeometry, stoneMaterial);
    fireplaceSideLeft.position.set(
      fireplaceX - fireplaceWidth / 2 + 0.25,
      fireplaceHeight / 2,
      fireplaceZ
    );
    buildingGroup.add(fireplaceSideLeft);

    const fireplaceSideRight = new THREE.Mesh(fireplaceSideGeometry, stoneMaterial);
    fireplaceSideRight.position.set(
      fireplaceX + fireplaceWidth / 2 - 0.25,
      fireplaceHeight / 2,
      fireplaceZ
    );
    buildingGroup.add(fireplaceSideRight);

    // Create fireplace top
    const fireplaceTopGeometry = new THREE.BoxGeometry(fireplaceWidth, 0.5, fireplaceDepth);
    const fireplaceTop = new THREE.Mesh(fireplaceTopGeometry, stoneMaterial);
    fireplaceTop.position.set(fireplaceX, fireplaceHeight - 0.25, fireplaceZ);
    buildingGroup.add(fireplaceTop);

    // Create fire
    const fireGeometry = new THREE.BoxGeometry(fireplaceWidth - 0.6, 0.8, fireplaceDepth - 0.2);
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.set(fireplaceX, 1, fireplaceZ);
    buildingGroup.add(fire);

    // 2. Add Chair (near fireplace)
    const chairWidth = 1;
    const chairDepth = 1;
    const chairHeight = 1.2;
    const chairBackHeight = 1;

    // Position chair near fireplace
    let chairX = fireplaceX + 2;
    let chairZ = fireplaceZ + 1;

    // Adjust chair position based on fireplace position
    if (doorSide === 0 || doorSide === 2) {
      chairX = fireplaceX + 2;
      chairZ = fireplaceZ + (doorSide === 0 ? 2 : -2);
    } else {
      chairX = fireplaceX + (doorSide === 3 ? 2 : -2);
      chairZ = fireplaceZ + 2;
    }

    // Create chair seat
    const chairSeatGeometry = new THREE.BoxGeometry(chairWidth, 0.2, chairDepth);
    const chairSeat = new THREE.Mesh(chairSeatGeometry, woodMaterial);
    chairSeat.position.set(chairX, chairHeight / 2, chairZ);
    buildingGroup.add(chairSeat);

    // Create chair back
    const chairBackGeometry = new THREE.BoxGeometry(chairWidth, chairBackHeight, 0.2);
    const chairBack = new THREE.Mesh(chairBackGeometry, woodMaterial);
    chairBack.position.set(
      chairX,
      chairHeight + chairBackHeight / 2,
      chairZ - chairDepth / 2 + 0.1
    );
    buildingGroup.add(chairBack);

    // Create chair legs
    const chairLegGeometry = new THREE.BoxGeometry(0.2, chairHeight, 0.2);

    for (let i = 0; i < 4; i++) {
      const legX = chairX + (i % 2 === 0 ? -chairWidth / 2 + 0.1 : chairWidth / 2 - 0.1);
      const legZ = chairZ + (i < 2 ? -chairDepth / 2 + 0.1 : chairDepth / 2 - 0.1);

      const chairLeg = new THREE.Mesh(chairLegGeometry, woodMaterial);
      chairLeg.position.set(legX, chairHeight / 4, legZ);
      buildingGroup.add(chairLeg);
    }

    // 3. Add Desk (on another wall)
    const deskWidth = 2;
    const deskDepth = 1;
    const deskHeight = 1.2;

    // Position desk on a wall that's not the door or fireplace
    let deskX = 0;
    let deskZ = 0;
    let deskRotation = 0;

    if (doorSide === 0 || doorSide === 2) {
      // Door on front/back, fireplace on back/front, so desk on left or right
      deskX = interiorWidth / 2 - deskDepth / 2;
      deskZ = 0;
      deskRotation = Math.PI / 2;
    } else {
      // Door on left/right, fireplace on right/left, so desk on front or back
      deskX = 0;
      deskZ = interiorDepth / 2 - deskDepth / 2;
    }

    // Create desk top
    const deskTopGeometry = new THREE.BoxGeometry(deskWidth, 0.2, deskDepth);
    const deskTop = new THREE.Mesh(deskTopGeometry, woodMaterial);
    deskTop.position.set(deskX, deskHeight, deskZ);
    deskTop.rotation.y = deskRotation;
    buildingGroup.add(deskTop);

    // Create desk legs
    const deskLegGeometry = new THREE.BoxGeometry(0.2, deskHeight, 0.2);

    for (let i = 0; i < 4; i++) {
      const legX =
        deskX +
        (deskRotation === 0
          ? i % 2 === 0
            ? -deskWidth / 2 + 0.1
            : deskWidth / 2 - 0.1
          : i < 2
          ? -deskDepth / 2 + 0.1
          : deskDepth / 2 - 0.1);

      const legZ =
        deskZ +
        (deskRotation === 0
          ? i < 2
            ? -deskDepth / 2 + 0.1
            : deskDepth / 2 - 0.1
          : i % 2 === 0
          ? -deskWidth / 2 + 0.1
          : deskWidth / 2 - 0.1);

      const deskLeg = new THREE.Mesh(deskLegGeometry, woodMaterial);
      deskLeg.position.set(legX, deskHeight / 2, legZ);
      buildingGroup.add(deskLeg);
    }

    // 4. Add Chest (in a corner)
    const chestWidth = 1.2;
    const chestDepth = 0.8;
    const chestHeight = 0.8;

    // Position chest in a corner
    let chestX = -interiorWidth / 2 + chestWidth / 2;
    let chestZ = -interiorDepth / 2 + chestDepth / 2;

    // Adjust if it conflicts with fireplace
    if (
      (doorSide === 1 && chestX > fireplaceX - fireplaceWidth / 2 - chestWidth) ||
      (doorSide === 0 && chestZ > fireplaceZ - fireplaceDepth / 2 - chestDepth)
    ) {
      chestX = interiorWidth / 2 - chestWidth / 2;
    }

    // Create chest base
    const chestBaseGeometry = new THREE.BoxGeometry(chestWidth, chestHeight * 0.7, chestDepth);
    const chestBase = new THREE.Mesh(chestBaseGeometry, woodMaterial);
    chestBase.position.set(chestX, chestHeight * 0.35, chestZ);
    buildingGroup.add(chestBase);

    // Create chest lid
    const chestLidGeometry = new THREE.BoxGeometry(chestWidth, chestHeight * 0.3, chestDepth);
    const chestLid = new THREE.Mesh(chestLidGeometry, woodMaterial);
    chestLid.position.set(chestX, chestHeight * 0.85, chestZ);
    buildingGroup.add(chestLid);

    // Add metal details to chest
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Add lock
    const lockGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const lock = new THREE.Mesh(lockGeometry, metalMaterial);
    lock.position.set(chestX, chestHeight * 0.7, chestZ + chestDepth / 2 + 0.05);
    buildingGroup.add(lock);
  }

  getHeightAt(x, z) {
    // Convert world coordinates to height map indices
    const mapX = Math.floor(x + this.worldSize / 2);
    const mapZ = Math.floor(z + this.worldSize / 2);

    // Check if within bounds
    if (mapX >= 0 && mapX < this.worldSize && mapZ >= 0 && mapZ < this.worldSize) {
      return this.heightMap[mapX][mapZ];
    }

    // If outside the world bounds, return a default height
    return 0;
  }

  // Bilinear interpolation for smoother height values
  getInterpolatedHeightAt(x, z) {
    // Convert world coordinates to height map coordinates
    const worldX = x + this.worldSize / 2;
    const worldZ = z + this.worldSize / 2;

    // Get the four surrounding points
    const x1 = Math.floor(worldX);
    const x2 = Math.ceil(worldX);
    const z1 = Math.floor(worldZ);
    const z2 = Math.ceil(worldZ);

    // Check if all points are within bounds
    if (x1 >= 0 && x2 < this.worldSize && z1 >= 0 && z2 < this.worldSize) {
      // Get the heights at the four corners
      const h11 = this.heightMap[x1][z1];
      const h21 = this.heightMap[x2][z1];
      const h12 = this.heightMap[x1][z2];
      const h22 = this.heightMap[x2][z2];

      // Calculate the fractional parts
      const xFrac = worldX - x1;
      const zFrac = worldZ - z1;

      // Bilinear interpolation
      const h1 = h11 * (1 - xFrac) + h21 * xFrac;
      const h2 = h12 * (1 - xFrac) + h22 * xFrac;

      return h1 * (1 - zFrac) + h2 * zFrac;
    }

    // Fallback to non-interpolated height
    return this.getHeightAt(x, z);
  }

  update(delta) {
    // Any world updates can go here
  }
}
