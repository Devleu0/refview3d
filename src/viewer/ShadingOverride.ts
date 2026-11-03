import * as THREE from 'three'
import type { ShadingMode } from '../store/lightStore'

type MaterialSlot = THREE.Material | THREE.Material[]

/**
 * 모델의 재질을 클레이·툰으로 잠시 바꿔 끼운다. 원본 재질은 보관했다가 되돌린다.
 * 원본 텍스처(색 맵 등)는 공유만 하고 해제하지 않는다.
 */
export class ShadingOverride {
  private root: THREE.Object3D | null = null
  private mode: ShadingMode = 'original'
  private toonSteps = 3
  private readonly originals = new Map<THREE.Mesh, MaterialSlot>()
  /** 원본 재질 → 바꿔 끼운 재질. 같은 재질을 쓰는 메시끼리 공유한다. */
  private readonly derived = new Map<THREE.Material, THREE.Material>()
  private gradient: THREE.DataTexture | null = null

  /** 새 모델에 적용한다. 이전 모델은 원본 재질로 되돌린 뒤 놓는다. */
  attach(root: THREE.Object3D | null) {
    this.restore()
    this.root = root
    this.override()
  }

  /** 모드가 바뀌었으면 다시 적용한다. */
  set(mode: ShadingMode, toonSteps: number) {
    if (mode === this.mode && (mode !== 'toon' || toonSteps === this.toonSteps)) return
    this.restore()
    this.mode = mode
    if (toonSteps !== this.toonSteps) {
      this.toonSteps = toonSteps
      this.gradient?.dispose()
      this.gradient = null
    }
    this.override()
  }

  /** 모든 메시를 원본 재질로 되돌리고 바꿔 끼운 재질을 해제한다. */
  restore() {
    for (const [mesh, material] of this.originals) mesh.material = material
    this.originals.clear()
    for (const material of this.derived.values()) material.dispose()
    this.derived.clear()
  }

  dispose() {
    this.restore()
    this.root = null
    this.gradient?.dispose()
    this.gradient = null
  }

  private override() {
    if (!this.root || this.mode === 'original') return
    this.root.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      this.originals.set(mesh, mesh.material)
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(this.derive) : this.derive(mesh.material)
    })
  }

  private derive = (source: THREE.Material): THREE.Material => {
    const cached = this.derived.get(source)
    if (cached) return cached
    const src = source as THREE.MeshStandardMaterial
    const common = {
      side: source.side,
      transparent: source.transparent,
      opacity: source.opacity,
      alphaTest: source.alphaTest,
      alphaMap: src.alphaMap ?? null,
      flatShading: src.flatShading ?? false,
    }
    const material =
      this.mode === 'clay'
        ? new THREE.MeshStandardMaterial({ ...common, color: 0xc8c8cc, roughness: 0.8 })
        : new THREE.MeshToonMaterial({
            ...common,
            color: src.color ?? 0xffffff,
            map: src.map ?? null,
            vertexColors: source.vertexColors,
            gradientMap: this.toonGradient(),
          })
    this.derived.set(source, material)
    return material
  }

  /** 밝기를 toonSteps 단계로 끊는 1차원 텍스처 */
  private toonGradient() {
    if (this.gradient) return this.gradient
    const steps = this.toonSteps
    const data = new Uint8Array(steps)
    // 가장 어두운 단계도 완전히 검지 않게 해서 형태가 보이도록 한다.
    for (let i = 0; i < steps; i++) data[i] = Math.round((0.2 + (0.8 * i) / (steps - 1)) * 255)
    const texture = new THREE.DataTexture(data, steps, 1, THREE.RedFormat)
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true
    this.gradient = texture
    return texture
  }
}
