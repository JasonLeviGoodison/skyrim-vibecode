# Skyrim-Minecraft Game

A 3D game combining elements of Minecraft and Skyrim, built with Three.js.

## Features

- Minecraft-style blocky world with procedurally generated terrain
- Skyrim-inspired combat with sword and bow
- Realistic weapon models with proper sword blade, guard, and handle
- Beautiful sky dome with realistic blue gradient
- Explorable buildings with:
  - Clickable doors for entry
  - Separate interior maps that load when entering
  - Cozy furnished interiors including:
    - Fireplace with animated flames
    - Wooden desk for studying
    - Comfortable bed for resting
    - Storage chest for valuables
  - Multiple windows for natural lighting
  - Pyramid-shaped roofs
- Chests that can be opened to find various items:
  - Food items that restore health
  - Better weapons with improved stats
  - Treasure items like gold coins and jewels
- Inventory system for storing items
- Health system that can be replenished by consuming food
- First-person controls with WASD movement
- Realistic terrain collision and gravity physics
- Smooth movement over hills and valleys
- Object collision for trees, buildings, and chests
- Detailed debug information showing distances to nearest buildings and trees

## Controls

- **WASD** or **Arrow Keys**: Move
- **Space**: Jump
- **E**: Interact with objects (click on doors to enter buildings, exit buildings, open chests)
- **F**: Toggle between weapons (sword, better sword if found, bow)
- **Left Click**: Attack with current weapon
- **I**: Open/close inventory
- **1-3**: Consume item in inventory slot 1-3

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`

## Gameplay

- Explore the procedurally generated world with smooth hills, valleys, trees, and buildings
- Navigate the terrain with realistic physics (can't walk through hills)
- Avoid colliding with trees, buildings, and chests
- Jump to climb steeper terrain
- Find and open chests to collect various items:
  - Food to restore health
  - Better weapons for more damage
  - Treasure items
- Use your sword or bow to fight (enemies will be added in future updates)
- Consume food items to restore health
- Explore buildings with cozy interiors:
  - Click on doors to enter buildings
  - Inside, you'll find a fireplace, desk, bed, and storage chest
  - Go to the door and press 'E' to exit the building

## Technical Details

This game is built using:

- Three.js for 3D rendering
- Vite for development and building
- Pointer Lock API for first-person controls
- Simplex noise for terrain generation with fixed seed for consistency
- Bilinear interpolation for smooth terrain movement
- Raycasting for collision detection
- Custom UI for inventory and chest interactions
- Shader-based sky dome for realistic atmosphere
- Scene management system for switching between exterior and interior environments
- Separate interior maps that load when entering buildings

## Future Enhancements

- Add enemies to fight
- Implement more weapons and items
- Add crafting system
- Improve terrain generation
- Add more biomes
- Implement day/night cycle
- Add sound effects and music
- Add NPCs to populate the world
