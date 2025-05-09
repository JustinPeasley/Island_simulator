"use strict";

var canvas;
var gl;

var pointsArray = [];
var colorsArray = [];
var normalsArray = [];
var shineArray = [];

//used for spliting static and dynamic vertex (Saves recomputing static variables drastically improves performance)
var staticVertexCount; 

//Camera variables
var near = 0.1;
var far = 100.0;  //replace back to 30
var fovy = 90.0;  // Field-of-view in Y direction angle (in degrees)
var aspect;       // Viewport aspect ratio
var mvMatrix, pMatrix;
var modelView, projection;
var eye;

//Animation variables
const frameCount = 20; //60 total frames in the animation, 3 frames per second
const animationInterval = (1000) / frameCount;   //Divide 10 seconds by frame count
var frame = 0;

//Camera
const lightSource = vec3(0, 1.5, 0);
var cameraSpeed = 0.2;
var eye = vec3(4, 3, 4);
var at = vec3(-2, -1, -2);
const up = vec3(0.0, 1.0, 0.0);

//Water variables
//Water moves in direction of X
const waterGridSize = 75;   //How many points will cover one side of the grid. More points = higher definition
var seaLevel = -1.6;       //How low the sea is placed in the box.
var sinCounter = 0;         //This goes up every frame of the animation, resets at 2Pi
const seaVertexCount = Math.pow(waterGridSize - 1, 2) * 6;      //Total vertex count = (grid size)^2 * 6 (points per square)
const seaSize = 4;          //How wide the water is
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
    for (let i = 0; i < waterGridSize; i++) {   //Fill each index of waterMeshX with another array 
        let waterMeshZ = [];
        for (let j = 0; j < waterGridSize; j++) {
            //Calculate each vertex's position, incorporating the sin wave
            let xPos = (2 * seaSize * i / waterGridSize) - seaSize;                //Gives value between (-2 and 2) * size
            let yPos = (Math.sin(i * 5.7 + sinCounter) * waveScale) + seaLevel;     //Gives wavey look centered around the seaLevel
            let zPos = (2 * seaSize * j / waterGridSize) - seaSize;               //Gives value between -(2 and 2) * size

            //Add slight offsets to all positions at an edge
            if ((Math.abs(xPos) != seaSize) && (Math.abs(zPos) != seaSize)) {
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
            
            //traingle 1
            pointsArray.push(tl);                       
            pointsArray.push(bl);                       
            pointsArray.push(br);    

            //traingle 2
            pointsArray.push(tl);         
            pointsArray.push(br);     
            pointsArray.push(tr);

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
const landGridSize = 125;   //How many points will cover one side of the grid. More points = higher definition
const landVertexCount = Math.pow(landGridSize - 1, 2) * 6;      //Total vertex count = (grid size)^2 * 6 (points per square)
const landSize = 4;          //How wide the land is
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
            let xPos = (2 * landSize * i / landGridSize) - landSize;                //Gives value between (-2 and 2) * size
            let zPos = (2 * landSize * j / landGridSize) - landSize;                //Gives value between (-2 and 2) * size
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
    //Set up for triangles, connects 4 points at a time.
    for (let i = 0; i < landMeshX.length - 1; i++) {
        for (let j = 0; j < landMeshX[0].length - 1; j++) {
            let tl = landMeshX[i][j];                  //Top left
            let bl = landMeshX[i+1][j];                //Bottom left
            let br = landMeshX[i+1][j+1];              //Bottom right
            let tr = landMeshX[i][j+1];                //Top right

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
        }
    }
}

//Mesh constants
const baseTreeDensity  = 0.02;
const baseRockDensity  = 0.1;
const baseGrassDensity = 0.5;
var meshArray = [];
/**
 * Function that determines where different ground elements should be placed based on their elevation. Is called within generateLand, 
 * thus landMeshX shouldn't be cleared by this point. This could be done within generateLand, but I want to pull this to a seperate 
 * method just to keep the functionality distinct.
 * @author Justin Aul
 */
function populateMeshes() {
    meshArray = []; //Clear mesh array
    for (let i = 0; i < landMeshX.length - 1; i++) {
        for (let j = 0; j < landMeshX[0].length - 1; j++) {
            let yPosition = landMeshX[i][j][1];
            //Peaks have no trees, but have rocks
            if (yPosition > maxMountainHeight + (0.65 * seaLevel)) {
                if (determineMeshSpawn(baseRockDensity) == true) {
                    meshArray.push(createMeshBase("rock",landMeshX[i][j]));
                }
            }
            //Grass areas have trees and lower rocks.
            else if (yPosition > seaLevel + 0.3) {
                //Tree takes priority in generation
                if (determineMeshSpawn(baseTreeDensity) == true) {
                    meshArray.push(createMeshBase("tree",landMeshX[i][j]));
                }
                //Rocks have 50% the change to spawn in this area
                else if (determineMeshSpawn(baseRockDensity * 0.5) == true) {
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
            else if (yPosition > seaLevel + waveScale + seaBumpOffset) {
                if (determineMeshSpawn(baseTreeDensity * 0.25) == true) {
                    meshArray.push(createMeshBase("tree",landMeshX[i][j]));
                }
            }
        }
    }
    console.log("Mesh count: "+meshArray.length);
    console.log(meshArray[0]);
}

//Simple helper method for populateMeshes.
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
 * clears buffers for new static world generation
 * abstracts static world envoirment calls for simplicity
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
        Keyboard controls for camera movement
        @author Justin Aul
    */
	document.addEventListener('keydown', (event) => {
		switch (event.key) {
			case 'ArrowUp':     //Rotate camera up
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
            case 's':       //Lower sea level
                seaLevel-= 0.05;
                generateStaticWorld();
                break;
            case 'w':       //Raise sea level
                seaLevel+= 0.05;
                generateStaticWorld();
                break;
		}
        if(event.shiftKey){     //Go backwards
            let backwards = addVectors(eye, at, 1); //Invert the forward ray
            let magBackwards = magnitude(backwards);
            backwards = vec3(cameraSpeed * backwards[0] / magBackwards, cameraSpeed * backwards[1] / magBackwards, cameraSpeed * backwards[2] / magBackwards);
            at = addVectors(at, backwards, 0);
            eye = addVectors(eye, backwards, 0);
            render();
        }
    })


    /**
        Timer for sea animation
        @author Justin Aul
    */
    function timer() {
        setTimeout(function () {
            sinCounter = ((Math.PI * 2) / frameCount) * frame;
    
            // Clear all arrays to prevent slow down
            // Preserve static data; clear only the dynamic part (sea + skybox)
            pointsArray.splice(staticVertexCount);
            colorsArray.splice(staticVertexCount);
            normalsArray.splice(staticVertexCount);
            shineArray.splice(staticVertexCount);

            generateSkybox();  // still camera-relative
            generateSea();     // dynamic only

    
            handleRendering();
    
            frame++;
            if (frame >= frameCount) frame = 0;
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

    console.log("Skybox vertex count:", skyboxVertexCount);
    console.log("Total points:", pointsArray.length);
}

var render = function(){
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