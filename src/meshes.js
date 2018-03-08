var { add, subtract, copy, cross, normalize } = require("gl-vec3")

module.exports.Triangle = Triangle
module.exports.Cuboid = Cuboid

function Triangle(s) {
  this.count = 3
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

const fixedColor = c => (_, i, arr) => c

function Cuboid(w, h, d, color) {
  var hw = w / 2
  var hh = h / 2
  var hd = d / 2
  var b0 = [ hw, -hh, hd ]
  var b1 = [ hw, -hh, -hd ]
  var b2 = [ -hw, -hh, -hd ]
  var b3 = [ -hw, -hh, hd ]
  var t0 = [ hw, hh, hd ]
  var t1 = [ hw, hh, -hd ]
  var t2 = [ -hw, hh, -hd ]
  var t3 = [ -hw, hh, hd ]

  this.vertices = [
    // ypos
    t0, t1, t2,
    t2, t3, t0,
    // yneg
    b0, b3, b2,
    b2, b1, b0,
    // xpos
    b0, b1, t1,
    t1, t0, b0,
    // xneg
    b2, b3, t3,
    t3, t2, b2,
    // zpos
    b3, b0, t0,
    t0, t3, b3,
    // zneg
    b1, b2, t2,
    t2, t1, b1
  ]
  this.count = this.vertices.length
  this.normals = computeNormals(this.vertices)
  this.colors = this.vertices.map(fixedColor(color))
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
    cross(normal, e2, e1)
    normalize(normal, normal)
    normals.push([ normal[0], normal[1], normal[2] ])
    normals.push([ normal[0], normal[1], normal[2] ])
    normals.push([ normal[0], normal[1], normal[2] ])
  }
  return normals
}
