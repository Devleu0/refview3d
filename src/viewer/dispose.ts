import * as THREE from 'three'

/** 객체 트리의 지오메트리·재질·텍스처 GPU 리소스를 해제한다. */
export function disposeObject(root: THREE.Object3D) {
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
