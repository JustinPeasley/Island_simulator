"use strict";

var canvas;
var gl;

var pointsArray = [];
var colorsArray = [];
var normalsArray = [];
var shineArray = [];

//Used for spliting static and dynamic vertex (Saves recomputing static variables drastically improves performance)
var staticVertexCount; 

//Animation variables
const frameCount = 20; //60 total frames in the animation, 3 frames per second
const animationInterval = (1000) / frameCount;   //Divide 10 seconds by frame count
var frame = 0;

//Camera variables
var near = 0.1;
var far = 100.0;  //replace back to 30
var fovy = 70.0;  // Field-of-view in Y direction angle (in degrees)
var aspect;       // Viewport aspect ratio
var mvMatrix, pMatrix;
var modelView, projection;
var eye;
const lightSource = vec3(0, 1.5, 0);
var eye = vec3(1, 0, 1);
var at = vec3(0, 1, 0);
const up = vec3(0.0, 1.0, 0.0);
var cameraCounter = 0;
const cameraSpeed = 10;      //Higher = slower rotation

//Global generation variables
var mapSize = 4;  //How large the map is on x-y scale

//Water variables
//Water moves in direction of X
const waterGridSize = 11 * mapSize;   //How many points will cover one side of the grid. More points = higher definition
var seaLevel = -1.6;       //How low the sea is placed in the box.
var sinCounter = 0;         //This goes up every frame of the animation, resets at 2Pi
var seaVertexCount = 0;   //This is calculated within generateSea
const seaBumpOffset = 0.005; //How much the points vary with noise
const waveScale = 0.02;     //How high the waves go
const waterShiny = 90;

//Skybox Variable
const skyboxVertexCount = 36; // 6 faces * 2 triangles * 3 vertices

/**
 * Function that calculates a mesh for the sea and displays it. Uses the sinCounter variable to create movement.
 * @author Justin Aul - Mesh generation, color attribution
 * @author Justin Peasley - Normal map calculation
 */
function generateSea() {
    var waterMeshX = [];
    seaVertexCount = 0;
    for (let i = 0; i < waterGridSize; i++) {   //Fill each index of waterMeshX with another array 
        let waterMeshZ = [];
        for (let j = 0; j < waterGridSize; j++) {
            //Calculate each vertex's position, incorporating the sin wave
            let xPos = (2 * mapSize * i / waterGridSize) - mapSize;                //Gives value between (-2 and 2) * size
            let yPos = (Math.sin(i * 5.7 + sinCounter) * waveScale) + seaLevel;     //Gives wavey look centered around the seaLevel
            let zPos = (2 * mapSize * j / waterGridSize) - mapSize;               //Gives value between -(2 and 2) * size

            //Add slight offsets to all positions at an edge
            if ((Math.abs(xPos) != mapSize) && (Math.abs(zPos) != mapSize)) {
                let minOffset = -seaBumpOffset;
                yPos += Math.random() * (seaBumpOffset - minOffset) + minOffset;
                xPos += Math.random() * (seaBumpOffset - minOffset) + minOffset;
                zPos += Math.random() * (seaBumpOffset - minOffset) + minOffset;
            }
            waterMeshZ.push(vec3(xPos, yPos, zPos));
        }
        waterMeshX.push(waterMeshZ);
    }

    //Set up for triangles, connects 4 points at a time.
    for (let i = 0; i < waterMeshX.length - 1; i++) {
        for (let j = 0; j < waterMeshX[0].length - 1; j++) {
            let tl = waterMeshX[i][j];                  //Top left
            let bl = waterMeshX[i+1][j];                //Bottom left
            let br = waterMeshX[i+1][j+1];              //Bottom right
            let tr = waterMeshX[i][j+1];                //Top right
            
            //If a quad is hidden by land, don't push anything, continue the loop.
            //Land uses a different grid than water, but we can do a rough estimate to get the index for landgrid.
            let landIndexX = Math.floor((landGridSize / waterGridSize) * i);
            let landIndexZ = Math.floor((landGridSize / waterGridSize) * j);
            if (tl[1] < landMeshX[landIndexX][landIndexZ][1] - waveScale - 0.1) {continue;}

            //traingle 1
            pointsArray.push(tl);                       
            pointsArray.push(bl);                       
            pointsArray.push(br);    

            //traingle 2
            pointsArray.push(tl);         
            pointsArray.push(br);     
            pointsArray.push(tr);

            seaVertexCount += 6;    //6 points are added per tile

            //calculate the normals of traingles
            let normal1 = negate(computeNormal(tl, bl, br));
            normalsArray.push(normal1, normal1, normal1);

            let normal2 = negate(computeNormal(tl, br, tr));
            normalsArray.push(normal2, normal2, normal2);

            //Calculate the color of each point
            //Higher parts are highlighted
            let colorBlue = 0.5;
            const maxWhite = 0.1;                      //How close to white the color can get
            let maxInput = seaLevel + waveScale;      //Highest point = seaLevel + waveScale
            let minInput = seaLevel - waveScale;      //Lowest point = seaLevel - waveScale
            let testedValue = (waterMeshX[i+1][j+1][1] + waterMeshX[i][j][1] + 
                waterMeshX[i+1][j][1] + waterMeshX[i][j+1][1]) / 4; //Average y value
            
            let whiteValue = ((testedValue - minInput) / (maxInput - minInput)) * (maxWhite);
            let color = vec4(whiteValue, whiteValue, colorBlue,1);
           
            //Push colors and shine
            for (let k = 0; k < 6; k++) {
                colorsArray.push(color);
                shineArray.push(waterShiny);
            }

        }
    }
}

//Land variables
const landGridSize = 17 * mapSize;   //How many points will cover one side of the grid. More points = higher definition
var landVertexCount = 0;    //Calculated inside displayLand()
const maxMountainHeight = 0.5;  //How high the peaks can go
const maxPeakSpacing = 0.5;
const landBumpOffset = 0.003;
var landMeshX = [];
var landMeshZ = [];
var landShiney= 1000000000000000; //Arbitary large number

/**
 * Function that calculates a mesh for the land. Calls populateMeshes to add ground elements.
 * @author Justin Aul
 */
function generateLand() {
    //Randomness variable
    let mountainScaleA = Math.random() * maxMountainHeight + 0.2;
    let mountainScaleB = Math.random() * maxMountainHeight + 0.2;
    let mountainSpacingA = Math.random() * maxPeakSpacing + 0.4;
    let mountainSpacingB = Math.random() * maxPeakSpacing + 0.2;
    let phaseShiftA = Math.random() * 10;
    let phaseShiftB = Math.random() * 10;

    //Generate every point of the grid
    landMeshX = [];
    for (let i = 0; i < landGridSize; i++) {   //Fill each index of waterMeshX with another array 
        let landMeshZ = [];
        for (let j = 0; j < landGridSize; j++) {
            //Calculate each vertex's position
            let xPos = (2 * mapSize * i / landGridSize) - mapSize;                //Gives value between (-1 and 1) * size
            let zPos = (2 * mapSize * j / landGridSize) - mapSize;                //Gives value between (-1 and 1) * size
            //Calculate y
            let yPos = (mountainScaleA * Math.sin(mountainSpacingA * xPos + phaseShiftA)) + (mountainScaleB * Math.cos(mountainSpacingB * zPos + phaseShiftB))
                + (0.4 * Math.sin(xPos * 0.15 + zPos * 0.3)) - 1.5;

            //Add slight offset to y positions to give rougher look
            let minOffset = -landBumpOffset;
            yPos += Math.random() * (landBumpOffset - minOffset) + minOffset;

            //Push the vertex
            landMeshZ.push(vec3(xPos, yPos, zPos));

        }
        landMeshX.push(landMeshZ);
    }
    populateMeshes();
}

/**
 * Function that displays mesh for the land and attributes land color
 * @author Justin Aul - Color attribution
 * @author Justin Peasley - Normal map calculation
 */
function displayLand() {
    landVertexCount = 0;
    let triangleSaved = 0;
    //Set up for triangles, connects 4 points at a time.
    for (let i = 0; i < landMeshX.length - 1; i++) {
        for (let j = 0; j < landMeshX[0].length - 1; j++) {
            let tl = landMeshX[i][j];                  //Top left
            let bl = landMeshX[i+1][j];                //Bottom left
            let br = landMeshX[i+1][j+1];              //Bottom right
            let tr = landMeshX[i][j+1];                //Top right

            //Check if the tile is underwater, if so, cull it by continuing past the array pushing.
            if (tl[1] < seaLevel - waveScale - 0.1) {
                triangleSaved += 2;
                continue;
            }

            //Traingle 1
            pointsArray.push(tl);                       
            pointsArray.push(bl);                       
            pointsArray.push(br);    

            //Traingle 2
            pointsArray.push(tl);         
            pointsArray.push(br);     
            pointsArray.push(tr);

            //calculate the normals of traingles
            let normal1 = negate(computeNormal(tl, bl, br));
            normalsArray.push(normal1, normal1, normal1);

            let normal2 = negate(computeNormal(tl, br, tr));
            normalsArray.push(normal2, normal2, normal2);

            //Calculate the color of each point
            let color = vec4(0.6, 0.7, 0.55,1);
            //If the square isn't on a peak, make grass
            if (tl[1] < maxMountainHeight + (0.65 * seaLevel)) {color = vec4(0.3, 0.6, 0.3,1);}
            //If the square is near the water, make a beach.
            if (tl[1] < seaLevel + 0.16) {color = vec4(0.7, 0.5, 0.4);}
            //If the square is touching water, make mud
            if (tl[1] < seaLevel + waveScale + 0.03) {color = vec4(0.5, 0.4, 0.2);}

            //Push colors and shine
            for (let k = 0; k < 6; k++) {
                colorsArray.push(color);
                shineArray.push(landShiney);
            }
            landVertexCount += 6;
        }
    }
}

//Mesh variables, density refers to the chance that this element generates on any given tile.
const baseTreeDensity  = 0.03; 
const baseRockDensity  = 0.07;
const baseGrassDensity = 0.6;
const baseHouseDensity = 0.0005;
const distBetweenHouses = 0.2;  //Distance between houses spawned versus other meshes
var meshArray = [];
var houseArray = [];
/**
 * Function that determines where different ground elements should be placed based on their elevation. Is called within generateLand, 
 * thus landMeshX shouldn't be cleared by this point. This could be done within generateLand, but I want to pull this to a seperate 
 * method just to keep the functionality distinct.
 * @author Justin Aul Created the framework and weighted values
 * @author Justin Peasley Modified the system to include grass spawn
 */
function populateMeshes() {
    meshArray = []; //Clear mesh array
    houseArray = [];    //Used for testing position, wont spawn meshes in an area taken by a house.
    for (let i = 0; i < landMeshX.length - 1; i++) {
        for (let j = 0; j < landMeshX[0].length - 1; j++) {
            //Test if this index is within range of a house
            //Note: Generation prior to houses being spawned won't be stopped. To offset this, houses are placed slightly forward from landMeshX[i][j]
            let posTaken = false;
            for (let k = 0; k < houseArray.length; k++) {
                let xTaken = landMeshX[i][j][0] - houseArray[k][0];
                let zTaken = landMeshX[i][j][2] - houseArray[k][2];

                //Check circular exlusion zone
                let distSq = (xTaken * xTaken) + (zTaken * zTaken);
                if (distSq < distBetweenHouses * distBetweenHouses) {
                    posTaken = true;
                    break;
                }
            }

            //If this position is taken, continue to next iteration in loop
            if (posTaken) {continue;}

            //Begin generation
            let yPosition = landMeshX[i][j][1];

            //Start with houses, they can be spawned anywhere above seaLevel.
            if (yPosition > seaLevel + waveScale + 0.05) {
                if (determineMeshSpawn(baseHouseDensity) == true) {
                    meshArray.push(createMeshBase("house",add(vec3(0.1, 0, 0.1),landMeshX[i][j])));   //Houses are placed slightly forward
                    houseArray.push(add(vec3(0.1, 0, 0.1),landMeshX[i][j]));
                    continue;   //If house is created, skip to next iteration
                }
            }

            //Peaks have no trees, but have rocks
            if (yPosition > maxMountainHeight + (0.65 * seaLevel)) {
                if (determineMeshSpawn(baseRockDensity) == true) {
                    meshArray.push(createMeshBase("rock",landMeshX[i][j]));
                }
            }
            //Grass areas have trees and lower rocks.
            else if (yPosition > seaLevel + 0.16) {
                //Tree takes priority in generation
                if (determineMeshSpawn(baseTreeDensity) == true) {
                    meshArray.push(createMeshBase("tree",landMeshX[i][j]));
                }
                //Rocks have 25% the change to spawn in this area
                else if (determineMeshSpawn(baseRockDensity * 0.25) == true) {
                    meshArray.push(createMeshBase("rock",landMeshX[i][j]));
                }
                else if (determineMeshSpawn(baseGrassDensity) == true) {
                    // Spawn a small clump of grass blades (e.g., 3–5 per patch)
                    let clumpSize = 10 + Math.floor(Math.random() * 3); // 3 to 5 blades
                    for (let g = 0; g < clumpSize; g++) {
                        const jitterX = (Math.random() - 0.5) * 0.15;
                        const jitterZ = (Math.random() - 0.5) * 0.15;
                        const pos = add(landMeshX[i][j], vec3(jitterX, 0, jitterZ));
                        meshArray.push(createMeshBase("grass", pos));
                    }
                }
                
            }
            //Beaches have 25% trees and no rocks
            else if (yPosition > seaLevel + waveScale) {
                if (determineMeshSpawn(baseTreeDensity * 0.25) == true) {
                    meshArray.push(createMeshBase("tree",landMeshX[i][j]));
                }
            }
        }
    }
}

/**
 * Simple helper mether for populateMeshes that determines if mesh will spawn
 * @param {float} chance the probability to return true
 * @returns 
 */
function determineMeshSpawn(chance) {
    if (Math.random() < chance) {
        return true;
    }
    return false;
}

/**
 * Iterates over all generated meshes and builds their geometry by calling buildMesh().
 */
function displayMeshes() {
    for (let i = 0; i < meshArray.length; i++) {
        buildMesh(meshArray[i]);
    }
}

/**
 * Clears buffers for new static world generation
 * Abstracts static world envoirment calls for simplicity
 */
function generateStaticWorld() {
    pointsArray = [];
    colorsArray = [];
    normalsArray = [];
    shineArray = [];

    displayLand();        // Triangulates and colors the land
    populateMeshes();
    displayMeshes();      // Builds all tree, rock, and grass geometry

    staticVertexCount = pointsArray.length
}

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    aspect =  canvas.width/canvas.height;
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    
    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    /**
        Keyboard controls for camera movement and sea level control. Depreciated, but may create a "mode" function later.
        @author Justin Aul
    */
	document.addEventListener('keydown', (event) => {
		switch (event.key) {
			/*case 'ArrowUp':     //Rotate camera up
                at = addVectors(at, vec3(0,cameraSpeed,0), 0);
                render();
				break;
			case 'ArrowDown':   //Rotate down
                at = addVectors(at, vec3(0,cameraSpeed,0), 1);
                render();
			    break;
            case 'ArrowLeft':   //Rotate camera left
                let lookLeft = addVectors(at, eye, 1);  //Gives the direction from eye to at
                let left = crossProduct(up, lookLeft); //Gives the left direction
                let magLeft = magnitude(left);     //Normalize the left direction
                left = vec3(cameraSpeed * left[0] / magLeft, cameraSpeed * left[1] / magLeft, cameraSpeed * left[2] / magLeft); //Normalize the vector and multiply by camera speed
                at = addVectors(at, left, 0);
                render();
			    break;
            case 'ArrowRight':  //Rotate camera right
                let look = addVectors(at, eye, 1);  //Gives the direction from eye to at
                let right = crossProduct(look, up); //Gives the right direction
                let mag = magnitude(right);     //Normalize the right direction
                right = vec3(cameraSpeed * right[0] / mag, cameraSpeed * right[1] / mag, cameraSpeed * right[2] / mag); //Normalize the vector and multiply by camera speed
                at = addVectors(at, right, 0);
                render();
			    break;
            case ' ':       //Go forward
                let forward = addVectors(at, eye, 1);   //Get the direction of eye to at
                let magForward = magnitude(forward);
                forward = vec3(cameraSpeed * forward[0] / magForward, cameraSpeed * forward[1] / magForward, cameraSpeed * forward[2] / magForward);
                at = addVectors(at, forward, 0);
                eye = addVectors(eye, forward, 0);
                render();
                break;
            case 'q':
                mapSize += 1;
                generateLand();
                generateStaticWorld();
                break;
            case 'a':
                mapSize += -1;
                generateLand();
                generateStaticWorld();
                break;*/
            case 's':       //Lower sea level
                seaLevel-= 0.05;
                generateStaticWorld();
                break;
            case 'w':       //Raise sea level
                seaLevel+= 0.05;
                generateStaticWorld();
                break;
		}
        /*if(event.shiftKey){     //Go backwards
            let backwards = addVectors(eye, at, 1); //Invert the forward ray
            let magBackwards = magnitude(backwards);
            backwards = vec3(cameraSpeed * backwards[0] / magBackwards, cameraSpeed * backwards[1] / magBackwards, cameraSpeed * backwards[2] / magBackwards);
            at = addVectors(at, backwards, 0);
            eye = addVectors(eye, backwards, 0);
            render();
        }*/
    })

    /**
        Timer for sea animation and automated camera movements
        @author Justin Aul
    */
    function timer() {
        setTimeout(function () {
            //Manage incremental variables
            sinCounter = ((Math.PI * 2) / frameCount) * frame;  //For wave animation
            var cameraAngle = ((Math.PI * 2) / (cameraSpeed * frameCount)) * cameraCounter;
            
            //Manage camera, flies around the map in a circle
            const cameraRadius = mapSize - 0.1;   //How far the camera is from the center
            let cameraX = cameraRadius * Math.sin(cameraAngle);
            let cameraZ = cameraRadius * Math.cos(cameraAngle);

            //Check the position of the ground, and set the cameraY a set distance from it.
            //The range of cameraX = cameraRadius * Math.sin(cameraAngle) is -cameraRadius to cameraRadius.
            //Convert the position from this range to the range of 0 to gridSize
            //4 is the map size
            let gridIndexX = Math.floor(((cameraX + mapSize) / (mapSize * 2)) * landGridSize);
            let gridIndexZ = Math.floor(((cameraZ + mapSize) / (mapSize * 2)) * landGridSize);
            let groundY = landMeshX[gridIndexX][gridIndexZ][1]
            var cameraY = Math.max(groundY,seaLevel) + 0.7;

            eye = vec3(cameraX, cameraY, cameraZ);
            at = vec3(0, seaLevel + 1, 0);

            // Clear all arrays to prevent slow down
            // Preserve static data; clear only the dynamic part (sea + skybox)
            pointsArray.splice(staticVertexCount);
            colorsArray.splice(staticVertexCount);
            normalsArray.splice(staticVertexCount);
            shineArray.splice(staticVertexCount);


            generateSkybox();  // still camera-relative
            generateSea();     // dynamic only

            handleRendering();
    
            cameraCounter++;
            frame++;
            if (frame >= frameCount) {frame = 0;}
            //Once the camera has rotated twice, regenerage the map
            if (cameraCounter >= 2 * cameraSpeed * frameCount) {
                generateLand();
                generateStaticWorld();
                cameraCounter = 0;
            }
            timer();
        }, animationInterval);
    }

    /** Function that handles the consolidation of phong model variables
     * @author Justin Peasley
     */
    function handleRendering() {
        //color buffer
        var cBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );
        
        var vColor = gl.getAttribLocation( program, "vColor" );
        gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vColor);

        
        var vBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

        var vPosition = gl.getAttribLocation( program, "vPosition" );
        gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vPosition );

        //Shineness buffer
        var sBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(shineArray), gl.STATIC_DRAW);

        var vShininess = gl.getAttribLocation(program, "vShininess");
        gl.vertexAttribPointer(vShininess, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vShininess);

        // Normal buffer
        var nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
        var vNormal = gl.getAttribLocation(program, "vNormal");
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        mvMatrix = lookAt(eye, at, up);
        let lightEye = mult(mvMatrix, vec4(lightSource, 1.0));

        // Lighting uniforms
        gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(vec4(0.8, 0.8, 0.8, 1.0)));
        gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(vec4(1.5, 1.5, 1.5, 1.0)));
        gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(vec4(.7, .7, .7, 1.0)));
        gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightEye));
        gl.uniform3fv(gl.getUniformLocation(program, "eyePosition"), flatten(vec3(0, 0, 0))); // origin in eye space
        modelView = gl.getUniformLocation( program, "modelView" );
        projection = gl.getUniformLocation( program, "projection" );
        render();
    }
    pointsArray = [];
    colorsArray = [];
    normalsArray = [];
    shineArray = [];

    //Initial cycle start-up
    generateSkybox();
    generateLand();       // Creates the heightmap + stores landMeshX
    generateStaticWorld();

    staticVertexCount = pointsArray.length;  // Save static geometry size

    generateSea();

    handleRendering();
    timer();
}

var render = function() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mvMatrix = lookAt(eye, at, up);
    pMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projection, false, flatten(pMatrix));

    // Skybox first (no depth writes)
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLES, 0, skyboxVertexCount);
    gl.depthMask(true);

    // Sea
    gl.drawArrays(gl.TRIANGLES, skyboxVertexCount, seaVertexCount);

    // Land
    gl.drawArrays(gl.TRIANGLES, skyboxVertexCount + seaVertexCount, landVertexCount);

    //Meshes, done last so we can directly use the vertex count
    let verteciesUsed = skyboxVertexCount + seaVertexCount + landVertexCount;
    gl.drawArrays(gl.TRIANGLES, verteciesUsed, pointsArray.length - verteciesUsed);
}