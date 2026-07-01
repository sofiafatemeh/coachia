// Hevy API Client
// Public API v1 — https://api.hevyapp.com/docs/
// Auth: `api-key` header. All list endpoints are paginated and return
// { page, page_count, <items> }. Max pageSize is 10 for workouts / events /
// body_measurements (100 for exercise_templates). There is NO date filter on
// /workouts — use /workouts/events?since=... to fetch changes since a date.

const HEVY_API_URL = 'https://api.hevyapp.com/v1'

const MAX_PAGE_SIZE = 10

export class HevyClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${HEVY_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Hevy API error: ${response.status} ${response.statusText} ${body}`.trim())
    }

    return response.json()
  }

  // WORKOUTS

  async getWorkouts(options?: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      pageSize: String(Math.min(options?.pageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE)),
    })
    return this.request<HevyWorkoutsResponse>(`/workouts?${params}`)
  }

  /** Fetch every workout by walking all pages. */
  async getAllWorkouts(): Promise<HevyWorkout[]> {
    const first = await this.getWorkouts({ page: 1 })
    const all = [...first.workouts]
    for (let page = 2; page <= first.page_count; page++) {
      const next = await this.getWorkouts({ page })
      all.push(...next.workouts)
    }
    return all
  }

  async getWorkoutById(id: string) {
    return this.request<HevyWorkout>(`/workouts/${id}`)
  }

  async getWorkoutCount() {
    return this.request<{ workout_count: number }>('/workouts/count')
  }

  /** Workouts created/updated/deleted since an ISO-8601 timestamp. */
  async getWorkoutEvents(options?: { page?: number; pageSize?: number; since?: string }) {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      pageSize: String(Math.min(options?.pageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE)),
      since: options?.since ?? '1970-01-01T00:00:00Z',
    })
    return this.request<HevyWorkoutEventsResponse>(`/workouts/events?${params}`)
  }

  /** All non-deleted workouts updated since a timestamp (walks all event pages). */
  async getWorkoutsSince(sinceISO: string): Promise<HevyWorkout[]> {
    const workouts: HevyWorkout[] = []
    const first = await this.getWorkoutEvents({ page: 1, since: sinceISO })
    const collect = (events: HevyWorkoutEvent[]) => {
      for (const ev of events) {
        if (ev.type === 'updated' && ev.workout) workouts.push(ev.workout)
      }
    }
    collect(first.events)
    for (let page = 2; page <= first.page_count; page++) {
      const next = await this.getWorkoutEvents({ page, since: sinceISO })
      collect(next.events)
    }
    return workouts
  }

  // EXERCISE TEMPLATES

  async getExerciseTemplates(options?: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      pageSize: String(Math.min(options?.pageSize ?? 100, 100)),
    })
    return this.request<HevyExerciseTemplatesResponse>(`/exercise_templates?${params}`)
  }

  async getExerciseTemplateById(id: string) {
    return this.request<HevyExerciseTemplate>(`/exercise_templates/${id}`)
  }

  // BODY MEASUREMENTS (real weigh-ins + circumferences logged in Hevy)

  async getBodyMeasurements(options?: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      pageSize: String(Math.min(options?.pageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE)),
    })
    return this.request<HevyBodyMeasurementsResponse>(`/body_measurements?${params}`)
  }

  async getAllBodyMeasurements(): Promise<HevyBodyMeasurement[]> {
    const first = await this.getBodyMeasurements({ page: 1 })
    const all = [...first.body_measurements]
    for (let page = 2; page <= first.page_count; page++) {
      const next = await this.getBodyMeasurements({ page })
      all.push(...next.body_measurements)
    }
    return all
  }

  // USER

  async getUserInfo() {
    return this.request<HevyUserInfoResponse>('/user/info')
  }
}

// TYPES (match the Hevy OpenAPI schema exactly)

export interface HevyWorkoutsResponse {
  page: number
  page_count: number
  workouts: HevyWorkout[]
}

export interface HevyWorkout {
  id: string
  title: string
  routine_id?: string | null
  description?: string | null
  start_time: string
  end_time: string
  updated_at?: string
  created_at?: string
  exercises: HevyExercise[]
}

export interface HevyExercise {
  index: number
  title: string
  notes?: string | null
  exercise_template_id: string
  supersets_id?: number | null
  sets: HevySet[]
}

export interface HevySet {
  index: number
  type: string // normal | warmup | dropset | failure | ...
  weight_kg?: number | null
  reps?: number | null
  distance_meters?: number | null
  duration_seconds?: number | null
  rpe?: number | null
  custom_metric?: number | null
}

export interface HevyWorkoutEventsResponse {
  page: number
  page_count: number
  events: HevyWorkoutEvent[]
}

export interface HevyWorkoutEvent {
  type: 'updated' | 'deleted'
  workout?: HevyWorkout // present when type === 'updated'
  id?: string // present when type === 'deleted'
  deleted_at?: string
}

export interface HevyExerciseTemplatesResponse {
  page: number
  page_count: number
  exercise_templates: HevyExerciseTemplate[]
}

export interface HevyExerciseTemplate {
  id: string
  title: string
  type: string
  primary_muscle_group: string
  secondary_muscle_groups: string[]
  is_custom: boolean
}

export interface HevyBodyMeasurementsResponse {
  page: number
  page_count: number
  body_measurements: HevyBodyMeasurement[]
}

export interface HevyBodyMeasurement {
  date: string
  weight_kg?: number | null
  lean_mass_kg?: number | null
  fat_percent?: number | null
  neck_cm?: number | null
  shoulder_cm?: number | null
  chest_cm?: number | null
  left_bicep_cm?: number | null
  right_bicep_cm?: number | null
  left_forearm_cm?: number | null
  right_forearm_cm?: number | null
  abdomen?: number | null
  waist?: number | null
  hips?: number | null
  left_thigh?: number | null
  right_thigh?: number | null
  left_calf?: number | null
  right_calf?: number | null
}

export interface HevyUserInfoResponse {
  data: {
    id: string
    name: string
    url: string
  }
}

// Initialize client
export const getHevyClient = () => {
  const apiKey = process.env.HEVY_API_KEY
  if (!apiKey) {
    throw new Error('HEVY_API_KEY not found in environment variables')
  }
  return new HevyClient(apiKey)
}
