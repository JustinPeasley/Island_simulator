/**
 * Phong Lighting Utilty File
 * @author Justin Peasley
 */

//computes cross product of 3d vectors
function crossProd(u, v) {
    return vec3(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
    );
}

//vector subtraction
function subtract(a, b) {
    return vec3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// normalizes 3d vector 
function normalize(v) {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return len > 0.00001 ? vec3(v[0] / len, v[1] / len, v[2] / len) : vec3(0, 0, 0);
}

//computes the surface vector
function computeNormal(a, b, c) {
    const u = subtract(b, a);
    const v = subtract(c, a);
    return normalize(crossProd(u, v));
}

//add a traingle and its nomral vector then push it to the buffer
function pushTriangle(pointsArray, normalsArray, a, b, c) {
    pointsArray.push(a, b, c);
    const normal = computeNormal(a, b, c);
    normalsArray.push(normal, normal, normal);
}
