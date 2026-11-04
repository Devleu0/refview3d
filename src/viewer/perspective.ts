import * as THREE from 'three'
import { t } from '../i18n'

/**
 * 투시 가이드 계산과 그리기.
 *
 * 월드 축(X·Y·Z) 방향의 평행선은 화면에서 한 점(소실점)으로 모인다.
 * 카메라 좌표계에서 방향 d의 소실점은 (d.x / -d.z, d.y / -d.z)를 투영한 위치이고,
 * d가 화면과 평행하면(d.z ≈ 0) 소실점이 무한대라 화면에서도 평행선으로 보인다.
 * 화면 안팎에 실제로 모이는 축의 개수가 1·2·3점 투시를 결정한다.
 */

export type Axis = 'x' | 'y' | 'z'

export interface Vanishing {
  axis: Axis
  /** 소실점의 화면 좌표(px). 무한대(평행)면 null */
  point: { x: number; y: number } | null
  /** 화면에서 본 축 방향(단위 벡터). 평행선을 그릴 때 쓴다 */
  direction: { x: number; y: number }
}

export interface PerspectiveGuides {
  vanishing: Vanishing[]
  /** 지평선(눈높이선) a·x + b·y + c = 0 (px). 바로 위·아래를 볼 때는 null */
  horizon: { a: number; b: number; c: number } | null
  /** 모이는 축 개수 (1·2·3점 투시). 0은 이론상 없지만 정사영에 가까운 극단적 망원일 때 */
  points: number
}

const AXES: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
}

export const AXIS_COLORS: Record<Axis, string> = { x: '#e8645a', y: '#6cc46a', z: '#5b9dff' }

/**
 * 소실점이 화면 크기의 이 배수보다 멀면 "사실상 평행"으로 센다.
 * 너무 먼 소실점은 그림에서 평행선으로 다루는 것이 보통이다.
 */
const FAR_FACTOR = 12

export function computeGuides(camera: THREE.PerspectiveCamera, width: number, height: number): PerspectiveGuides {
  const toCamera = camera.quaternion.clone().invert()
  // 화면 1px당 카메라 평면(z = -1) 거리의 역수. 가로·세로가 같다(정사각 픽셀).
  const focal = height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const cx = width / 2
  const cy = height / 2
  const far = FAR_FACTOR * Math.max(width, height)

  const vanishing = (Object.keys(AXES) as Axis[]).map((axis): Vanishing => {
    const d = AXES[axis].clone().applyQuaternion(toCamera)
    const len2d = Math.hypot(d.x, d.y) || 1
    const direction = { x: d.x / len2d, y: -d.y / len2d }
    if (Math.abs(d.z) < 1e-6) return { axis, point: null, direction }
    const point = { x: cx + (focal * d.x) / -d.z, y: cy - (focal * d.y) / -d.z }
    const distance = Math.hypot(point.x - cx, point.y - cy)
    return { axis, point: distance > far ? null : point, direction }
  })

  // 지평선: 카메라를 지나고 바닥과 평행한 평면이 화면과 만나는 선.
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(toCamera)
  // 카메라 평면 위 점 ((px - cx)/f, (cy - py)/f, -1)과 up의 내적이 0인 직선
  const horizon = Math.hypot(up.x, up.y) < 1e-4 ? null : { a: up.x, b: -up.y, c: -up.x * cx + up.y * cy - up.z * focal }

  return { vanishing, horizon, points: vanishing.filter((v) => v.point).length }
}

export interface GuideStyle {
  /** 소실점마다 그을 선 개수 */
  lineCount: number
  opacity: number
  horizon: boolean
  /** 선 굵기·글자 크기 배율 (devicePixelRatio, 내보내기 배율) */
  scale: number
}

/** ctx에 width×height 크기로 투시선·지평선·소실점을 그린다. */
export function drawGuides(ctx: CanvasRenderingContext2D, guides: PerspectiveGuides, width: number, height: number, style: GuideStyle) {
  const { scale } = style
  ctx.save()
  ctx.globalAlpha = style.opacity
  ctx.lineWidth = 1 * scale

  for (const v of guides.vanishing) {
    ctx.strokeStyle = AXIS_COLORS[v.axis]
    ctx.beginPath()
    if (v.point) fanFrom(ctx, v.point, width, height, style.lineCount)
    else parallelLines(ctx, v.direction, width, height, style.lineCount)
    ctx.stroke()
  }

  if (style.horizon && guides.horizon) {
    const segment = clipLine(guides.horizon, width, height)
    if (segment) {
      ctx.globalAlpha = Math.min(1, style.opacity + 0.3)
      ctx.strokeStyle = '#f2c94c'
      ctx.lineWidth = 1.5 * scale
      ctx.setLineDash([8 * scale, 5 * scale])
      ctx.beginPath()
      ctx.moveTo(segment[0].x, segment[0].y)
      ctx.lineTo(segment[1].x, segment[1].y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#f2c94c'
      ctx.font = `${11 * scale}px sans-serif`
      const left = segment[0].x < segment[1].x ? segment[0] : segment[1]
      ctx.fillText(t('perspective.eyeLevel'), left.x + 6 * scale, left.y - 5 * scale)
    }
  }

  // 화면 안에 있는 소실점 표시
  ctx.globalAlpha = 1
  for (const v of guides.vanishing) {
    if (!v.point || v.point.x < 0 || v.point.y < 0 || v.point.x > width || v.point.y > height) continue
    ctx.fillStyle = AXIS_COLORS[v.axis]
    ctx.beginPath()
    ctx.arc(v.point.x, v.point.y, 4 * scale, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** 소실점에서 화면을 덮는 방향으로 부채꼴 선을 긋는다. */
function fanFrom(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, width: number, height: number, count: number) {
  const inside = p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height
  let from = 0
  let span = Math.PI * 2
  if (!inside) {
    // 화면 네 모서리를 보는 각도 범위만 채운다. 각도가 ±π에서 끊기지 않게 가운데 방향 기준으로 잰다.
    const center = Math.atan2(height / 2 - p.y, width / 2 - p.x)
    const offsets = [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ].map(([x, y]) => wrapAngle(Math.atan2(y - p.y, x - p.x) - center))
    from = center + Math.min(...offsets)
    span = Math.max(...offsets) - Math.min(...offsets)
  }
  const reach = Math.hypot(width, height) + Math.hypot(p.x - width / 2, p.y - height / 2)
  const steps = inside ? count : Math.max(count - 1, 1)
  for (let i = 0; i <= steps; i++) {
    if (inside && i === steps) break
    const angle = from + (span * i) / steps
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x + Math.cos(angle) * reach, p.y + Math.sin(angle) * reach)
  }
}

/** 소실점이 무한대인 축은 화면을 가로지르는 평행선으로 긋는다. */
function parallelLines(ctx: CanvasRenderingContext2D, dir: { x: number; y: number }, width: number, height: number, count: number) {
  const normal = { x: -dir.y, y: dir.x }
  const half = Math.hypot(width, height) / 2
  const cx = width / 2
  const cy = height / 2
  for (let i = 0; i <= count; i++) {
    const offset = -half + (2 * half * i) / count
    const ox = cx + normal.x * offset
    const oy = cy + normal.y * offset
    ctx.moveTo(ox - dir.x * half, oy - dir.y * half)
    ctx.lineTo(ox + dir.x * half, oy + dir.y * half)
  }
}

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

/** 직선 a·x + b·y + c = 0을 화면 사각형으로 잘라 두 끝점을 돌려준다. 화면을 지나지 않으면 null */
function clipLine(line: { a: number; b: number; c: number }, width: number, height: number) {
  const { a, b, c } = line
  const points: { x: number; y: number }[] = []
  if (Math.abs(b) > 1e-9) {
    for (const x of [0, width]) {
      const y = -(a * x + c) / b
      if (y >= 0 && y <= height) points.push({ x, y })
    }
  }
  if (Math.abs(a) > 1e-9) {
    for (const y of [0, height]) {
      const x = -(b * y + c) / a
      if (x >= 0 && x <= width) points.push({ x, y })
    }
  }
  return points.length >= 2 ? ([points[0], points[1]] as const) : null
}
