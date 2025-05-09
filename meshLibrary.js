/**
 * Constructs a base mesh object that contains the parameters needed
 * to build a 3D object like a tree, rock, or grass patch.
 * 
 * @constructor
 * @param {string} type     - The type of mesh ("tree", "rock", "grass").
 * @param {number} rotation - The rotation angle (in radians) to apply.
 * @param {number} scale    - The scale modifier for the mesh size.
 * @param {vec3} origin     - The origin point (vec3) in world space.
 */
function meshBase(type, rotation, scale, origin) {
    this.type = type;
    this.rotation = rotation;
    this.scale = scale;
    this.origin = origin;
}

/**
 * Creates a new meshBase object with randomized rotation and scale.
 * 
 * @param {string} type - The type of mesh to create ("tree", "rock", "grass").
 * @param {vec3} origin - The origin position of the mesh in world coordinates.
 * @returns {meshBase}    A meshBase object with randomized attributes.
 */
function createMeshBase(type, origin) {
    let rotationAmt = Math.random() * 2 * Math.PI;  //Generates a degree between 0 and 360
    let scaleAmt = Math.random() * 0.2;             //Generates a scale offset between 0 and 0.1
    return new meshBase(type, rotationAmt, scaleAmt, origin)
}

/**
 * Dispatches mesh generation based on mesh type.
 * Calls the appropriate function to generate the actual geometry.
 * 
 * @param {meshBase} mesh - The meshBase object defining the mesh to build.
 */
function buildMesh(mesh) {
    switch (mesh.type) {
        case "tree":
            generateTree(mesh);
            break;
        case "rock":
            generateRock(mesh);
            break;
        case "grass":
            generateGrass(mesh);
            break;
    }
}

/**
 * Generates geometry for a tree based on a predefined contour.
 * 
 * @param {meshBase} _mesh - The meshBase object containing transform data.
 * @author Justin Aul
 */
function generateTree(_mesh) {
    //First define the tree contour.
    const treeMesh = [
        [0, 1, 0],      //Top of tree
        [0.3, 0.25, 0],   //Edge of foliage
        [0.05, 0.25, 0],   //Where the foliage connects to 
        [0.05, 0, 0]     //Base of the trunk
    ]

    const meshSize = 0.4 + _mesh.scale;         //How tall the tree is
    const rotationSegments = 5;                 //How many 'sides' the mesh has
    let rotationOffset = _mesh.rotation;
    const rotationAmt = (2 * Math.PI) / rotationSegments;
    const treeShiny = 100000;

    for (let i = 0; i < rotationSegments; i++) { //Do this for each 'side' of the mesh
        let angle1 = i * rotationAmt;
        let angle2 = (i + 1) * rotationAmt;
        //Precalculate the trig needed for calculations. Add rotationOffset
        let cos1 = Math.cos(angle1 + rotationOffset);
        let sin1 = Math.sin(angle1 + rotationOffset);
        let cos2 = Math.cos(angle2 + rotationOffset);
        let sin2 = Math.sin(angle2 + rotationOffset);

        for (let j = 0; j < treeMesh.length - 1; j++) { //For each point in the contour
            let point1 = treeMesh[j]; let point2 = treeMesh[j + 1]; //Holds 2 points of the contour at a time
            //Generate a square
            //Rotate each point according to the rotationAmt * i. Scale each position by meshSize, then add origin position.
            let tL = add(_mesh.origin, vec3(point1[0] * cos1 * meshSize, point1[1] * meshSize, point1[0] * sin1 * meshSize));
            let bL = add(_mesh.origin, vec3(point2[0] * cos1 * meshSize, point2[1] * meshSize, point2[0] * sin1 * meshSize));
            let tR = add(_mesh.origin, vec3(point1[0] * cos2 * meshSize, point1[1] * meshSize, point1[0] * sin2 * meshSize));
            let bR = add(_mesh.origin, vec3(point2[0] * cos2 * meshSize, point2[1] * meshSize, point2[0] * sin2 * meshSize));
            
            //Push triangle 1
            pointsArray.push(tL, bL, bR);
            let normal1 = negate(computeNormal(tL, bL, bR));
            normalsArray.push(normal1, normal1, normal1, normal1, normal1, normal1);

            //Push triangle 2
            pointsArray.push(tL, tR, bR);

            //Test if this is a side of the trunk or foliage by checking if the second point's contour's y == 0.
            let color = vec4(0.4, 0.6, 0.3, 1);
            if (point2[1] == 0) {
                color = vec4(0.5, 0.4, 0.2, 1);
            }

            //Push colors and shininess to arrays
            for (let k = 0; k < 6; k++) {
                colorsArray.push(color);
                shineArray.push(treeShiny);
            }
        }

    }
}

/**
 * Generates geometry for a rock using a radial extrusion.
 * 
 * @param {meshBase} _mesh - The meshBase object containing transform data.
 * @author Justin Peasley
 */
function generateRock(_mesh) {
    // Define the contour for a generic rock (chunky and uneven)
    const rockMesh = [
        [0.0, 0.3, 0.0],    // Top-ish
        [0.15, 0.2, 0.0],   // Mid-upper slope
        [0.3, 0.1, 0.0],    // Mid-lower slope
        [0.15, 0.0, 0.0]    // Bottom
    ];

    const meshSize = 0.3 + _mesh.scale;       // Make the rock shorter and bulkier
    const rotationSegments = 6;               // More sides for a rounder appearance
    let rotationOffset = _mesh.rotation;
    const rotationAmt = (2 * Math.PI) / rotationSegments;
    const rockShiny = 10;                     // Very low shininess

    for (let i = 0; i < rotationSegments; i++) {
        let angle1 = i * rotationAmt;
        let angle2 = (i + 1) * rotationAmt;

        let cos1 = Math.cos(angle1 + rotationOffset);
        let sin1 = Math.sin(angle1 + rotationOffset);
        let cos2 = Math.cos(angle2 + rotationOffset);
        let sin2 = Math.sin(angle2 + rotationOffset);

        for (let j = 0; j < rockMesh.length - 1; j++) {
            let point1 = rockMesh[j];
            let point2 = rockMesh[j + 1];

            let tL = add(_mesh.origin, vec3(point1[0] * cos1 * meshSize, point1[1] * meshSize, point1[0] * sin1 * meshSize));
            let bL = add(_mesh.origin, vec3(point2[0] * cos1 * meshSize, point2[1] * meshSize, point2[0] * sin1 * meshSize));
            let tR = add(_mesh.origin, vec3(point1[0] * cos2 * meshSize, point1[1] * meshSize, point1[0] * sin2 * meshSize));
            let bR = add(_mesh.origin, vec3(point2[0] * cos2 * meshSize, point2[1] * meshSize, point2[0] * sin2 * meshSize));

            // Push triangle 1
            pointsArray.push(tL, bL, bR);
            let normal1 = negate(computeNormal(tL, bL, bR));
            normalsArray.push(normal1, normal1, normal1, normal1, normal1, normal1);

            // Push triangle 2
            pointsArray.push(tL, tR, bR);

            // Rock color (gray)
            let color = vec4(0.5 + Math.random() * 0.1, 0.5 + Math.random() * 0.1, 0.5 + Math.random() * 0.1, 1);

            for (let k = 0; k < 6; k++) {
                colorsArray.push(color);
                shineArray.push(rockShiny);
            }
        }
    }
}

/**
 * Generates simple grass geometry using two quads that cross each other.
 * Grass has no lighting contribution (alpha = 0).
 * 
 * @param {meshBase} _mesh - The meshBase object containing transform data.
 * @author Justin Peasley
 */
function generateGrass(_mesh) {
    const height = 0.05 + _mesh.scale * 0.001;
    const width = 0.01;

    const grassShiny = 0;
    const color = vec4(0.3 + Math.random() * 0.1, 0.6 + Math.random() * 0.2, 0.3 + Math.random() * 0.1, 0.0); // alpha 0 = skip lighting

    // Two quads: XZ and rotated ~45 degrees
    const angles = [0, Math.PI / 4];

    for (let a = 0; a < angles.length; a++) {
        const angle = angles[a];
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Four corners of the vertical quad
        const bottomLeft  = add(_mesh.origin, vec3(-width * cosA, 0.0, -width * sinA));
        const bottomRight = add(_mesh.origin, vec3( width * cosA, 0.0,  width * sinA));
        const topLeft     = add(_mesh.origin, vec3(-width * cosA, height, -width * sinA));
        const topRight    = add(_mesh.origin, vec3( width * cosA, height,  width * sinA));

        // Triangle 1
        pointsArray.push(topLeft, bottomLeft, bottomRight);
        // Triangle 2
        pointsArray.push(topLeft, bottomRight, topRight);

        // Push flat normals (pointing up)
        for (let i = 0; i < 6; i++) {
            normalsArray.push(vec3(0, 1, 0));
            colorsArray.push(color);
            shineArray.push(grassShiny);
        }
    }
}

