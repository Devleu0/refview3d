import * as THREE from 'three'

/**
 * 다른 뼈의 회전·이동을 따라 하는 뼈 (MMD의 付与親).
 *
 * MMD 모델은 사용자가 돌리는 뼈(足)와 메시가 실제로 붙은 뼈(足D)가 다른 경우가 많다.
 * 포즈를 바꿀 때마다 이 연결을 다시 계산해야 메시가 따라 움직인다.
 */
export interface BoneLink {
  target: THREE.Bone
  source: THREE.Bone
  weight: number
  rotate: boolean
  translate: boolean
}

interface LinkState extends BoneLink {
  targetRest: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }
  sourceRest: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }
}

/** 모델 루트 → 연결 목록. userData에 넣으면 순환 참조로 직렬화가 깨지므로 따로 둔다. */
const registry = new WeakMap<THREE.Object3D, LinkState[]>()

const restOf = (bone: THREE.Bone) => ({
  position: bone.position.clone(),
  quaternion: bone.quaternion.clone(),
  scale: bone.scale.clone(),
})

/** 연결은 적용 순서대로 넘긴다 (따라 하는 뼈를 다시 따라 하는 경우가 있다). 지금 자세를 기준 자세로 기억한다. */
export function setBoneLinks(root: THREE.Object3D, links: BoneLink[]) {
  if (links.length === 0) return
  registry.set(
    root,
    links.map((link) => ({ ...link, targetRest: restOf(link.target), sourceRest: restOf(link.source) })),
  )
}

const tmpQ = new THREE.Quaternion()
const delta = new THREE.Quaternion()
const tmpV = new THREE.Vector3()
const IDENTITY = new THREE.Quaternion()

/** 연결된 뼈들을 원본 뼈의 현재 자세에 맞춘다. 연결이 없으면 false */
export function applyBoneLinks(root: THREE.Object3D | null): boolean {
  const links = root ? registry.get(root) : undefined
  if (!links) return false
  for (const l of links) {
    if (l.rotate) {
      // 원본이 기준 자세에서 돈 만큼(delta)을 weight 비율로 더한다.
      delta.copy(l.sourceRest.quaternion).invert().premultiply(l.source.quaternion)
      tmpQ.copy(IDENTITY).slerp(delta, l.weight)
      l.target.quaternion.copy(l.targetRest.quaternion).multiply(tmpQ)
      // 데포르메(관절 크기)도 따라 해야 메시가 커진다.
      tmpV.copy(l.source.scale).divide(l.sourceRest.scale)
      tmpV.set(1 + (tmpV.x - 1) * l.weight, 1 + (tmpV.y - 1) * l.weight, 1 + (tmpV.z - 1) * l.weight)
      l.target.scale.copy(l.targetRest.scale).multiply(tmpV)
    }
    if (l.translate) {
      tmpV.subVectors(l.source.position, l.sourceRest.position).multiplyScalar(l.weight)
      l.target.position.copy(l.targetRest.position).add(tmpV)
    }
    l.target.updateMatrixWorld(true)
  }
  return true
}
