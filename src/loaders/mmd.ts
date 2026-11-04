import * as THREE from 'three'
import { setBoneLinks, type BoneLink } from '../viewer/boneLinks'

/**
 * MikuMikuDance 모델(PMD·PMX)을 읽는다.
 *
 * 그림 참고에 필요한 형태·재질·텍스처·뼈대만 읽고, 표정(모프)·물리·MMD 자체 IK는 읽지 않는다.
 * 포즈는 앱의 FK/IK로 잡으므로, MMD의 IK 뼈와 보조 뼈는 관절 목록에서 숨긴다.
 */

interface MmdMaterial {
  name: string
  diffuse: [number, number, number, number]
  ambient: [number, number, number]
  doubleSided: boolean
  /** 모델 폴더 기준 상대 경로. 없으면 null */
  texture: string | null
  /** 이 재질이 쓰는 인덱스 수 (면 수 × 3) */
  indexCount: number
}

interface MmdBone {
  name: string
  parent: number
  position: [number, number, number]
  /** 사용자가 고를 관절이 아님 (IK·보조·숨김 뼈) */
  hidden: boolean
  /** 축이 고정된 비틀기 뼈. IK로 굽힐 때는 건너뛴다. */
  twist: boolean
  inherit: { parent: number; weight: number; rotate: boolean; translate: boolean } | null
  /** 付与 계산 순서 (PMX 변형 계층) */
  level: number
}

export interface MmdModel {
  name: string
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  skinIndices: Uint16Array
  skinWeights: Float32Array
  indices: Uint32Array
  materials: MmdMaterial[]
  bones: MmdBone[]
}

class Reader {
  private readonly view: DataView
  private readonly bytes: Uint8Array
  offset = 0

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer)
    this.bytes = new Uint8Array(buffer)
  }

  u8() { return this.view.getUint8(this.offset++) }
  i8() { return this.view.getInt8(this.offset++) }
  u16() { const v = this.view.getUint16(this.offset, true); this.offset += 2; return v }
  i16() { const v = this.view.getInt16(this.offset, true); this.offset += 2; return v }
  u32() { const v = this.view.getUint32(this.offset, true); this.offset += 4; return v }
  i32() { const v = this.view.getInt32(this.offset, true); this.offset += 4; return v }
  f32() { const v = this.view.getFloat32(this.offset, true); this.offset += 4; return v }
  skip(n: number) { this.offset += n }

  slice(n: number) {
    if (n < 0 || this.offset + n > this.bytes.length) throw new RangeError('unexpected end of file')
    const s = this.bytes.subarray(this.offset, this.offset + n)
    this.offset += n
    return s
  }

  /** 개수 필드. 남은 바이트로 불가능한 값이면 손상된 파일로 본다. */
  count(raw: number, minBytesEach: number) {
    if (raw < 0 || raw * minBytesEach > this.bytes.length - this.offset) throw new RangeError(`invalid count ${raw}`)
    return raw
  }
}

const sjis = new TextDecoder('shift_jis')

/** PMD의 고정 길이 Shift-JIS 문자열 (NUL에서 끝난다) */
function fixedSjis(r: Reader, length: number) {
  const raw = r.slice(length)
  const end = raw.indexOf(0)
  return sjis.decode(end < 0 ? raw : raw.subarray(0, end)).trim()
}

const magicOf = (buffer: ArrayBuffer, n: number) => String.fromCharCode(...new Uint8Array(buffer, 0, Math.min(n, buffer.byteLength)))

export function parseMmd(buffer: ArrayBuffer, format: 'pmd' | 'pmx'): MmdModel {
  const magic = magicOf(buffer, 4)
  if (format === 'pmd' && magic.startsWith('Pmd')) return parsePmd(buffer)
  if (format === 'pmx' && magic === 'PMX ') return parsePmx(buffer)
  // 확장자가 틀린 파일도 내용으로 알아본다.
  if (magic.startsWith('Pmd')) return parsePmd(buffer)
  if (magic === 'PMX ') return parsePmx(buffer)
  throw new Error(`not a ${format.toUpperCase()} file`)
}

/** 텍스처 이름 "tex.bmp*sphere.sph"에서 색 텍스처만 고른다. 스피어맵은 쓰지 않는다. */
function colorTexture(name: string): string | null {
  for (const part of name.split('*')) {
    const p = part.trim()
    if (p && !/\.(sph|spa)$/i.test(p)) return p
  }
  return null
}

/* ───────────────────────── PMD ───────────────────────── */

/** PMD 뼈 종류 중 사용자가 돌릴 관절이 아닌 것: IK, 불명, IK 끝, 숨김, 회전 연동 */
const PMD_HIDDEN_TYPES = new Set([2, 3, 6, 7, 9])
const PMD_TWIST_TYPE = 8

function parsePmd(buffer: ArrayBuffer): MmdModel {
  const r = new Reader(buffer)
  r.skip(3) // "Pmd"
  r.f32() // version
  const name = fixedSjis(r, 20)
  r.skip(256) // comment

  const vertexCount = r.count(r.u32(), 38)
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const skinIndices = new Uint16Array(vertexCount * 4)
  const skinWeights = new Float32Array(vertexCount * 4)
  for (let i = 0; i < vertexCount; i++) {
    for (let k = 0; k < 3; k++) positions[i * 3 + k] = r.f32()
    for (let k = 0; k < 3; k++) normals[i * 3 + k] = r.f32()
    uvs[i * 2] = r.f32()
    uvs[i * 2 + 1] = r.f32()
    skinIndices[i * 4] = r.u16()
    skinIndices[i * 4 + 1] = r.u16()
    const w = Math.min(Math.max(r.u8(), 0), 100) / 100
    skinWeights[i * 4] = w
    skinWeights[i * 4 + 1] = 1 - w
    r.u8() // edge flag
  }

  const indexCount = r.count(r.u32(), 2)
  const indices = new Uint32Array(indexCount)
  for (let i = 0; i < indexCount; i++) indices[i] = r.u16()

  const materialCount = r.count(r.u32(), 70)
  const materials: MmdMaterial[] = []
  for (let i = 0; i < materialCount; i++) {
    const diffuse: [number, number, number, number] = [r.f32(), r.f32(), r.f32(), r.f32()]
    r.f32() // specular power
    r.skip(12) // specular
    const ambient: [number, number, number] = [r.f32(), r.f32(), r.f32()]
    r.u8() // toon index
    r.u8() // edge flag
    const count = r.u32()
    const file = fixedSjis(r, 20)
    // PMD에는 양면 표시 플래그가 없다. 반투명 재질만 양면으로 그리는 것이 MMD의 관례다.
    materials.push({ name: `material${i}`, diffuse, ambient, doubleSided: diffuse[3] < 1, texture: colorTexture(file), indexCount: count })
  }

  const boneCount = r.count(r.u16(), 39)
  const bones: MmdBone[] = []
  for (let i = 0; i < boneCount; i++) {
    const boneName = fixedSjis(r, 20)
    const parent = r.u16()
    r.u16() // tail
    const type = r.u8()
    r.u16() // ik parent
    const position: [number, number, number] = [r.f32(), r.f32(), r.f32()]
    bones.push({
      name: boneName,
      parent: parent === 0xffff ? -1 : parent,
      position,
      hidden: PMD_HIDDEN_TYPES.has(type),
      twist: type === PMD_TWIST_TYPE,
      inherit: null,
      level: 0,
    })
  }
  // 이후(IK·표정·물리 등)는 쓰지 않는다.

  return { name, positions, normals, uvs, skinIndices, skinWeights, indices, materials, bones }
}

/* ───────────────────────── PMX ───────────────────────── */

const PMX_BONE = {
  tailIsBone: 0x0001,
  rotatable: 0x0002,
  movable: 0x0004,
  visible: 0x0008,
  operable: 0x0010,
  ik: 0x0020,
  inheritRotation: 0x0100,
  inheritTranslation: 0x0200,
  fixedAxis: 0x0400,
  localAxis: 0x0800,
  externalParent: 0x2000,
}

function parsePmx(buffer: ArrayBuffer): MmdModel {
  const r = new Reader(buffer)
  r.skip(4) // "PMX "
  r.f32() // version
  const globals = r.slice(r.u8())
  const utf16 = globals[0] === 0
  const extraUv = globals[1] ?? 0
  const vertexSize = globals[2] ?? 4
  const textureSize = globals[3] ?? 4
  const boneSize = globals[5] ?? 4

  const decoder = new TextDecoder(utf16 ? 'utf-16le' : 'utf-8')
  const text = () => decoder.decode(r.slice(r.count(r.i32(), 1))).trim()
  /** 뼈·텍스처 인덱스는 부호 있는 정수 (-1 = 없음) */
  const signedIndex = (size: number) => (size === 1 ? r.i8() : size === 2 ? r.i16() : r.i32())
  /** 정점 인덱스는 1·2바이트일 때 부호 없음 */
  const vertexIndex = () => (vertexSize === 1 ? r.u8() : vertexSize === 2 ? r.u16() : r.i32())
  const boneIndex = () => signedIndex(boneSize)

  const name = text()
  text() // english name
  text() // comment
  text() // english comment

  const vertexCount = r.count(r.i32(), 33)
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const skinIndices = new Uint16Array(vertexCount * 4)
  const skinWeights = new Float32Array(vertexCount * 4)
  const bi = [0, 0, 0, 0]
  const bw = [0, 0, 0, 0]
  for (let i = 0; i < vertexCount; i++) {
    for (let k = 0; k < 3; k++) positions[i * 3 + k] = r.f32()
    for (let k = 0; k < 3; k++) normals[i * 3 + k] = r.f32()
    uvs[i * 2] = r.f32()
    uvs[i * 2 + 1] = r.f32()
    r.skip(extraUv * 16)
    bi.fill(-1)
    bw.fill(0)
    const type = r.u8()
    switch (type) {
      case 0: // BDEF1
        bi[0] = boneIndex()
        bw[0] = 1
        break
      case 1: // BDEF2
      case 3: { // SDEF (BDEF2로 근사)
        bi[0] = boneIndex()
        bi[1] = boneIndex()
        const w = r.f32()
        bw[0] = w
        bw[1] = 1 - w
        if (type === 3) r.skip(36) // C, R0, R1
        break
      }
      case 2: // BDEF4
      case 4: // QDEF (BDEF4로 근사)
        for (let k = 0; k < 4; k++) bi[k] = boneIndex()
        for (let k = 0; k < 4; k++) bw[k] = r.f32()
        break
      default:
        throw new Error(`unknown weight type ${type}`)
    }
    r.f32() // edge scale
    let sum = 0
    for (let k = 0; k < 4; k++) {
      if (bi[k] < 0) bw[k] = 0
      sum += bw[k]
    }
    for (let k = 0; k < 4; k++) {
      skinIndices[i * 4 + k] = Math.max(bi[k], 0)
      skinWeights[i * 4 + k] = sum > 0 ? bw[k] / sum : k === 0 ? 1 : 0
    }
  }

  const indexCount = r.count(r.i32(), vertexSize)
  const indices = new Uint32Array(indexCount)
  for (let i = 0; i < indexCount; i++) indices[i] = vertexIndex()

  const textureCount = r.count(r.i32(), 4)
  const textures: string[] = []
  for (let i = 0; i < textureCount; i++) textures.push(text())

  const materialCount = r.count(r.i32(), 60)
  const materials: MmdMaterial[] = []
  for (let i = 0; i < materialCount; i++) {
    const materialName = text()
    text() // english name
    const diffuse: [number, number, number, number] = [r.f32(), r.f32(), r.f32(), r.f32()]
    r.skip(12) // specular
    r.f32() // specular power
    const ambient: [number, number, number] = [r.f32(), r.f32(), r.f32()]
    const flags = r.u8()
    r.skip(16) // edge color
    r.f32() // edge size
    const textureIndex = signedIndex(textureSize)
    signedIndex(textureSize) // sphere texture
    r.u8() // sphere mode
    const sharedToon = r.u8()
    if (sharedToon === 0) signedIndex(textureSize)
    else r.u8()
    text() // memo
    const count = r.i32()
    const file = textureIndex >= 0 && textureIndex < textures.length ? textures[textureIndex] : ''
    materials.push({
      name: materialName || `material${i}`,
      diffuse,
      ambient,
      doubleSided: (flags & 0x01) !== 0,
      texture: file ? colorTexture(file) : null,
      indexCount: count,
    })
  }

  const boneCount = r.count(r.i32(), 20)
  const bones: MmdBone[] = []
  for (let i = 0; i < boneCount; i++) {
    const boneName = text()
    text() // english name
    const position: [number, number, number] = [r.f32(), r.f32(), r.f32()]
    const parent = boneIndex()
    const level = r.i32()
    const flags = r.u16()
    if (flags & PMX_BONE.tailIsBone) boneIndex()
    else r.skip(12)
    let inherit: MmdBone['inherit'] = null
    if (flags & (PMX_BONE.inheritRotation | PMX_BONE.inheritTranslation)) {
      const source = boneIndex()
      const weight = r.f32()
      inherit = {
        parent: source,
        weight,
        rotate: (flags & PMX_BONE.inheritRotation) !== 0,
        translate: (flags & PMX_BONE.inheritTranslation) !== 0,
      }
    }
    if (flags & PMX_BONE.fixedAxis) r.skip(12)
    if (flags & PMX_BONE.localAxis) r.skip(24)
    if (flags & PMX_BONE.externalParent) r.i32()
    if (flags & PMX_BONE.ik) {
      boneIndex() // target
      r.i32() // loop count
      r.f32() // limit angle
      const links = r.count(r.i32(), 2)
      for (let k = 0; k < links; k++) {
        boneIndex()
        if (r.u8()) r.skip(24)
      }
    }
    const canPose = (flags & (PMX_BONE.rotatable | PMX_BONE.movable)) !== 0
    bones.push({
      name: boneName,
      parent,
      position,
      hidden: !(flags & PMX_BONE.visible) || !(flags & PMX_BONE.operable) || (flags & PMX_BONE.ik) !== 0 || !canPose,
      twist: (flags & PMX_BONE.fixedAxis) !== 0,
      inherit,
      level,
    })
  }
  // 이후(표정·표시 틀·물리)는 쓰지 않는다.

  return { name, positions, normals, uvs, skinIndices, skinWeights, indices, materials, bones }
}

/* ───────────────────────── Three.js 메시 ───────────────────────── */

export interface BuildOptions {
  /** 모델 폴더의 URL (끝이 폴더 구분자). 없으면 텍스처를 읽지 않는다. */
  resourcePath?: string
}

/**
 * 파싱한 모델을 SkinnedMesh로 만든다.
 * MMD는 왼손 좌표계라 z를 뒤집고 삼각형 방향을 바꾼다.
 */
export async function buildMmd(model: MmdModel, options: BuildOptions = {}): Promise<THREE.Object3D> {
  const positions = model.positions.slice()
  const normals = model.normals.slice()
  for (let i = 2; i < positions.length; i += 3) {
    positions[i] = -positions[i]
    normals[i] = -normals[i]
  }
  const uvs = model.uvs.slice()
  for (let i = 1; i < uvs.length; i += 2) uvs[i] = 1 - uvs[i]

  const vertexCount = positions.length / 3
  const indices = model.indices.slice()
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const t = indices[i + 1]
    indices[i + 1] = indices[i + 2]
    indices[i + 2] = t
  }
  for (const index of indices) if (index >= vertexCount) throw new Error(`vertex index ${index} out of range`)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(new THREE.BufferAttribute(vertexCount > 65535 ? indices : new Uint16Array(indices), 1))

  let start = 0
  model.materials.forEach((m, i) => {
    const count = Math.min(m.indexCount, indices.length - start)
    if (count > 0) geometry.addGroup(start, count, i)
    start += Math.max(count, 0)
  })

  const materials = await buildMaterials(model.materials, options.resourcePath)

  const boneCount = model.bones.length
  if (boneCount === 0) {
    const mesh = new THREE.Mesh(geometry, materials)
    mesh.name = model.name
    return mesh
  }

  for (let i = 0; i < model.skinIndices.length; i++) {
    if (model.skinIndices[i] >= boneCount) {
      model.skinIndices[i] = 0
      model.skinWeights[i] = 0
    }
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(model.skinIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(model.skinWeights, 4))

  const mesh = new THREE.SkinnedMesh(geometry, materials)
  mesh.name = model.name

  const bones = model.bones.map((b) => {
    const bone = new THREE.Bone()
    bone.name = b.name
    bone.userData.poseHidden = b.hidden
    bone.userData.poseIkSkip = b.twist
    return bone
  })
  const validParent = (i: number) => {
    // 범위 밖이거나 자기 자신·순환을 가리키면 최상위로 둔다.
    let p = model.bones[i].parent
    for (let guard = 0; p >= 0 && p < boneCount && guard < boneCount; guard++) {
      if (p === i) return -1
      p = model.bones[p].parent
    }
    const parent = model.bones[i].parent
    const chainEnds = p < 0 || p >= boneCount
    return parent >= 0 && parent < boneCount && chainEnds ? parent : -1
  }
  model.bones.forEach((b, i) => {
    const parent = validParent(i)
    const [x, y, z] = b.position
    if (parent < 0) {
      bones[i].position.set(x, y, -z)
      mesh.add(bones[i])
    } else {
      const [px, py, pz] = model.bones[parent].position
      bones[i].position.set(x - px, y - py, -(z - pz))
      bones[parent].add(bones[i])
    }
  })

  mesh.bind(new THREE.Skeleton(bones))

  // 付与: 변형 계층 → 뼈 순서로 적용한다. 사용자가 직접 돌리는 관절은 연결하지 않는다.
  const links: BoneLink[] = model.bones
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.inherit && b.hidden && b.inherit.weight !== 0 && b.inherit.parent >= 0 && b.inherit.parent < boneCount)
    .sort((a, b) => a.b.level - b.b.level || a.i - b.i)
    .map(({ b, i }) => ({
      target: bones[i],
      source: bones[b.inherit!.parent],
      weight: b.inherit!.weight,
      rotate: b.inherit!.rotate,
      translate: b.inherit!.translate,
    }))
    .filter((l) => l.target !== l.source)

  const root = new THREE.Group()
  root.name = model.name
  root.add(mesh)
  setBoneLinks(root, links)
  return root
}

async function buildMaterials(list: MmdMaterial[], resourcePath?: string) {
  const cache = new Map<string, Promise<THREE.Texture | null>>()
  const load = (file: string) => {
    const key = file.toLowerCase()
    let p = cache.get(key)
    if (!p) {
      p = loadTexture(file, resourcePath)
      cache.set(key, p)
    }
    return p
  }

  return Promise.all(
    list.map(async (m) => {
      const map = m.texture && resourcePath ? await load(m.texture) : null
      const [dr, dg, db, alpha] = m.diffuse
      const [ar, ag, ab] = m.ambient
      // MMD는 텍스처 색에 (확산 + 환경)을 곱해 거의 원색으로 보인다. 텍스처가 없으면 확산색을 쓴다.
      const color = map
        ? new THREE.Color(Math.min(dr + ar, 1), Math.min(dg + ag, 1), Math.min(db + ab, 1))
        : new THREE.Color(dr, dg, db)
      const hasAlphaTexture = !!map && !!m.texture && /\.(png|tga)$/i.test(m.texture)
      const material = new THREE.MeshStandardMaterial({
        name: m.name,
        color,
        map,
        roughness: 0.8,
        side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        opacity: alpha,
        transparent: alpha < 1 || hasAlphaTexture,
        // 머리카락·속눈썹처럼 투명한 부분은 버려 정렬 문제를 줄인다.
        alphaTest: hasAlphaTexture ? 0.05 : 0,
      })
      material.color.convertSRGBToLinear()
      return material
    }),
  )
}

/** 상대 경로를 모델 폴더 URL에 붙인다. 구분자 \와 /를 모두 받는다. */
export function textureUrl(resourcePath: string, file: string) {
  return resourcePath + file.split(/[\\/]/).filter(Boolean).map(encodeURIComponent).join('/')
}

async function loadTexture(file: string, resourcePath?: string): Promise<THREE.Texture | null> {
  if (!resourcePath) return null
  const url = textureUrl(resourcePath, file)
  try {
    let texture: THREE.Texture
    if (/\.tga$/i.test(file)) {
      const { TGALoader } = await import('three/examples/jsm/loaders/TGALoader.js')
      texture = await new TGALoader().loadAsync(url)
    } else {
      texture = await new THREE.TextureLoader().loadAsync(url)
    }
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  } catch (err) {
    // 텍스처 하나가 없어도 모델은 열리게 한다.
    console.warn(`[mmd] texture not loaded: ${file}`, err)
    return null
  }
}
