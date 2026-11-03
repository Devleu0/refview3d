import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'threeQuarter'

const PRESET_DIRECTIONS: Record<ViewPreset, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0, 1),
  back: new THREE.Vector3(0, 0, -1),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
  top: new THREE.Vector3(0, 1, 0.0001),
  threeQuarter: new THREE.Vector3(1, 0.5, 1).normalize(),
}

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

/**
 * Three.js 씬, 카메라, 렌더 루프를 소유하는 클래스.
 *
 * 레퍼런스 뷰어는 대부분 정지 화면을 보고 있으므로, 매 프레임 렌더하지 않고
 * 변화가 있을 때만 렌더한다(on-demand rendering). 유휴 시 GPU/CPU 사용이 거의 없다.
 */
export class SceneManager {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls

  private readonly container: HTMLElement
  private readonly resizeObserver: ResizeObserver
  private readonly grid: THREE.GridHelper
  private modelRoot: THREE.Object3D | null = null
  private frameRequested = false
  private disposed = false

  constructor(container: HTMLElement) {
    this.container = container

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setClearColor(0x000000, 0)
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000)
    this.camera.position.set(3, 2, 4)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.12
    this.controls.screenSpacePanning = true
    this.controls.addEventListener('change', this.requestRender)

    this.grid = new THREE.GridHelper(10, 20, 0x6b6c73, 0x4a4b51)
    this.scene.add(this.grid)

    // 임시 조명. 조명 기능 단계에서 LightRig로 교체한다.
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444450, 1.2))
    const key = new THREE.DirectionalLight(0xffffff, 1.8)
    key.position.set(3, 5, 4)
    this.scene.add(key)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
  }

  /** 다음 애니메이션 프레임에 한 번 렌더한다. 여러 번 호출해도 한 번만 그린다. */
  requestRender = () => {
    if (this.frameRequested || this.disposed) return
    this.frameRequested = true
    requestAnimationFrame(this.renderFrame)
  }

  private renderFrame = () => {
    this.frameRequested = false
    if (this.disposed) return
    // 감속(damping) 중이면 change 이벤트가 다시 renderFrame을 요청한다.
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.requestRender()
  }

  get fov() {
    return this.camera.fov
  }

  /**
   * 화각을 바꾼다.
   * keepFraming이 true면 대상이 화면에서 같은 크기로 보이도록 카메라를 앞뒤로 옮긴다(돌리 줌).
   * 광각은 투시가 과장되고, 망원은 평면적인 구도가 된다.
   */
  setFov(fov: number, keepFraming = true) {
    const prev = this.camera.fov
    if (keepFraming && prev !== fov) {
      const target = this.controls.target
      const offset = this.camera.position.clone().sub(target)
      const ratio = Math.tan(THREE.MathUtils.degToRad(prev / 2)) / Math.tan(THREE.MathUtils.degToRad(fov / 2))
      offset.multiplyScalar(ratio)
      this.camera.position.copy(target).add(offset)
      this.updateClipping(offset.length())
    }
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
    this.requestRender()
  }

  setGridVisible(visible: boolean) {
    this.grid.visible = visible
    this.requestRender()
  }

  /** 현재 모델(없으면 원점)을 화면에 꽉 차게 맞춘다. */
  frame(direction?: THREE.Vector3) {
    const box = this.modelRoot ? new THREE.Box3().setFromObject(this.modelRoot) : null
    const sphere = box && !box.isEmpty() ? box.getBoundingSphere(new THREE.Sphere()) : new THREE.Sphere(new THREE.Vector3(), 1)

    const dir = (direction ?? this.camera.position.clone().sub(this.controls.target)).clone().normalize()
    if (dir.lengthSq() === 0) dir.set(0, 0, 1)

    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const halfFovH = Math.atan(Math.tan(halfFov) * this.camera.aspect)
    const distance = (sphere.radius / Math.sin(Math.min(halfFov, halfFovH))) * 1.1

    this.controls.target.copy(sphere.center)
    this.camera.position.copy(sphere.center).addScaledVector(dir, distance)
    this.updateClipping(distance, sphere.radius)
    this.camera.updateProjectionMatrix()
    this.controls.update()
    this.requestRender()
  }

  setViewPreset(preset: ViewPreset) {
    this.frame(PRESET_DIRECTIONS[preset])
  }

  private updateClipping(distance: number, radius = distance) {
    this.camera.near = Math.max(distance / 1000, 0.001)
    this.camera.far = Math.max(distance + radius * 10, 100)
    this.camera.updateProjectionMatrix()
  }

  /** 모델을 교체한다. 이전 모델의 GPU 리소스는 해제한다. */
  setModel(object: THREE.Object3D | null) {
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot)
      disposeObject(this.modelRoot)
    }
    this.modelRoot = object
    if (object) {
      this.scene.add(object)
      this.placeGrid(object)
      this.frame(PRESET_DIRECTIONS.threeQuarter)
    } else {
      this.grid.position.set(0, 0, 0)
      this.grid.scale.setScalar(1)
      this.requestRender()
    }
  }

  /** 모델 크기에 맞춰 그리드를 발 밑으로 옮기고 배율을 조정한다. */
  private placeGrid(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object)
    if (box.isEmpty()) return
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const extent = Math.max(size.x, size.z, size.y * 0.5)
    // 그리드 기본 크기 10 기준으로 2의 거듭제곱 단위 배율
    const scale = Math.pow(2, Math.ceil(Math.log2(Math.max(extent * 2, 1e-3) / 10)))
    this.grid.scale.setScalar(scale)
    this.grid.position.set(center.x, box.min.y, center.z)
  }

  getCameraState(): CameraState {
    return {
      position: this.camera.position.toArray() as [number, number, number],
      target: this.controls.target.toArray() as [number, number, number],
      fov: this.camera.fov,
    }
  }

  setCameraState(state: CameraState) {
    this.camera.position.fromArray(state.position)
    this.controls.target.fromArray(state.target)
    this.camera.fov = state.fov
    this.updateClipping(this.camera.position.distanceTo(this.controls.target))
    this.controls.update()
    this.requestRender()
  }

  dispose() {
    this.disposed = true
    this.resizeObserver.disconnect()
    this.controls.removeEventListener('change', this.requestRender)
    this.controls.dispose()
    if (this.modelRoot) disposeObject(this.modelRoot)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const material = mesh.material
    if (!material) return
    for (const m of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(m)) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      m.dispose()
    }
  })
}
