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

// Create floor
const floorGeometry = new THREE.PlaneGeometry(20, 20);
floorGeometry.rotateX(-Math.PI / 2);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b4513,
  roughness: 0.8,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.receiveShadow = true;
scene.add(floor);

// Create furniture
createFurniture();

function createFurniture() {
  // Create bed
  const bed = Furniture.create(scene, "bed", new THREE.Vector3(-5, 0, 0), {
    width: 2.5,
    length: 5,
    height: 0.8,
  });

  // Create desk
  const desk = Furniture.create(scene, "desk", new THREE.Vector3(0, 0, -5), {
    width: 2.5,
    depth: 1.2,
    height: 1.3,
  });

  // Create chair
  const chair = Furniture.create(scene, "chair", new THREE.Vector3(0, 0, -3), {
    width: 0.9,
    depth: 0.9,
    seatHeight: 0.9,
  });

  // Create chest
  const chest = Furniture.create(scene, "chest", new THREE.Vector3(5, 0, 0), {
    width: 1.8,
    depth: 1.2,
    height: 1.0,
  });

  // Create table
  const table = Furniture.create(scene, "table", new THREE.Vector3(0, 0, 5), {
    width: 4,
    depth: 2,
    height: 1.4,
  });
}

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
