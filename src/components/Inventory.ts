import { InventoryItem } from "../types";

export class Inventory {
  inventorySize: number;
  items: (InventoryItem | null)[];
  isOpen: boolean;

  constructor() {
    this.inventorySize = 15; // Number of inventory slots
    this.items = new Array(this.inventorySize).fill(null); // Array of items in inventory
    this.isOpen = false; // Whether inventory is open

    // Initialize inventory UI
    this.initInventoryUI();
  }

  initInventoryUI(): void {
    // Get inventory container
    const inventoryItems = document.getElementById("inventory-items");

    if (inventoryItems) {
      // Clear existing slots
      inventoryItems.innerHTML = "";

      // Create inventory slots
      for (let i = 0; i < this.inventorySize; i++) {
        const slot = document.createElement("div");
        slot.className = "inventory-item";
        slot.dataset.index = i.toString();

        // Add click event to use item
        slot.addEventListener("click", () => {
          this.useItem(i);
        });

        inventoryItems.appendChild(slot);
      }
    }
  }

  toggleInventory(): void {
    // Get inventory container
    const inventory = document.getElementById("inventory");

    if (inventory) {
      // Toggle inventory visibility
      this.isOpen = !this.isOpen;
      inventory.style.display = this.isOpen ? "block" : "none";

      // Lock/unlock pointer
      if (this.isOpen) {
        document.exitPointerLock();
      }
    }
  }

  addItem(item: InventoryItem): boolean {
    // Find empty slot
    const emptySlot = this.findEmptySlot();

    if (emptySlot !== -1) {
      // Add item to inventory
      this.items[emptySlot] = item;

      // Update UI
      this.updateInventoryUI();

      console.log(`Added ${item.name} to inventory.`);
      return true;
    } else {
      console.log("Inventory is full.");
      return false;
    }
  }

  removeItem(index: number): InventoryItem | null {
    // Check if slot has an item
    if (this.items[index]) {
      // Remove item from inventory
      const item = this.items[index];
      this.items[index] = null;

      // Update UI
      this.updateInventoryUI();

      if (item) {
        console.log(`Removed ${item.name} from inventory.`);
      }
      return item;
    }

    return null;
  }

  useItem(index: number): void {
    // Check if slot has an item
    if (this.items[index]) {
      const item = this.items[index];

      if (item) {
        // Handle different item types
        switch (item.type) {
          case "food":
            // Food items are handled by the Player class
            // We'll just leave the item in the inventory
            break;
          default:
            console.log(`Used ${item.name}.`);
            break;
        }
      }
    }
  }

  findEmptySlot(): number {
    // Find first empty slot
    for (let i = 0; i < this.inventorySize; i++) {
      if (!this.items[i]) {
        return i;
      }
    }

    return -1;
  }

  updateInventoryUI(): void {
    // Get inventory container
    const inventoryItems = document.getElementById("inventory-items");

    if (inventoryItems) {
      // Update each slot
      const slots = inventoryItems.children;
      for (let i = 0; i < this.inventorySize; i++) {
        if (i < slots.length) {
          const slot = slots[i] as HTMLElement;

          // Clear slot
          slot.innerHTML = "";
          slot.dataset.item = "";

          // Add item if exists
          if (this.items[i]) {
            const item = this.items[i];

            if (item) {
              // Create item element
              const itemElement = document.createElement("div");
              itemElement.className = "inventory-item-content";
              itemElement.textContent = item.name;

              // Add item to slot
              slot.appendChild(itemElement);
              slot.dataset.item = JSON.stringify(item);
            }
          }
        }
      }
    }
  }
}
