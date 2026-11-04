import * as THREE from 'three'
import type { LineSettings } from '../store/lineStore'

const LINE_COLOR = new THREE.Color(0x16161a)
const HIDDEN_LINE_COLOR = 0x23262e
/** 이 각도(도)보다 크게 꺾인 모서리만 은선으로 그린다. 낮추면 곡면의 굽은 부분까지 잡혀 지저분해진다. */
const HIDDEN_EDGE_ANGLE = 40

const outlineShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float radius;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform bool creases;
    uniform vec3 lineColor;
    varying vec2 vUv;

    // 1/거리. 화면 공간에서 평면 위의 값이 선형이라, 2차 미분이 0이 아닌 곳이 경계다.
    float invDepth(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      return -1.0 / perspectiveDepthToViewZ(d, cameraNear, cameraFar);
    }

    float normalDiff(vec4 a, vec4 b) {
      // 배경(알파 0)과의 차이는 깊이 쪽에서 잡는다.
      if (a.a < 0.5 || b.a < 0.5) return 0.0;
      return 1.0 - dot(a.xyz * 2.0 - 1.0, b.xyz * 2.0 - 1.0);
    }

    void main() {
      vec2 dx = vec2(radius / resolution.x, 0.0);
      vec2 dy = vec2(0.0, radius / resolution.y);

      float c = invDepth(vUv);
      float l = invDepth(vUv - dx);
      float r = invDepth(vUv + dx);
      float u = invDepth(vUv + dy);
      float d = invDepth(vUv - dy);
      float scale = max(max(c, max(l, r)), max(u, d));
      float lap = (abs(l + r - 2.0 * c) + abs(u + d - 2.0 * c)) / max(scale, 1e-6);
      float edge = smoothstep(0.08, 0.2, lap);

      if (creases) {
        vec4 nc = texture2D(tNormal, vUv);
        float diff = max(
          max(normalDiff(nc, texture2D(tNormal, vUv - dx)), normalDiff(nc, texture2D(tNormal, vUv + dx))),
          max(normalDiff(nc, texture2D(tNormal, vUv + dy)), normalDiff(nc, texture2D(tNormal, vUv - dy)))
        );
        edge = max(edge, smoothstep(0.3, 0.5, diff));
      }

      gl_FragColor = vec4(lineColor, edge);
    }
  `,
}

/**
 * 선화: 화면 공간 외곽선과 가려진 모서리(은선).
 *
 * 외곽선은 모델의 법선·깊이를 따로 렌더한 뒤 경계를 찾아 현재 화면 위에 덧그린다.
 * 메시 구조와 상관없이 동작해 스킨드 메시나 고밀도 메시에도 쓸 수 있다.
 * 은선은 EdgesGeometry로 뽑은 모서리를 "더 먼 깊이"일 때만 점선으로 그린다.
 */
export class LineArt {
  /** 은선 LineSegments 묶음. 씬에 직접 추가한다. */
  readonly hiddenGroup = new THREE.Group()

  private settings: LineSettings | null = null
  private readonly target: THREE.WebGLRenderTarget
  private readonly normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })
  private readonly quadScene = new THREE.Scene()
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly outlineMaterial: THREE.ShaderMaterial

  private model: THREE.Object3D | null = null
  private modelRadius = 1
  private hiddenMaterial: THREE.LineDashedMaterial | null = null
  private hiddenBuilt = false

  constructor() {
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      depthTexture: new THREE.DepthTexture(1, 1),
      depthBuffer: true,
    })
    this.outlineMaterial = new THREE.ShaderMaterial({
      ...outlineShader,
      uniforms: {
        tNormal: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        resolution: { value: new THREE.Vector2(1, 1) },
        radius: { value: 1 },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 100 },
        creases: { value: true },
        lineColor: { value: LINE_COLOR },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.outlineMaterial)
    quad.frustumCulled = false
    this.quadScene.add(quad)
    this.hiddenGroup.visible = false
  }

  get outlineEnabled() {
    return this.settings?.outline ?? false
  }

  apply(settings: LineSettings) {
    this.settings = settings
    this.outlineMaterial.uniforms.creases.value = settings.creases
    if (settings.hiddenLines && !this.hiddenBuilt) this.buildHiddenLines()
    this.hiddenGroup.visible = settings.hiddenLines
  }

  /** 모델이 바뀌면 은선을 다시 만든다(필요할 때만). */
  setModel(model: THREE.Object3D | null, radius: number) {
    this.clearHiddenLines()
    this.model = model
    this.modelRadius = radius || 1
    if (this.settings?.hiddenLines) this.buildHiddenLines()
  }

  /**
   * 현재 렌더 대상 위에 외곽선을 덧그린다.
   * @param renderModel 모델만 주어진 재질로 렌더하는 함수 (그리드·그림자·은선 제외)
   * @param lineScale CSS 1px이 렌더 대상에서 몇 픽셀인지 (devicePixelRatio, 내보내기 배율)
   */
  drawOutline(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    renderModel: (material: THREE.Material) => void,
    lineScale: number,
  ) {
    if (!this.settings?.outline || !this.model) return
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    if (this.target.width !== size.x || this.target.height !== size.y) this.target.setSize(size.x, size.y)

    const previousTarget = renderer.getRenderTarget()
    const previousAutoClear = renderer.autoClear
    renderer.setRenderTarget(this.target)
    renderer.autoClear = true
    renderModel(this.normalMaterial)

    const u = this.outlineMaterial.uniforms
    u.resolution.value.copy(size)
    // 경계 양쪽이 모두 선이 되므로 반지름은 굵기의 절반
    u.radius.value = Math.max((this.settings.lineWidth * lineScale) / 2, 0.5)
    u.cameraNear.value = camera.near
    u.cameraFar.value = camera.far

    renderer.setRenderTarget(previousTarget)
    renderer.autoClear = false
    renderer.render(this.quadScene, this.quadCamera)
    renderer.autoClear = previousAutoClear
  }

  /** 모델 자세가 바뀌었을 때, 은선을 쓰고 있으면 지금 자세로 다시 만든다. */
  refreshHidden() {
    if (!this.hiddenBuilt) return
    this.clearHiddenLines()
    if (this.settings?.hiddenLines) this.buildHiddenLines()
  }

  private buildHiddenLines() {
    this.hiddenBuilt = true
    if (!this.model) return
    this.model.updateMatrixWorld(true)
    const dash = this.modelRadius * 0.02
    const material = new THREE.LineDashedMaterial({
      color: HIDDEN_LINE_COLOR,
      dashSize: dash,
      gapSize: dash * 0.8,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      depthFunc: THREE.GreaterDepth,
    })
    // 보이는 모서리는 표면과 깊이가 같아 정밀도 오차로 점선이 섞여 나온다.
    // 선을 카메라 쪽으로 거리의 0.2%만큼 당겨 보이는 모서리는 확실히 탈락시킨다.
    // (깊이 버퍼 값에 바로 더하면 near가 가까울 때 앞뒤 차이보다 커져 은선까지 사라진다.)
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n\tgl_Position = projectionMatrix * vec4(mvPosition.xyz * 0.998, 1.0);',
      )
    }
    this.hiddenMaterial = material

    this.model.traverse((node) => {
      const mesh = node as THREE.Mesh
      // 스킨드 메시는 포즈에 따라 모양이 바뀌어 고정된 모서리가 맞지 않는다.
      if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh || !mesh.geometry) return
      const edges = new THREE.EdgesGeometry(mesh.geometry, HIDDEN_EDGE_ANGLE)
      // 점선 간격을 모든 메시에서 같게 하려고 월드 좌표로 구워 넣는다.
      edges.applyMatrix4(mesh.matrixWorld)
      const line = new THREE.LineSegments(edges, material)
      line.computeLineDistances()
      line.renderOrder = 10
      this.hiddenGroup.add(line)
    })
  }

  private clearHiddenLines() {
    for (const child of this.hiddenGroup.children) (child as THREE.LineSegments).geometry.dispose()
    this.hiddenGroup.clear()
    this.hiddenMaterial?.dispose()
    this.hiddenMaterial = null
    this.hiddenBuilt = false
  }

  dispose() {
    this.clearHiddenLines()
    this.target.depthTexture?.dispose()
    this.target.dispose()
    this.normalMaterial.dispose()
    this.outlineMaterial.dispose()
    const quad = this.quadScene.children[0] as THREE.Mesh
    quad.geometry.dispose()
  }
}
