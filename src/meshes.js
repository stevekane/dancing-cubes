var { subtract, cross, normalize } = require("gl-vec3")

module.exports.Triangle = Triangle
module.exports.Plane = Plane

function Triangle(s) {
  this.vertices = [
    [ -s, -s, 0 ],
    [ s, -s, 0 ],
    [ 0, s, 0 ]
  ]
  this.normals = [
    [ 0, 0, 1 ], 
    [ 0, 0, 1 ],
    [ 0, 0, 1 ]
  ]
  this.colors = [
    [ 1, 0, 1, 1 ],
    [ 0, 1, 1, 1 ],
    [ 1, 0, 0, 1 ]
  ]
}

function Plane(s) {
  this.vertices = [
    [ -s, -s, 0 ],      
    [ s, -s, 0 ],      
    [ -s, s, 0 ],      
    [ -s, s, 0 ],      
    [ s, -s, 0 ],      
    [ s, s, 0 ]
  ]
  this.normals = computeNormals(this.vertices)
  this.colors = [
    [ .2, 0, 1, 1 ], 
    [ .2, 0, 1, 1 ], 
    [ .2, 0, 1, 1 ], 
    [ .2, 0, 1, 1 ], 
    [ .2, 0, 1, 1 ], 
    [ .2, 0, 1, 1 ]
  ]
}

var buffer = new Float32Array(9)
var e1 = buffer.subarray(0, 3)
var e2 = buffer.subarray(3, 6)
var normal = buffer.subarray(6, 9)

function computeNormals(vertices) {
  var normals = []

  for (var i = 0; i < vertices.length; i+=3) {
    subtract(e1, vertices[i], vertices[i+1])
    subtract(e2, vertices[i], vertices[i+2])
    cross(normal, e1, e2)
    normalize(normal, normal)
    normals.push([ normal[0], normal[1], normal[2] ])
    normals.push([ normal[0], normal[1], normal[2] ])
    normals.push([ normal[0], normal[1], normal[2] ])
  }
  return normals
}
