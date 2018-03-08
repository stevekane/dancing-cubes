var V3 = require("gl-vec3")
var M4 = require("gl-mat4")
var Quat = require("gl-quat")
var regl = require("regl")()
var { Triangle, Cuboid } = require("./meshes")
var { sin, cos, abs, sqrt, PI, floor, random } = Math

var render = regl({
  vert: `
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec4 color;

    uniform mat4 model;
    uniform mat4 mvp;

    varying vec3 v_position;
    varying vec3 v_normal;
    varying vec4 v_color;

    void main () {
      v_color = color;
      v_position = (model * vec4(position, 1)).xyz;
      v_normal = normalize((model * vec4(normal, 1)).xyz);
      gl_Position = mvp * vec4(position, 1);
    }
  `,
  frag: `
    precision highp float;

    uniform vec3 cameraPosition;
    uniform vec3 lightPosition;
    uniform float lightRadius;
    uniform vec3 ambient;

    varying vec3 v_position;
    varying vec3 v_normal;
    varying vec4 v_color;

    float squareDistance(in vec3 a, in vec3 b) {
      float dx = a.x - b.x;
      float dy = a.y - b.y;
      float dz = a.z - b.z;

      return dx * dx + dy * dy + dz * dz;
    }

    void main () {
      vec3 L = normalize(lightPosition - v_position);
      vec3 V = normalize(cameraPosition - v_position);
      float illumination = max(0., -dot(v_normal, L));
      // float visible = max(0., dot(v_normal, V));
      float visible = 1.;
      float sqrDistTolight = squareDistance(v_position, lightPosition);
      float sqrLightRadius = lightRadius * lightRadius; // TODO: do on CPU
      float falloff = clamp(sqrLightRadius / sqrDistTolight, 0., 1.);
      vec3 color = v_color.rgb * illumination * visible * falloff + ambient;

      gl_FragColor.rgb = clamp(color, 0., 1.); 
      gl_FragColor.a = v_color.a;
    }
  `,
  cull: {
    enable: true 
  },
  uniforms: {
    cameraPosition: regl.prop("camera.position"),
    lightPosition: regl.prop("light.position"),
    lightRadius: regl.prop("light.radius"),
    ambient: regl.prop("ambient"),
    model: regl.prop("model"),
    mvp: regl.prop("mvp")
  },
  attributes: {
    position: regl.prop("positions"),
    normal: regl.prop("normals"),
    color: regl.prop("colors")
  },
  count: regl.prop("count"),
  primitive: regl.prop("primitive")
}) 

function Transform() {
  this.position = V3.create()
  this.rotation = Quat.create()
  this.matrix = M4.create()
}

function Model(mesh, transform) {
  this.mesh = mesh
  this.transform = transform
}

const COLOR_1 = [ .1, .24, .76, 1 ]
const RAND_COLOR = [ random(), random(), random(), 1 ]
const triangleMesh = new Triangle(1)
const cuboidMesh = new Cuboid(.5, 2, .5, RAND_COLOR)
const cuboidPositionBuffer = regl.buffer(cuboidMesh.vertices)
const cuboidNormalBuffer = regl.buffer(cuboidMesh.normals)
const cuboidColorBuffer = regl.buffer(cuboidMesh.colors)
const loadedCuboidMesh = {
  count: cuboidMesh.vertices.length,
  vertices: regl.buffer(cuboidMesh.vertices),
  normals: regl.buffer(cuboidMesh.normals),
  colors: regl.buffer(cuboidMesh.colors)
}
const gridScene = {
  models: [],
  ambient: [ .3, .3, .3 ],
  light: {
    position: [ 0, 1, 2 ],
    radius: 4
  }
}
const width = 16
const height = 16

for (let i = 0; i < width; i++) {
  for (let j = 0; j < height; j++) {
    let m = new Model(loadedCuboidMesh, new Transform)

    gridScene.models.push(m)
  }
}

const app = {
  scene: gridScene 
}
const renderProps = {
  primitive: "triangles",
  light: null,
  ambient: null,
  mvp: M4.create(),
  model: null,
  positions: null,
  normals: null,
  colors: null,
  count: 0
}
const camera = {
  top: 30,
  right: width,
  bottom: -30,
  left: -width,
  near: .001,
  far: 10000,
  position: V3.create(),
  rotation: Quat.create(),
  rotationAxis: V3.fromValues(1, 0, 0),
  rotationAngle: 0,
  up: V3.fromValues(0, 1, 0),
  focus: V3.fromValues(0, 0, 0),
  fovy: PI / 2,
  aspectRatio: 16 / 9,
  view: M4.create(),
  projection: M4.create(),
  vp: M4.create()
}

window.distance = 16
window.perspective = false
window.fixedWidth = width * sqrt(2)

function update(context) {
  const { tick, viewportWidth, viewportHeight } = context
  const { models, light, ambient } = app.scene
  const modelCount = models.length
  const aspectRatio = viewportWidth / viewportHeight

  for (let i = 0; i < modelCount; i++) {
    let { position } = models[i].transform
    let offset = position[0] * position[0] + position[2] * position[2]
    let x = (i % width) - (width / 2)
    let y = sin((tick + offset) / 8) * .2
    let z = floor(i / width) - (height / 2)

    position[0] = x
    position[1] = y
    position[2] = z
  }

  for (let i = 0; i < modelCount; i++) {
    let { position, rotation, matrix } = models[i].transform

    M4.fromRotationTranslation(
      matrix, 
      rotation, 
      position)
  }

  light.position[2] = sin(tick / 20) * 4
  light.position[0] = cos(tick / 20) * 4
  
  camera.position[0] = window.distance
  camera.position[1] = window.distance
  camera.position[2] = window.distance

  M4.lookAt(camera.view, camera.position, camera.focus, camera.up)

  if (perspective) {
    M4.perspective(
      camera.projection,
      camera.fovy,
      camera.aspectRatio,
      camera.near,
      camera.far)
  } else {
    camera.left = -fixedWidth / 2
    camera.right = fixedWidth / 2
    camera.top = (fixedWidth / aspectRatio) / 2
    camera.bottom = -(fixedWidth / aspectRatio) / 2
    M4.ortho(
      camera.projection, 
      camera.left, 
      camera.right, 
      camera.bottom, 
      camera.top, 
      camera.near, 
      camera.far)
  }

  M4.multiply(
    camera.vp, 
    camera.projection, 
    camera.view) 

  renderProps.ambient = ambient
  renderProps.light = light
  renderProps.camera = camera
  for (let i = 0; i < modelCount; i++) {
    let { vertices, normals, colors, count } = models[i].mesh
    let { matrix } = models[i].transform

    M4.multiply(renderProps.mvp, camera.vp, matrix)
    renderProps.model = matrix
    renderProps.positions = vertices
    renderProps.normals = normals
    renderProps.colors = colors
    renderProps.count = count
    render(renderProps)
  }
}

regl.frame(update)
