import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Furniture } from "./components/Furniture";

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue

// Create camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Add ground
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x7cfc00, // Lawn green
  flatShading: true,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Add grid helper
const gridHelper = new THREE.GridHelper(50, 50);
scene.add(gridHelper);

// Create furniture
createFurniture();

function createFurniture(): void {
  // Create a bed
  Furniture.createBed(scene, new THREE.Vector3(-5, 0, 0), {
    width: 2,
    height: 0.5,
    depth: 3,
  });

  // Create a desk
  Furniture.createDesk(scene, new THREE.Vector3(0, 0, 0), {
    width: 2,
    height: 0.8,
    depth: 1,
  });

  // Create a chair
  Furniture.createChair(scene, new THREE.Vector3(0, 0, 2), {
    width: 0.6,
    height: 1.2,
    depth: 0.6,
  });

  // Create a chest
  Furniture.createChest(scene, new THREE.Vector3(3, 0, 0), {
    width: 1,
    height: 0.8,
    depth: 0.7,
  });

  // Create a table
  Furniture.createTable(scene, new THREE.Vector3(5, 0, 0), {
    width: 2,
    height: 0.8,
    depth: 1,
  });
}

// Animation loop
function animate(): void {
  requestAnimationFrame(animate);

  // Update controls
  controls.update();

  // Render scene
  renderer.render(scene, camera);
}

// Start animation
animate();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
