import * as THREE from 'three'
import type { LightSettings } from '../store/lightStore'

/**
 * 주광원(그림자) + 보조광 + 환경광 구성.
 * 위치는 모델 중심을 기준으로 방위각·고도로 정하고, 거리와 그림자 범위는 모델 크기에 맞춘다.
 */
export class LightRig {
  readonly group = new THREE.Group()

  private readonly key = new THREE.DirectionalLight(0xffffff)
  private readonly fill = new THREE.DirectionalLight(0xdfe6ff)
  private readonly ambient = new THREE.HemisphereLight(0xffffff, 0x50505a)
  /** 바닥에 그림자만 그리는 투명 평면 */
  private readonly shadowCatcher: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>

  private center = new THREE.Vector3()
  private radius = 5
  private settings: LightSettings | null = null

  constructor() {
    this.key.castShadow = true
    this.key.shadow.mapSize.set(2048, 2048)
    this.key.shadow.bias = -0.0005
    this.group.add(this.key, this.key.target, this.fill, this.fill.target, this.ambient)

    this.shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.35 }))
    this.shadowCatcher.rotation.x = -Math.PI / 2
    this.shadowCatcher.receiveShadow = true
    this.group.add(this.shadowCatcher)
  }

  /**
   * 모델 크기에 맞춘다.
   * @param floorY 그림자를 받을 바닥 높이 (모델 바운딩 박스 아래면)
   */
  fit(center: THREE.Vector3, radius: number, floorY: number) {
    this.center.copy(center)
    this.radius = Math.max(radius, 1e-3)
    // 그리드와 같은 높이면 깜빡이므로(z-fighting) 아주 조금 내린다.
    this.shadowCatcher.position.set(center.x, floorY - this.radius * 0.002, center.z)
    this.shadowCatcher.scale.setScalar(this.radius * 20)

    const cam = this.key.shadow.camera
    const r = this.radius * 1.2
    cam.left = -r
    cam.right = r
    cam.top = r
    cam.bottom = -r
    cam.near = this.radius * 0.5
    // 낮은 조명에서는 바닥 그림자가 길게 늘어나 광원에서 멀어지므로 far를 넉넉히 둔다(고도 약 5°까지).
    // 평행광이라 그림자의 가로세로 범위는 모델 투영 범위를 넘지 않아 left/right/top/bottom은 그대로 둔다.
    cam.far = this.radius * 30
    cam.updateProjectionMatrix()
    // 그림자 경계가 모델 크기와 상관없이 비슷하게 보이도록
    this.key.shadow.normalBias = this.radius * 0.004
    this.place()
  }

  apply(settings: LightSettings) {
    this.settings = settings
    this.key.intensity = settings.keyIntensity
    this.fill.intensity = settings.fillIntensity
    this.ambient.intensity = settings.ambientIntensity
    this.key.castShadow = settings.shadows
    this.shadowCatcher.visible = settings.shadows
    this.place()
  }

  private place() {
    const s = this.settings
    if (!s) return
    const distance = this.radius * 3
    this.key.position.copy(this.center).addScaledVector(direction(s.keyAzimuth, s.keyElevation), distance)
    this.key.target.position.copy(this.center)
    // 보조광은 주광원 반대편, 눈높이보다 조금 위
    this.fill.position.copy(this.center).addScaledVector(direction(s.keyAzimuth + 180, 15), distance)
    this.fill.target.position.copy(this.center)
  }

  dispose() {
    this.key.shadow.dispose()
    this.shadowCatcher.geometry.dispose()
    this.shadowCatcher.material.dispose()
  }
}

/** 방위각·고도(도)를 단위 벡터로. 0° = +Z(정면), 90° = +X(오른쪽) */
function direction(azimuthDeg: number, elevationDeg: number) {
  const az = THREE.MathUtils.degToRad(azimuthDeg)
  const el = THREE.MathUtils.degToRad(elevationDeg)
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
}
