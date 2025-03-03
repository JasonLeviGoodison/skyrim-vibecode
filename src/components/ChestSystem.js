import * as THREE from "three";

export class ChestSystem {
  constructor(scene, inventory, player) {
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
          name: "Apple",Th
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
        {
          name: "Potion",
          type: "food",
          healAmount: 50,
          description: "A healing potion. Restores 50 health.",
        },
      ],
      weapon: [
        {
          name: "Better Sword",
          type: "weapon",
          weaponType: "betterSword",
          description: "A stronger, sharper sword that deals more damage.",
        },
      ],
      treasure: [
        {
          name: "Gold Coins",
          type: "treasure",
          value: 50,
          description: "A small pile of gold coins.",
        },
        {
          name: "Jewel",
          type: "treasure",
          value: 100,
          description: "A sparkling jewel.",
        },
        {
          name: "Ancient Relic",
          type: "treasure",
          value: 200,
          description: "A mysterious ancient relic.",
        },
      ],
    };

    // Create chests
    this.createChests();
  }

  setWeaponSystem(weaponSystem) {
    this.weaponSystem = weaponSystem;
  }

  createChests() {
    // Number of chests to create
    const numChests = 5;

    // Chest material
    const chestMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      flatShading: true,
    });

    // Create chest model with lid and base
    const createChestModel = (x, y, z) => {
      const chestGroup = new THREE.Group();
      chestGroup.position.set(x, y, z);

      // Base of chest
      const baseGeometry = new THREE.BoxGeometry(1, 0.5, 0.7);
      const base = new THREE.Mesh(baseGeometry, chestMaterial);
      base.position.set(0, 0, 0);
      base.castShadow = true;
      base.receiveShadow = true;
      chestGroup.add(base);

      // Lid of chest
      const lidGeometry = new THREE.BoxGeometry(1.1, 0.3, 0.8);
      const lidMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        flatShading: true,
      });
      const lid = new THREE.Mesh(lidGeometry, lidMaterial);
      lid.position.set(0, 0.4, 0);
      lid.castShadow = true;
      lid.receiveShadow = true;
      chestGroup.add(lid);

      // Add metal details
      const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.8,
        roughness: 0.2,
      });

      // Add lock
      const lockGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
      const lock = new THREE.Mesh(lockGeometry, metalMaterial);
      lock.position.set(0, 0.3, 0.4);
      chestGroup.add(lock);

      // Add hinges
      const hingeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
      const hinge = new THREE.Mesh(hingeGeometry, metalMaterial);
      hinge.rotation.set(0, 0, Math.PI / 2);
      hinge.position.set(0, 0.25, -0.35);
      chestGroup.add(hinge);

      this.scene.add(chestGroup);

      return {
        group: chestGroup,
        base: base,
        lid: lid,
        originalLidPosition: lid.position.clone(),
        originalLidRotation: lid.rotation.clone(),
      };
    };

    // Create chests at random positions
    for (let i = 0; i < numChests; i++) {
      // Random position
      const x = Math.floor(Math.random() * 50) - 25;
      const z = Math.floor(Math.random() * 50) - 25;
      const y = 0.25; // Half height of chest base

      // Get terrain height at this position
      const terrainHeight = this.player.world ? this.player.world.getHeightAt(x, z) : 0;

      // Create chest model
      const chestModel = createChestModel(x, terrainHeight + y, z);

      // Generate random items for chest
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const items = [];

      for (let j = 0; j < numItems; j++) {
        // Randomly select item type
        const itemTypeKeys = Object.keys(this.itemTypes);
        const randomTypeIndex = Math.floor(Math.random() * itemTypeKeys.length);
        const itemType = itemTypeKeys[randomTypeIndex];

        // Get items of this type
        const itemsOfType = this.itemTypes[itemType];

        // Special case for weapons - only add if not already acquired
        if (itemType === "weapon" && this.weaponSystem) {
          const betterSwordItem = itemsOfType.find((item) => item.weaponType === "betterSword");
          if (betterSwordItem && !this.weaponSystem.weapons.betterSword.acquired) {
            items.push({ ...betterSwordItem });
            continue;
          }
        } else if (itemsOfType.length > 0) {
          // Random item of this type
          const randomItemIndex = Math.floor(Math.random() * itemsOfType.length);
          items.push({ ...itemsOfType[randomItemIndex] });
        }
      }

      // Store chest
      this.chests.push({
        mesh: chestModel.group,
        base: chestModel.base,
        lid: chestModel.lid,
        originalLidPosition: chestModel.originalLidPosition,
        originalLidRotation: chestModel.originalLidRotation,
        position: new THREE.Vector3(x, terrainHeight + y, z),
        items: items,
        isOpen: false,
      });

      // Mark chest as interactable but not collidable
      chestModel.group.userData.isInteractable = true;

      // Create a smaller collision box for the chest that doesn't block movement
      // but still prevents the player from walking through the center
      const collisionBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      collisionBox.position.set(x, terrainHeight + y, z);
      collisionBox.userData.isCollidable = true;
      this.scene.add(collisionBox);
    }
  }

  openChest(index) {
    // Check if chest exists
    if (index >= 0 && index < this.chests.length) {
      const chest = this.chests[index];

      // Check if chest is already open
      if (chest.isOpen) {
        console.log("Chest is already open.");
        return;
      }

      // Open chest
      chest.isOpen = true;
      this.openChestIndex = index;

      // Animate chest opening
      const lid = chest.lid;
      const originalPosition = chest.originalLidPosition.clone();
      const originalRotation = chest.originalLidRotation.clone();

      // Animate lid opening
      const openTween = {
        progress: 0,
        duration: 500, // ms
        startTime: performance.now(),
      };

      const animateOpen = () => {
        const now = performance.now();
        const elapsed = now - openTween.startTime;
        openTween.progress = Math.min(elapsed / openTween.duration, 1);

        // Rotate lid
        lid.rotation.x = originalRotation.x - (openTween.progress * Math.PI) / 2;

        if (openTween.progress < 1) {
          requestAnimationFrame(animateOpen);
        }
      };

      animateOpen();

      console.log("Opened chest.");

      // Show chest contents
      this.showChestContents(index);
    }
  }

  closeChest(index) {
    // Check if chest exists
    if (index >= 0 && index < this.chests.length) {
      const chest = this.chests[index];

      // Check if chest is open
      if (!chest.isOpen) {
        return;
      }

      // Close chest
      chest.isOpen = false;
      this.openChestIndex = -1;

      // Animate chest closing
      const lid = chest.lid;
      const originalPosition = chest.originalLidPosition.clone();
      const originalRotation = chest.originalLidRotation.clone();

      // Animate lid closing
      const closeTween = {
        progress: 0,
        duration: 500, // ms
        startTime: performance.now(),
      };

      const animateClose = () => {
        const now = performance.now();
        const elapsed = now - closeTween.startTime;
        closeTween.progress = Math.min(elapsed / closeTween.duration, 1);

        // Rotate lid back
        lid.rotation.x = originalRotation.x - ((1 - closeTween.progress) * Math.PI) / 2;

        if (closeTween.progress < 1) {
          requestAnimationFrame(animateClose);
        } else {
          // Reset lid position and rotation
          lid.position.copy(originalPosition);
          lid.rotation.copy(originalRotation);
        }
      };

      animateClose();

      console.log("Closed chest.");
    }
  }

  showChestContents(index) {
    // Check if chest exists
    if (index >= 0 && index < this.chests.length) {
      const chest = this.chests[index];

      // Log chest contents
      console.log("Chest contains:");

      for (const item of chest.items) {
        console.log(`- ${item.name}: ${item.description}`);
      }

      // Create a custom dialog for chest contents
      const dialog = document.createElement("div");
      dialog.style.position = "absolute";
      dialog.style.top = "50%";
      dialog.style.left = "50%";
      dialog.style.transform = "translate(-50%, -50%)";
      dialog.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      dialog.style.color = "white";
      dialog.style.padding = "20px";
      dialog.style.borderRadius = "5px";
      dialog.style.minWidth = "300px";
      dialog.style.maxWidth = "500px";
      dialog.style.zIndex = "1000";
      dialog.style.fontFamily = "Arial, sans-serif";

      // Add title
      const title = document.createElement("h2");
      title.textContent = "Chest Contents";
      title.style.textAlign = "center";
      title.style.marginTop = "0";
      dialog.appendChild(title);

      // Add items list
      const itemsList = document.createElement("ul");
      itemsList.style.listStyleType = "none";
      itemsList.style.padding = "0";

      for (const item of chest.items) {
        const itemElement = document.createElement("li");
        itemElement.style.margin = "10px 0";
        itemElement.style.padding = "10px";
        itemElement.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        itemElement.style.borderRadius = "3px";

        const itemName = document.createElement("div");
        itemName.textContent = item.name;
        itemName.style.fontWeight = "bold";
        itemName.style.marginBottom = "5px";

        const itemDesc = document.createElement("div");
        itemDesc.textContent = item.description;
        itemDesc.style.fontSize = "0.9em";
        itemDesc.style.opacity = "0.8";

        itemElement.appendChild(itemName);
        itemElement.appendChild(itemDesc);
        itemsList.appendChild(itemElement);
      }

      dialog.appendChild(itemsList);

      // Add buttons
      const buttonContainer = document.createElement("div");
      buttonContainer.style.display = "flex";
      buttonContainer.style.justifyContent = "space-between";
      buttonContainer.style.marginTop = "20px";

      const takeButton = document.createElement("button");
      takeButton.textContent = "Take All";
      takeButton.style.padding = "8px 16px";
      takeButton.style.backgroundColor = "#4CAF50";
      takeButton.style.border = "none";
      takeButton.style.borderRadius = "3px";
      takeButton.style.color = "white";
      takeButton.style.cursor = "pointer";

      const leaveButton = document.createElement("button");
      leaveButton.textContent = "Leave";
      leaveButton.style.padding = "8px 16px";
      leaveButton.style.backgroundColor = "#f44336";
      leaveButton.style.border = "none";
      leaveButton.style.borderRadius = "3px";
      leaveButton.style.color = "white";
      leaveButton.style.cursor = "pointer";

      buttonContainer.appendChild(takeButton);
      buttonContainer.appendChild(leaveButton);
      dialog.appendChild(buttonContainer);

      // Add dialog to document
      document.body.appendChild(dialog);

      // Handle button clicks
      takeButton.addEventListener("click", () => {
        // Process each item
        for (const item of chest.items) {
          if (item.type === "food") {
            // Add food to inventory
            this.inventory.addItem(item);
          } else if (item.type === "weapon" && this.weaponSystem) {
            // Handle weapon acquisition
            if (item.weaponType === "betterSword") {
              this.weaponSystem.acquireBetterSword();
            }
          } else if (item.type === "treasure") {
            // For now, just log treasure acquisition
            console.log(`Acquired ${item.name} worth ${item.value} gold.`);
          }
        }

        // Clear chest items
        chest.items = [];

        // Remove dialog
        document.body.removeChild(dialog);

        // Lock pointer again
        this.player.controls.lock();
      });

      leaveButton.addEventListener("click", () => {
        // Remove dialog
        document.body.removeChild(dialog);

        // Lock pointer again
        this.player.controls.lock();
      });

      // Unlock pointer to interact with dialog
      document.exitPointerLock();
    }
  }

  update(delta, camera) {
    // Check if player is looking at a chest
    if (this.openChestIndex === -1) {
      // Cast ray from camera
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      // Get all chest meshes and their children for interaction
      const chestMeshes = [];
      this.chests.forEach((chest) => {
        chestMeshes.push(chest.mesh);
        // Also add all children of the chest mesh
        if (chest.mesh.children) {
          chest.mesh.children.forEach((child) => {
            chestMeshes.push(child);
          });
        }
      });

      // Get intersections with chests
      const intersects = raycaster.intersectObjects(chestMeshes, true);

      // Highlight chest if player is looking at it
      for (let i = 0; i < this.chests.length; i++) {
        const chest = this.chests[i];

        // Reset chest color
        if (chest.base && chest.base.material) {
          chest.base.material.emissive.set(0x000000);
        }
      }

      if (intersects.length > 0 && intersects[0].distance < this.player.interactionDistance) {
        // Get the hit object
        const hitObject = intersects[0].object;

        // Find which chest was hit (either directly or one of its children)
        let chestIndex = this.chests.findIndex((chest) => chest.mesh === hitObject);

        // If not found directly, check if it's a child of a chest
        if (chestIndex === -1) {
          chestIndex = this.chests.findIndex(
            (chest) =>
              chest.mesh.children && chest.mesh.children.some((child) => child === hitObject)
          );
        }

        if (
          chestIndex !== -1 &&
          this.chests[chestIndex].base &&
          this.chests[chestIndex].base.material
        ) {
          // Highlight chest
          this.chests[chestIndex].base.material.emissive.set(0x555555);

          // Show interaction hint
          if (this.player.showMessage) {
            this.player.showMessage("Press E to open chest", 500);
          }
        }
      }
    }
  }
}
