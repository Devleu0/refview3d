import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { LightSettings } from '../store/lightStore'
import { LightRig } from './LightRig'
import { ShadingOverride } from './ShadingOverride'

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
  private readonly lights = new LightRig()
  private readonly shading = new ShadingOverride()
  private modelRoot: THREE.Object3D | null = null
  /** 현재 모델의 바운딩 구 반지름 (모델이 없으면 0) */
  private modelRadius = 0
  /** 코드로 카메라를 옮길 때마다 1씩 증가 (마우스 조작과 구분용) */
  cameraEpoch = 0
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

    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.lights.fit(new THREE.Vector3(), 5, 0)
    this.scene.add(this.lights.group)

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
    // 휠 줌 등 마우스 조작으로 거리가 바뀌어도 모델이 잘리지 않도록 매 프레임 맞춘다.
    this.updateClipping()
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
    this.markProgrammaticChange()
    if (keepFraming && prev !== fov) {
      const target = this.controls.target
      const offset = this.camera.position.clone().sub(target)
      const ratio = Math.tan(THREE.MathUtils.degToRad(prev / 2)) / Math.tan(THREE.MathUtils.degToRad(fov / 2))
      offset.multiplyScalar(ratio)
      // 광각으로 크게 당겨도 카메라가 모델 안으로 들어가지는 않게 한다.
      const minDistance = this.modelRadius * 1.02
      if (offset.length() < minDistance) offset.setLength(minDistance)
      this.camera.position.copy(target).add(offset)
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

    this.markProgrammaticChange()
    this.controls.target.copy(sphere.center)
    this.camera.position.copy(sphere.center).addScaledVector(dir, distance)
    this.controls.update()
    this.requestRender()
  }

  setViewPreset(preset: ViewPreset) {
    this.frame(PRESET_DIRECTIONS[preset])
  }

  /**
   * 코드로 카메라를 옮길 때 호출한다.
   * 마우스 조작의 감속(관성)을 멈추고, 히스토리 추적기가 진행 중인 제스처를 확정하도록 epoch를 올린다.
   */
  private markProgrammaticChange() {
    this.cameraEpoch++
    // OrbitControls는 감속 상태를 공개 API로 초기화할 수 없어 내부 필드를 직접 비운다. (three r187 기준)
    const internal = this.controls as unknown as {
      _sphericalDelta?: THREE.Spherical
      _panOffset?: THREE.Vector3
      _scale?: number
    }
    internal._sphericalDelta?.set(0, 0, 0)
    internal._panOffset?.set(0, 0, 0)
    if (internal._scale !== undefined) internal._scale = 1
  }

  /** 대상까지의 거리와 모델 크기에 맞춰 near/far를 정한다. */
  private updateClipping() {
    const distance = this.camera.position.distanceTo(this.controls.target)
    const radius = this.modelRadius || distance
    this.camera.near = Math.max(distance / 1000, 0.001)
    this.camera.far = Math.max(distance + radius * 10, 100)
    this.camera.updateProjectionMatrix()
  }

  /** 모델을 교체한다. 이전 모델의 GPU 리소스는 해제한다. */
  setModel(object: THREE.Object3D | null) {
    // 바꿔 끼운 재질을 먼저 원본으로 되돌려야 원본 재질까지 해제된다.
    this.shading.attach(null)
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot)
      disposeObject(this.modelRoot)
    }
    this.modelRoot = object
    this.modelRadius = 0
    this.controls.maxDistance = Infinity
    const box = object ? new THREE.Box3().setFromObject(object) : null
    if (object && box && !box.isEmpty()) {
      this.scene.add(object)
      this.shading.attach(object)
      this.modelRadius = box.getBoundingSphere(new THREE.Sphere()).radius
      // 휠로 끝없이 멀어져 모델을 잃어버리지 않게 한다. 망원 10°로 맞춘 거리(약 13배)보다 넉넉하게 둔다.
      this.controls.maxDistance = this.modelRadius * 100
      this.placeFloor(box)
      this.frame(PRESET_DIRECTIONS.threeQuarter)
    } else {
      if (object) {
        this.scene.add(object)
        this.shading.attach(object)
      }
      this.grid.position.set(0, 0, 0)
      this.grid.scale.setScalar(1)
      this.lights.fit(new THREE.Vector3(), 5, 0)
      this.requestRender()
    }
  }

  /** 조명 배치와 음영 방식을 적용한다. */
  setLighting(settings: LightSettings) {
    this.lights.apply(settings)
    this.shading.set(settings.shading, settings.toonSteps)
    this.requestRender()
  }

  /** 모델 크기에 맞춰 그리드와 그림자 바닥을 발 밑으로 옮기고, 조명 거리를 맞춘다. */
  private placeFloor(box: THREE.Box3) {
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    this.lights.fit(sphere.center, sphere.radius, box.min.y)
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
    this.markProgrammaticChange()
    this.camera.position.fromArray(state.position)
    this.controls.target.fromArray(state.target)
    this.camera.fov = state.fov
    this.camera.updateProjectionMatrix()
    this.controls.update()
    this.requestRender()
  }

  dispose() {
    this.disposed = true
    this.resizeObserver.disconnect()
    this.controls.removeEventListener('change', this.requestRender)
    this.controls.dispose()
    this.shading.dispose()
    if (this.modelRoot) disposeObject(this.modelRoot)
    this.lights.dispose()
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
