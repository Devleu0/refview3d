import * as THREE from 'three'
import type { LoadedModel } from './loadModel'

/**
 * 그림 참고용 목각 마네킹. 뼈대(Bone)에 신체 부위 메시를 그대로 붙여(스키닝 없이) 관절을 돌리면 따라 움직인다.
 * 단위는 m, 발바닥이 원점, 정면이 +Z, 키 약 1.7m(7.5등신). 캐릭터의 왼쪽이 +X.
 */
export function createMannequin(): LoadedModel {
  const material = new THREE.MeshStandardMaterial({ color: 0xd8c4a8, roughness: 0.65 })
  const jointMaterial = new THREE.MeshStandardMaterial({ color: 0xb59a78, roughness: 0.6 })
  const root = new THREE.Group()
  root.name = '기본 마네킹'

  const bone = (name: string, parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const b = new THREE.Bone()
    b.name = name
    b.position.set(x, y, z)
    parent.add(b)
    return b
  }
  /** 뼈 아래(-Y)로 뻗는 캡슐. 길이는 다음 관절까지 */
  const limb = (b: THREE.Bone, length: number, radius: number, endRadius = radius) => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry((radius + endRadius) / 2, Math.max(length - radius - endRadius, 0.01), 6, 16), material)
    mesh.position.y = -length / 2
    b.add(mesh)
  }
  const joint = (b: THREE.Bone, radius: number) => b.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), jointMaterial))
  const shape = (b: THREE.Bone, geometry: THREE.BufferGeometry, y: number, scale: [number, number, number], z = 0) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, y, z)
    mesh.scale.set(...scale)
    b.add(mesh)
  }

  // 몸통
  const hips = bone('골반', root, 0, 0.95)
  shape(hips, new THREE.SphereGeometry(0.15, 24, 16), 0.0, [1.05, 0.7, 0.75])
  const spine = bone('허리', hips, 0, 0.1)
  shape(spine, new THREE.SphereGeometry(0.12, 24, 16), 0.08, [1, 1.1, 0.75])
  const chest = bone('가슴', spine, 0, 0.18)
  shape(chest, new THREE.SphereGeometry(0.17, 24, 16), 0.1, [1, 0.95, 0.68])
  const neck = bone('목', chest, 0, 0.25)
  shape(neck, new THREE.CylinderGeometry(0.045, 0.055, 0.1, 16), 0.04, [1, 1, 1])
  const head = bone('머리', neck, 0, 0.09)
  shape(head, new THREE.SphereGeometry(0.1, 32, 24), 0.1, [0.9, 1.15, 1])
  // 얼굴 방향을 알 수 있게 코 자리에 작은 돌기
  shape(head, new THREE.SphereGeometry(0.02, 12, 8), 0.09, [1, 1.4, 1], 0.095)

  // 팔·다리: 왼쪽(+X), 오른쪽(-X)
  for (const [side, s] of [
    ['왼쪽', 1],
    ['오른쪽', -1],
  ] as const) {
    const shoulder = bone(`${side} 어깨`, chest, 0.17 * s, 0.17)
    joint(shoulder, 0.05)
    // 팔은 몸에서 조금 벌린 A자 자세
    shoulder.rotation.z = 0.2 * s
    const upperArm = bone(`${side} 위팔`, shoulder, 0, 0)
    limb(upperArm, 0.29, 0.045, 0.038)
    const lowerArm = bone(`${side} 아래팔`, upperArm, 0, -0.29)
    joint(lowerArm, 0.038)
    limb(lowerArm, 0.26, 0.036, 0.03)
    const hand = bone(`${side} 손`, lowerArm, 0, -0.26)
    joint(hand, 0.028)
    shape(hand, new THREE.BoxGeometry(0.07, 0.15, 0.03), -0.08, [1, 1, 1])

    const upperLeg = bone(`${side} 허벅지`, hips, 0.09 * s, -0.04)
    joint(upperLeg, 0.07)
    limb(upperLeg, 0.43, 0.068, 0.05)
    const lowerLeg = bone(`${side} 종아리`, upperLeg, 0, -0.43)
    joint(lowerLeg, 0.05)
    limb(lowerLeg, 0.42, 0.05, 0.038)
    const foot = bone(`${side} 발`, lowerLeg, 0, -0.42)
    joint(foot, 0.036)
    shape(foot, new THREE.BoxGeometry(0.085, 0.05, 0.22), -0.035, [1, 1, 1], 0.06)
  }

  let meshes = 0
  let triangles = 0
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    meshes++
    triangles += (mesh.geometry.index?.count ?? 0) / 3
  })

  return {
    name: '기본 마네킹',
    format: 'mannequin',
    path: null,
    object: root,
    animations: [],
    hasSkeleton: true,
    stats: { meshes, triangles },
  }
}
