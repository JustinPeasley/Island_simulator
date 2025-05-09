/** Script that holds vector math
 * @author Justin Aul
 */

//Calculates vector addition, will do subtraction if negative boolean is true.
function addVectors(vector0, vector1, negative) {
    if(negative) {return vec3(vector0[0] - vector1[0], vector0[1] - vector1[1], vector0[2] - vector1[2]);}
    return vec3(vector0[0] + vector1[0], vector0[1] + vector1[1], vector0[2] + vector1[2]);
}

//Calculate the cross product for 2 vec3s
function crossProduct(vector0, vector1) {
    return vec3(
        vector0[1] * vector1[2] - vector0[2] * vector1[1],
        vector0[2] * vector1[0] - vector0[0] * vector1[2],
        vector0[0] * vector1[1] - vector0[1] * vector1[0]
    );
}

//Calculates magnitude of a vector
function magnitude(vector) {
    let discriminant = 0;
    for(let k = 0; k < vector.length; k++) {
        discriminant += Math.pow(vector[k], 2);
    }
    return Math.sqrt(discriminant);
}

//Calculates dot product for vectors, vectors must be same length
function dotProduct(vector0, vector1) {
    let answer = 0;
    for(let k = 0; k < vector0.length; k++) {
        answer += vector0[k] * vector1[k];
    }
    return answer;
}