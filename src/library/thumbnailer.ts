import * as THREE from 'three'
import { t } from '../i18n'
import { openModelFromPath } from '../loaders/openModel'
import { disposeObject } from '../viewer/dispose'

const SIZE = 256

/**
 * 라이브러리 썸네일 렌더러. 뷰포트와 별개의 작은 WebGL 캔버스를 하나 두고 재사용한다.
 * 모델은 3/4 시점, 고정 조명으로 그려 목록에서 비교하기 쉽게 한다.
 */
class Thumbnailer {
  private renderer: THREE.WebGLRenderer | null = null
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000)

  constructor() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x50505a, 1.3))
    const key = new THREE.DirectionalLight(0xffffff, 2)
    key.position.set(-1, 1.4, 1.2)
    this.scene.add(key)
  }

  private getRenderer() {
    if (!this.renderer) {
      // toBlob이 비동기라 그리기 버퍼를 보존해 둔다. 캔버스가 작아 비용이 크지 않다.
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      this.renderer.setPixelRatio(1)
      this.renderer.setSize(SIZE, SIZE, false)
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.setClearColor(0x000000, 0)
    }
    return this.renderer
  }

  /** 모델 파일을 열어 PNG 바이트로 그린다. */
  async render(path: string): Promise<Uint8Array<ArrayBuffer>> {
    const { object } = await openModelFromPath(path)
    try {
      this.scene.add(object)
      const box = new THREE.Box3().setFromObject(object)
      if (box.isEmpty()) throw new Error(t('file.emptyModel'))
      const sphere = box.getBoundingSphere(new THREE.Sphere())
      const dir = new THREE.Vector3(1, 0.6, 1.3).normalize()
      const distance = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2))) * 1.05
      this.camera.position.copy(sphere.center).addScaledVector(dir, distance)
      this.camera.near = distance / 100
      this.camera.far = distance + sphere.radius * 4
      this.camera.updateProjectionMatrix()
      this.camera.lookAt(sphere.center)

      const renderer = this.getRenderer()
      renderer.render(this.scene, this.camera)
      const blob = await new Promise<Blob | null>((resolve) => renderer.domElement.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error(t('export.imageFailed'))
      return new Uint8Array(await blob.arrayBuffer())
    } finally {
      this.scene.remove(object)
      disposeObject(object)
    }
  }
}

let instance: Thumbnailer | null = null
export const thumbnailer = () => (instance ??= new Thumbnailer())
