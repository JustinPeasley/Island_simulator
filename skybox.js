/**
 * simple skybox creation allows for phong lighting (scaled phong lighting down alot in HTML to prevent blowing out the skybox)
 * @author Justin Peasley
 */
"use strict";

function generateSkybox(size = mapSize - 0.1, shininess = 10) {
    const skyColors = {
        bottom: vec4(0.3, 0.5, 0.7, 1.0),  // medium blue
        top:    vec4(0.5, 0.8, 1.0, 1.0)   // rich light blue
    };

    const vertices = [
        [-1, -1,  1], [1, -1,  1], [1,  1,  1], [-1,  1,  1], // front
        [-1, -1, -1], [-1,  1, -1], [1,  1, -1], [1, -1, -1], // back
        [-1,  1, -1], [-1,  1,  1], [1,  1,  1], [1,  1, -1], // top
        [-1, -1, -1], [1, -1, -1], [1, -1,  1], [-1, -1,  1], // bottom
        [1, -1, -1], [1,  1, -1], [1,  1,  1], [1, -1,  1],   // right
        [-1, -1, -1], [-1, -1,  1], [-1,  1,  1], [-1,  1, -1] // left
    ];

    const faceNormals = [
        [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]
    ];

    const faces = [
        [0, 1, 2, 0, 2, 3],      // front
        [4, 5, 6, 4, 6, 7],      // back
        [8, 9,10, 8,10,11],      // top       
        //[12,13,14,12,14,15],     // bottom //With an automatic camera, this will never been seen and thus can be omitted from the render
        [16,17,18,16,18,19],     // right
        [20,21,22,20,22,23]      // left
    ];

    
    for (let i = 0; i < faces.length; i++) {
        const normal = faceNormals[i];
        const isTop = i === 2;
        const isBottom = i === 3;

        for (let j = 0; j < faces[i].length; j++) {
            const idx = faces[i][j];
            const pos = vertices[idx];

            const x = pos[0] * size;
            const y = pos[1] * size * 2;
            const z = pos[2] * size;

            const vertex = vec3(x, y, z);
            const normalVec = negate(vec3(normal[0], normal[1], normal[2])); // flip inward

            // Interpolate color vertically based on Y
            let t = (y / (size * 2)) + 0.5; // remap Y from [-size, size] to [0,1]
            const r = (1 - t) * skyColors.bottom[0] + t * skyColors.top[0];
            const g = (1 - t) * skyColors.bottom[1] + t * skyColors.top[1];
            const b = (1 - t) * skyColors.bottom[2] + t * skyColors.top[2];
            const color = vec4(r, g, b, 1.0);

            pointsArray.push(vertex);
            normalsArray.push(normalVec);
            colorsArray.push(color);
            shineArray.push(shininess);
        }
    }
}
