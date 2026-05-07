export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface RoadSegment {
  description: string
  label: string | null
  confidence: string
}

export interface WaterFeature {
  description: string
  confidence: string
}

export interface Landmark {
  name: string | null
  description: string
  confidence: string
}

export interface TerrainRegion {
  description: string
  confidence: string
}

/** Structured sketch interpretation returned by Claude /api/interpret */
export interface SketchInterpretation {
  orientation: string
  roads: RoadSegment[]
  water: WaterFeature[]
  landmarks: Landmark[]
  terrain: TerrainRegion[]
  labels: string[]
  overall_confidence: string
  notes: string
}
