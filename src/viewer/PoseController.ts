import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { boneLabel, t } from '../i18n'

/** 회전(FK): 고른 관절을 직접 돌린다. IK: 고른 관절을 끌면 위쪽 관절들이 따라 굽는다. */
export type PoseMode = 'rotate' | 'ik'

/** 모든 뼈의 위치·회전·크기. 히스토리와 초기화에 쓴다. */
export type PoseSnapshot = number[][]

export interface PoseSelection {
  name: string
  scale: number
  /** IK로 함께 움직일 위쪽 관절이 있는지 (없으면 IK 모드에서 통째로 옮긴다) */
  hasParent: boolean
}

export interface PoseCallbacks {
  /** 끌기 한 번이 끝났을 때. 히스토리에 남긴다. */
  onCommit: (label: string, before: PoseSnapshot, after: PoseSnapshot) => void
  onSelect: (selection: PoseSelection | null) => void
  /** 포즈가 바뀌어 다시 그려야 할 때 */
  onChange: () => void
}

const MARKER_COLOR = 0xf2c94c
const SELECTED_COLOR = 0x5b9dff
const IK_ITERATIONS = 16
/** 이 거리(px) 안의 가장 가까운 관절을 클릭한 것으로 본다 */
const PICK_RADIUS_PX = 14

/**
 * 뼈대가 있는 모델(FBX·GLTF, 기본 마네킹)의 포즈를 잡는다.
 *
 * 관절 표시와 기즈모는 모델 밖의 별도 그룹(helpers)에 두어, 바운딩 박스·외곽선·내보내기에 섞이지 않게 한다.
 */
export class PoseController {
  /** 관절 점과 뼈대 선. 씬에 직접 추가한다. */
  readonly helpers = new THREE.Group()
  readonly gizmo: TransformControls

  private bones: THREE.Bone[] = []
  private rest: PoseSnapshot = []
  private enabled = false
  private mode: PoseMode = 'rotate'
  private chainLength = 2
  private selected: THREE.Bone | null = null
  private markerSize = 0.02

  private readonly markerGeometry = new THREE.SphereGeometry(1, 12, 8)
  private readonly markerMaterial = new THREE.MeshBasicMaterial({ color: MARKER_COLOR, depthTest: false, transparent: true, opacity: 0.9 })
  private readonly selectedMaterial = new THREE.MeshBasicMaterial({ color: SELECTED_COLOR, depthTest: false, transparent: true })
  private markers: THREE.Mesh[] = []
  private sticks: THREE.LineSegments | null = null
  /** IK 모드에서 기즈모가 붙는 보이지 않는 목표점 */
  private readonly ikTarget = new THREE.Object3D()
  private dragBefore: PoseSnapshot | null = null
  private pointerDown: { x: number; y: number; onGizmo: boolean } | null = null

  private readonly camera: THREE.PerspectiveCamera
  private readonly dom: HTMLElement
  private readonly orbit: OrbitControls
  private readonly callbacks: PoseCallbacks

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement, orbit: OrbitControls, callbacks: PoseCallbacks) {
    this.camera = camera
    this.dom = dom
    this.orbit = orbit
    this.callbacks = callbacks
    this.helpers.visible = false
    this.helpers.add(this.ikTarget)

    this.gizmo = new TransformControls(camera, dom)
    this.gizmo.setSpace('local')
    this.gizmo.setSize(0.8)
    this.gizmo.getHelper().visible = false
    this.gizmo.addEventListener('dragging-changed', (e) => {
      // 기즈모를 끄는 동안 시점이 같이 돌지 않게 한다.
      this.orbit.enabled = !(e as unknown as { value: boolean }).value
    })
    this.gizmo.addEventListener('mouseDown', () => {
      this.dragBefore = this.snapshot()
    })
    this.gizmo.addEventListener('objectChange', () => {
      if (this.mode === 'ik' && this.selected && this.gizmo.object === this.ikTarget) {
        this.solveIK(this.selected, this.ikTarget.position)
      }
      this.callbacks.onChange()
    })
    this.gizmo.addEventListener('mouseUp', () => this.commitDrag())
    this.gizmo.addEventListener('change', () => this.callbacks.onChange())

    dom.addEventListener('pointerdown', this.onPointerDown)
    dom.addEventListener('pointerup', this.onPointerUp)
  }

  get boneCount() {
    return this.bones.length
  }

  /** 새 모델의 뼈대를 읽는다. 처음 포즈를 "초기 자세"로 기억한다. */
  setModel(root: THREE.Object3D | null, radius: number) {
    this.select(null)
    this.clearMarkers()
    this.bones = []
    if (root) root.traverse((node) => (node as THREE.Bone).isBone && this.bones.push(node as THREE.Bone))
    this.rest = this.snapshot()
    this.markerSize = Math.max(radius, 1e-3) * 0.018

    this.markers = this.bones.map(() => {
      const marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial)
      marker.renderOrder = 1000
      marker.scale.setScalar(this.markerSize)
      this.helpers.add(marker)
      return marker
    })
    const pairs = this.bones.filter((b) => (b.parent as THREE.Bone | null)?.isBone).length
    if (pairs > 0) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pairs * 6), 3))
      this.sticks = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({ color: MARKER_COLOR, depthTest: false, transparent: true, opacity: 0.55 }),
      )
      this.sticks.renderOrder = 999
      this.sticks.frustumCulled = false
      this.helpers.add(this.sticks)
    }
    this.updateHelpers()
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    this.helpers.visible = enabled && this.bones.length > 0
    if (!enabled) this.select(null)
  }

  setMode(mode: PoseMode) {
    this.mode = mode
    this.attachGizmo()
  }

  setChainLength(length: number) {
    this.chainLength = length
  }

  /** 관절 점·뼈대 선을 현재 뼈 위치로 옮긴다. 매 프레임 렌더 전에 부른다. */
  updateHelpers() {
    if (!this.helpers.visible) return
    const p = new THREE.Vector3()
    this.bones.forEach((bone, i) => {
      bone.getWorldPosition(p)
      this.markers[i].position.copy(p)
      this.markers[i].material = bone === this.selected ? this.selectedMaterial : this.markerMaterial
      this.markers[i].scale.setScalar(this.markerSize * (bone === this.selected ? 1.4 : 1))
    })
    if (this.sticks) {
      const position = this.sticks.geometry.getAttribute('position') as THREE.BufferAttribute
      let k = 0
      const q = new THREE.Vector3()
      for (const bone of this.bones) {
        const parent = bone.parent as THREE.Bone | null
        if (!parent?.isBone) continue
        bone.getWorldPosition(p)
        parent.getWorldPosition(q)
        position.setXYZ(k++, q.x, q.y, q.z)
        position.setXYZ(k++, p.x, p.y, p.z)
      }
      position.needsUpdate = true
    }
  }

  select(bone: THREE.Bone | null) {
    this.selected = bone
    this.attachGizmo()
    this.callbacks.onSelect(
      bone ? { name: bone.name, scale: bone.scale.x, hasParent: !!(bone.parent as THREE.Bone | null)?.isBone } : null,
    )
    this.callbacks.onChange()
  }

  /** 고른 뼈의 크기(데포르메). 자식 뼈와 붙은 메시가 함께 커지거나 작아진다. */
  setSelectedScale(scale: number) {
    if (!this.selected) return
    this.selected.scale.setScalar(scale)
    this.selected.updateMatrixWorld(true)
    this.callbacks.onChange()
  }

  /** 고른 뼈만 초기 자세로 되돌린다. */
  resetSelected() {
    const index = this.selected ? this.bones.indexOf(this.selected) : -1
    if (index < 0) return
    const before = this.snapshot()
    const after = before.map((v, i) => (i === index ? this.rest[i] : v))
    this.apply(after)
    this.callbacks.onCommit(t('history.boneReset', { name: boneLabel(this.selected!.name) }), before, after)
  }

  /** 모든 뼈를 초기 자세로 되돌린다. */
  resetAll() {
    const before = this.snapshot()
    this.apply(this.rest)
    this.callbacks.onCommit(t('history.poseReset'), before, this.rest)
  }

  snapshot(): PoseSnapshot {
    return this.bones.map((b) => [...b.position.toArray(), ...b.quaternion.toArray(), ...b.scale.toArray()])
  }

  apply(pose: PoseSnapshot) {
    if (pose.length !== this.bones.length) return
    this.bones.forEach((b, i) => {
      const v = pose[i]
      b.position.fromArray(v, 0)
      b.quaternion.fromArray(v, 3)
      b.scale.fromArray(v, 7)
    })
    this.bones[0]?.parent?.updateMatrixWorld(true)
    if (this.selected) {
      this.syncIkTarget()
      this.callbacks.onSelect({ name: this.selected.name, scale: this.selected.scale.x, hasParent: !!(this.selected.parent as THREE.Bone | null)?.isBone })
    }
    this.callbacks.onChange()
  }

  dispose() {
    this.dom.removeEventListener('pointerdown', this.onPointerDown)
    this.dom.removeEventListener('pointerup', this.onPointerUp)
    this.gizmo.detach()
    this.gizmo.dispose()
    this.clearMarkers()
    this.markerGeometry.dispose()
    this.markerMaterial.dispose()
    this.selectedMaterial.dispose()
  }

  private clearMarkers() {
    for (const m of this.markers) this.helpers.remove(m)
    this.markers = []
    if (this.sticks) {
      const sticks = this.sticks
      this.helpers.remove(sticks)
      sticks.geometry.dispose()
      const material = sticks.material as THREE.Material
      material.dispose()
      this.sticks = null
    }
  }

  private attachGizmo() {
    const bone = this.selected
    if (!bone || !this.enabled) {
      this.gizmo.detach()
      this.gizmo.getHelper().visible = false
      return
    }
    const hasParent = !!(bone.parent as THREE.Bone | null)?.isBone
    if (this.mode === 'ik' && hasParent) {
      // 목표점은 helpers(월드 기준) 안에 있으니 월드 좌표로 옮긴다.
      this.syncIkTarget()
      this.gizmo.setMode('translate')
      this.gizmo.setSpace('world')
      this.gizmo.attach(this.ikTarget)
    } else if (this.mode === 'ik') {
      // 최상위 뼈(골반 등)는 IK로 굽힐 위쪽 관절이 없으니 몸 전체를 옮긴다.
      this.gizmo.setMode('translate')
      this.gizmo.setSpace('world')
      this.gizmo.attach(bone)
    } else {
      this.gizmo.setMode('rotate')
      this.gizmo.setSpace('local')
      this.gizmo.attach(bone)
    }
    this.gizmo.getHelper().visible = true
  }

  private syncIkTarget() {
    if (this.selected) this.selected.getWorldPosition(this.ikTarget.position)
    this.ikTarget.updateMatrixWorld()
  }

  private commitDrag() {
    const before = this.dragBefore
    this.dragBefore = null
    if (!before || !this.selected) return
    const after = this.snapshot()
    // IK 목표가 손끝에 닿지 못했으면 다음 끌기가 실제 위치에서 시작하게 맞춘다.
    this.syncIkTarget()
    const name = boneLabel(this.selected.name)
    const label = t(this.mode === 'ik' ? 'history.boneIk' : 'history.boneRotate', { name })
    this.callbacks.onCommit(label, before, after)
  }

  /**
   * CCD IK: 끝 관절(effector)이 target에 닿도록, 바로 위 관절부터 차례로 "끝 관절 방향 → 목표 방향"만큼 돌린다.
   * 몇 번 반복하면 사람이 팔다리를 굽히는 것과 비슷한 자세로 수렴한다.
   */
  private solveIK(effector: THREE.Bone, target: THREE.Vector3) {
    const chain: THREE.Object3D[] = []
    let node = effector.parent
    while (node && (node as THREE.Bone).isBone && chain.length < this.chainLength) {
      chain.push(node)
      node = node.parent
    }
    if (chain.length === 0) return

    const jointPos = new THREE.Vector3()
    const effPos = new THREE.Vector3()
    const toEff = new THREE.Vector3()
    const toTarget = new THREE.Vector3()
    const delta = new THREE.Quaternion()
    const world = new THREE.Quaternion()
    const parentWorld = new THREE.Quaternion()
    const tolerance = this.markerSize * 0.1

    for (let iter = 0; iter < IK_ITERATIONS; iter++) {
      for (const joint of chain) {
        joint.getWorldPosition(jointPos)
        effector.getWorldPosition(effPos)
        toEff.subVectors(effPos, jointPos)
        toTarget.subVectors(target, jointPos)
        if (toEff.lengthSq() < 1e-12 || toTarget.lengthSq() < 1e-12) continue
        delta.setFromUnitVectors(toEff.normalize(), toTarget.normalize())
        // 월드 기준 회전 delta를 관절의 로컬 회전으로 옮긴다: local' = parent⁻¹ · delta · world
        joint.getWorldQuaternion(world)
        joint.parent!.getWorldQuaternion(parentWorld)
        joint.quaternion.copy(parentWorld.invert().multiply(delta.multiply(world)))
        joint.updateMatrixWorld(true)
      }
      if (effector.getWorldPosition(effPos).distanceTo(target) < tolerance) break
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled || e.button !== 0) return
    // 기즈모 축 위에서 시작한 클릭은 선택이 아니라 조작이다.
    this.pointerDown = { x: e.clientX, y: e.clientY, onGizmo: this.gizmo.axis !== null }
  }

  private onPointerUp = (e: PointerEvent) => {
    const down = this.pointerDown
    this.pointerDown = null
    if (!down || down.onGizmo || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return
    // 관절 점이 작아 정확히 맞히기 어려우므로, 화면에서 가장 가까운 관절을 고른다.
    const rect = this.dom.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const p = new THREE.Vector3()
    let best: THREE.Bone | null = null
    let bestDistance = PICK_RADIUS_PX
    for (const bone of this.bones) {
      bone.getWorldPosition(p).project(this.camera)
      if (p.z > 1) continue
      const d = Math.hypot(((p.x + 1) / 2) * rect.width - x, ((1 - p.y) / 2) * rect.height - y)
      if (d < bestDistance) {
        bestDistance = d
        best = bone
      }
    }
    if (best) this.select(best)
  }
}
