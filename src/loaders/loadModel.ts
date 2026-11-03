import * as THREE from 'three'
import type { ModelFormat } from './formats'

export interface LoadedModel {
  name: string
  format: ModelFormat
  /** 원본 파일 경로. 브라우저에서 연 파일이면 null */
  path: string | null
  object: THREE.Object3D
  animations: THREE.AnimationClip[]
  hasSkeleton: boolean
  stats: { meshes: number; triangles: number }
}

export interface ModelSource {
  /** 로더가 읽을 URL (asset:// 또는 blob:) */
  url: string
  name: string
  format: ModelFormat
  path: string | null
}

/**
 * 포맷별 로더로 모델을 읽는다.
 * 로더는 처음 쓰일 때 동적으로 가져와 시작 번들을 가볍게 유지한다.
 */
export async function loadModel(source: ModelSource): Promise<LoadedModel> {
  const { object, animations } = await parse(source)
  object.name = object.name || source.name
  prepare(object)
  return {
    name: source.name,
    format: source.format,
    path: source.path,
    object,
    animations,
    hasSkeleton: hasSkeleton(object),
    stats: countStats(object),
  }
}

async function parse({ url, format }: ModelSource): Promise<{ object: THREE.Object3D; animations: THREE.AnimationClip[] }> {
  switch (format) {
    case 'gltf':
    case 'glb': {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const gltf = await new GLTFLoader().loadAsync(url)
      return { object: gltf.scene, animations: gltf.animations }
    }
    case 'fbx': {
      const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js')
      const group = await new FBXLoader().loadAsync(url)
      return { object: group, animations: group.animations }
    }
    case 'obj': {
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
      const group = await new OBJLoader().loadAsync(url)
      return { object: group, animations: [] }
    }
    case 'stl': {
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')
      const geometry = await new STLLoader().loadAsync(url)
      if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals()
      const material = geometry.hasAttribute('color')
        ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })
        : new THREE.MeshStandardMaterial({ color: 0xc8c8cc, roughness: 0.7 })
      return { object: new THREE.Mesh(geometry, material), animations: [] }
    }
  }
}

/** 재질이 없거나 단색 기본값뿐인 모델(OBJ 등)을 그림 참고에 맞는 중성 회색으로 맞춘다. */
function prepare(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    // 스킨드 메시는 포즈에 따라 바운딩 박스가 바뀌어 잘못 컬링되는 일이 잦다.
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false
    if (!mesh.material) {
      mesh.material = new THREE.MeshStandardMaterial({ color: 0xc8c8cc, roughness: 0.7 })
    }
  })
}

function hasSkeleton(root: THREE.Object3D) {
  let found = false
  root.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh || (node as THREE.Bone).isBone) found = true
  })
  return found
}

function countStats(root: THREE.Object3D) {
  let meshes = 0
  let triangles = 0
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    meshes++
    const geo = mesh.geometry
    const count = geo.index ? geo.index.count : (geo.getAttribute('position')?.count ?? 0)
    triangles += Math.floor(count / 3)
  })
  return { meshes, triangles }
}
