var V3 = require("gl-vec3")
var M4 = require("gl-mat4")
var Quat = require("gl-quat")
var regl = require("regl")()
var { Triangle, Plane } = require("./meshes")
var { sin, cos, abs, PI, floor } = Math

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
      float illumination = max(0., dot(v_normal, lightPosition));
      float sqrDistTolight = squareDistance(v_position, lightPosition);
      float falloff = clamp(lightRadius / sqrDistTolight, 0., 1.);
      vec3 color = v_color.rgb * illumination * falloff + ambient;

      gl_FragColor.rgb = clamp(color, 0., 1.);
      gl_FragColor.a = v_color.a;
    }
  `,
  cull: {
    enable: true 
  },
  uniforms: {
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

const triangleMesh = new Triangle(1)
const planeMesh = new Plane(1)
const gridScene = {
  models: [],
  ambient: [ .2, .2, .2 ],
  light: {
    position: [ 0, 4, 0 ],
    radius: 8
  }
}
const width = 32
const height = 32

for (let i = 0; i < width; i++) {
  for (let j = 0; j < height; j++) {
    let m = new Model(planeMesh, new Transform)

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
  right: 30,
  bottom: -30,
  left: -30,
  near: .001,
  far: 10000,
  position: V3.create(),
  rotation: Quat.create(),
  rotationAxis: V3.fromValues(1, 0, 0),
  rotationAngle: 0,
  fovy: PI / 2,
  aspectRatio: 16 / 9,
  view: M4.create(),
  projection: M4.create(),
  vp: M4.create()
}

window.perspective = true

Quat.rotateX(
  camera.rotation, 
  camera.rotation, 
  -PI / 4)

camera.position[2] = 20
camera.position[1] = 20

function update({ tick }) {
  const { models, light, ambient } = app.scene
  const modelCount = models.length

  for (let i = 0; i < modelCount; i++) {
    let { position } = models[i].transform
    let offset = position[0] * position[0] + position[2] * position[2]
    let x = (i % width) - (width / 2)
    let y = sin((tick + offset) / 8)
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
  
  app.scene.light.position[1] = abs(sin(tick / 42)) * 20
  app.scene.light.position[0] = cos(tick / 10) * 4
  app.scene.light.position[2] = sin(tick / 10) * 4

  M4.fromRotationTranslation(
    camera.view, 
    camera.rotation, 
    camera.position)
  M4.invert(
    camera.view, 
    camera.view)

  if (perspective) {
    M4.perspective(
      camera.projection,
      camera.fovy,
      camera.aspectRatio,
      camera.near,
      camera.far)
  } else {
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
  for (let i = 0; i < modelCount; i++) {
    let { vertices, normals, colors } = models[i].mesh
    let { matrix } = models[i].transform

    M4.multiply(renderProps.mvp, camera.vp, matrix)
    renderProps.model = matrix
    renderProps.positions = vertices
    renderProps.normals = normals
    renderProps.colors = colors
    renderProps.count = vertices.length
    render(renderProps)
  }
}

regl.frame(update)
