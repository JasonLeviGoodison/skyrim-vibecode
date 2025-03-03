import * as THREE from "three";
import { Player } from "./Player";
import { Inventory } from "./Inventory";
import { WeaponSystem } from "./WeaponSystem";
import { ChestItem, ItemTypes, Chest } from "../types";

export class ChestSystem {
  scene: THREE.Scene;
  inventory: Inventory;
  player: Player;
  weaponSystem: WeaponSystem | null;
  chests: Chest[];
  openChestIndex: number;
  itemTypes: ItemTypes;

  constructor(scene: THREE.Scene, inventory: Inventory, player: Player) {
    this.scene = scene;
    this.inventory = inventory;
    this.player = player;
    this.weaponSystem = null; // Will be set later

    // Chest properties
    this.chests = [];
    this.openChestIndex = -1;

    // Items that can be found in chests
    this.itemTypes = {
      food: [
        {
          name: "Apple",
          type: "food",
          healAmount: 10,
          description: "A fresh apple. Restores 10 health.",
        },
        {
          name: "Bread",
          type: "food",
          healAmount: 20,
          description: "Freshly baked bread. Restores 20 health.",
        },
        {
          name: "Cheese",
          type: "food",
          healAmount: 15,
          description: "A wedge of cheese. Restores 15 health.",
        },
        {
          name: "Meat",
          type: "food",
          healAmount: 30,
          description: "Cooked meat. Restores 30 health.",
        },
      ],
      weapon: [
        {
          name: "Better Sword",
          type: "weapon",
          damage: 35,
          description: "A sharper sword. Deals more damage.",
        },
        {
          name: "Fire Arrow",
          type: "weapon",
          damage: 25,
          description: "Arrows that burn enemies. Deals fire damage.",
        },
      ],
      potion: [
        {
          name: "Health Potion",
          type: "potion",
          healAmount: 50,
          description: "A potion that restores 50 health.",
        },
        {
          name: "Strength Potion",
          type: "potion",
          damageBoost: 1.5,
          description: "A potion that increases damage by 50%.",
        },
      ],
    };

    // Create chests
    this.createChests();

    // Set up chest UI
    this.setupChestUI();
  }

  setWeaponSystem(weaponSystem: WeaponSystem): void {
    this.weaponSystem = weaponSystem;
  }

  createChests(): void {
    // Create chest material
    const chestMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      metalness: 0.3,
      roughness: 0.8,
    });

    // Create chest lock material
    const lockMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold
      metalness: 0.8,
      roughness: 0.2,
    });

    // Create 5 chests at random positions
    for (let i = 0; i < 5; i++) {
      // Create chest group
      const chestGroup = new THREE.Group();

      // Create chest base
      const baseGeometry = new THREE.BoxGeometry(1, 0.5, 0.7);
      const base = new THREE.Mesh(baseGeometry, chestMaterial);
      base.position.y = 0.25;
      chestGroup.add(base);

      // Create chest lid
      const lidGeometry = new THREE.BoxGeometry(1, 0.3, 0.7);
      const lid = new THREE.Mesh(lidGeometry, chestMaterial);
      lid.position.set(0, 0.65, -0.2);
      chestGroup.add(lid);

      // Create chest lock
      const lockGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
      const lock = new THREE.Mesh(lockGeometry, lockMaterial);
      lock.position.set(0, 0.5, 0.35);
      chestGroup.add(lock);

      // Random position
      const x = Math.floor(Math.random() * 80) - 40;
      const z = Math.floor(Math.random() * 80) - 40;

      // Get terrain height at this position
      let y = 0;
      if (this.player.world) {
        y = this.player.world.getHeightAt(x, z);
      }

      // Position chest
      chestGroup.position.set(x, y, z);

      // Add chest to scene
      this.scene.add(chestGroup);

      // Create chest mesh for raycasting
      const chestMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.8, 0.7),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      chestMesh.position.copy(chestGroup.position);
      chestMesh.position.y += 0.4;
      chestMesh.userData.isChest = true;
      chestMesh.userData.chestIndex = i;
      this.scene.add(chestMesh);

      // Generate random items for chest
      const items: ChestItem[] = [];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items

      for (let j = 0; j < numItems; j++) {
        // Random item type
        const itemTypes = Object.keys(this.itemTypes);
        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

        // Random item of that type
        const itemsOfType = this.itemTypes[itemType];
        const item = { ...itemsOfType[Math.floor(Math.random() * itemsOfType.length)] };

        // Add item to chest
        items.push(item);
      }

      // Add chest to list
      this.chests.push({
        mesh: chestMesh,
        position: chestGroup.position.clone(),
        items: items,
        isOpen: false,
      });
    }
  }

  setupChestUI(): void {
    // Get chest UI elements
    const chestUI = document.getElementById("chest-ui");
    const chestItems = document.getElementById("chest-items");
    const takeAllButton = document.getElementById("take-all");
    const closeButton = document.getElementById("close-chest");

    // Add event listeners
    if (takeAllButton) {
      takeAllButton.addEventListener("click", () => {
        this.takeAllItems();
      });
    }

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        this.closeChest();
      });
    }
  }

  openChest(chestMesh: THREE.Object3D): void {
    // Get chest index
    const chestIndex = chestMesh.userData.chestIndex;

    // Check if chest exists
    if (chestIndex === undefined || chestIndex < 0 || chestIndex >= this.chests.length) {
      return;
    }

    // Get chest
    const chest = this.chests[chestIndex];

    // Check if chest is already open
    if (chest.isOpen) {
      return;
    }

    // Open chest
    chest.isOpen = true;
    this.openChestIndex = chestIndex;

    // Show chest UI
    const chestUI = document.getElementById("chest-ui");
    if (chestUI) {
      chestUI.style.display = "block";
    }

    // Populate chest items
    this.populateChestItems();

    // Exit pointer lock
    document.exitPointerLock();
  }

  closeChest(): void {
    // Hide chest UI
    const chestUI = document.getElementById("chest-ui");
    if (chestUI) {
      chestUI.style.display = "none";
    }

    // Reset open chest
    if (this.openChestIndex !== -1) {
      this.chests[this.openChestIndex].isOpen = false;
      this.openChestIndex = -1;
    }

    // Request pointer lock
    document.body.requestPointerLock();
  }

  populateChestItems(): void {
    // Get chest items container
    const chestItemsContainer = document.getElementById("chest-items");

    if (!chestItemsContainer || this.openChestIndex === -1) {
      return;
    }

    // Clear existing items
    chestItemsContainer.innerHTML = "";

    // Get chest
    const chest = this.chests[this.openChestIndex];

    // Add items to UI
    for (let i = 0; i < chest.items.length; i++) {
      const item = chest.items[i];

      // Create item element
      const itemElement = document.createElement("div");
      itemElement.className = "chest-item";
      itemElement.textContent = item.name;
      itemElement.dataset.index = i.toString();

      // Add tooltip with description
      itemElement.title = item.description;

      // Add click event to take item
      itemElement.addEventListener("click", () => {
        this.takeItem(parseInt(itemElement.dataset.index || "0"));
      });

      // Add item to container
      chestItemsContainer.appendChild(itemElement);
    }
  }

  takeItem(index: number): void {
    // Check if chest is open
    if (this.openChestIndex === -1) {
      return;
    }

    // Get chest
    const chest = this.chests[this.openChestIndex];

    // Check if index is valid
    if (index < 0 || index >= chest.items.length) {
      return;
    }

    // Get item
    const item = chest.items[index];

    // Handle special items
    if (item.type === "weapon" && item.name === "Better Sword" && this.weaponSystem) {
      // Acquire better sword
      this.weaponSystem.acquireBetterSword();
      console.log("Acquired better sword!");
    } else {
      // Add item to inventory
      const added = this.inventory.addItem(item);

      if (!added) {
        console.log("Inventory is full!");
        return;
      }
    }

    // Remove item from chest
    chest.items.splice(index, 1);

    // Update chest UI
    this.populateChestItems();

    // Close chest if empty
    if (chest.items.length === 0) {
      this.closeChest();
    }
  }

  takeAllItems(): void {
    // Check if chest is open
    if (this.openChestIndex === -1) {
      return;
    }

    // Get chest
    const chest = this.chests[this.openChestIndex];

    // Take all items
    for (let i = chest.items.length - 1; i >= 0; i--) {
      this.takeItem(i);
    }
  }

  update(delta: number, camera: THREE.Camera): void {
    // Check if player is looking at a chest
    if (this.openChestIndex === -1) {
      // Create raycaster from camera
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(), camera);

      // Get all chests
      const chestMeshes = this.chests.map((chest) => chest.mesh);

      // Check for intersections
      const intersects = raycaster.intersectObjects(chestMeshes);

      // If looking at a chest, show prompt
      if (intersects.length > 0 && intersects[0].distance < 5) {
        // TODO: Show prompt to open chest
      }
    }
  }
}
