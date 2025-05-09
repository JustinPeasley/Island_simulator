Static World Renderer is a procedural 3D terrain simulation written in vanilla JavaScript and WebGL. It generates dynamic landscapes with animated water, elevation-based terrain coloring, and vegetation placement. The environment is rendered with Phong lighting and navigable using keyboard controls.

Features

    Procedural Terrain Generation with realistic elevation curves

    Animated Water Surface using sine waves and bump noise

    Dynamic Vegetation (trees, rocks, grass) placed based on terrain height

    Skybox Environment for immersive scenery

    Phong Lighting Model for realistic shading

    Interactive Camera with WASD-style controls

    Frame-Based Water Animation tied to simulation time

Technology Stack

    WebGL for real-time 3D rendering

    GLSL Shaders for Phong lighting and vertex transformations

    JavaScript as the core logic layer

External Libraries

This project is intentionally lightweight. It uses only a few small helper utilities:

    MV.js – matrix/vector math

    initShaders.js – shader loading abstraction

    webgl-utils.js – WebGL context helpers

These are minimal dependencies and do not rely on full-scale libraries like Three.js. All rendering logic is written directly using the WebGL API.

Controls
  Key	Action
  Arrow Keys	Rotate camera
  Space	Move forward
  Shift	Move backward
  W/S	Raise or lower sea level
