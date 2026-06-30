// Hevy API Client
// https://api.hevyapp.com/docs

const HEVY_API_URL = 'https://api.hevyapp.com/v1'

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
      throw new Error(`Hevy API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // WORKOUTS
  async getWorkouts(options?: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.pageSize) params.append('page_size', options.pageSize.toString())
    if (options?.startDate) params.append('start_date', options.startDate)
    if (options?.endDate) params.append('end_date', options.endDate)

    const endpoint = params.toString() ? `/workouts?${params}` : '/workouts'
    return this.request<HevyWorkoutsResponse>(endpoint)
  }

  async getWorkoutById(id: string) {
    return this.request<HevyWorkout>(`/workouts/${id}`)
  }

  // EXERCISES
  async getExercises() {
    return this.request<HevyExercisesResponse>('/exercises')
  }

  async getExerciseById(id: string) {
    return this.request<HevyExercise>(`/exercises/${id}`)
  }

  // BODYWEIGHT
  async getBodyweight() {
    return this.request<HevyBodyweightResponse>('/bodyweight')
  }

  // USER
  async getUser() {
    return this.request<HevyUser>('/user')
  }
}

// TYPES
export interface HevyWorkoutsResponse {
  workouts: HevyWorkout[]
  total_count: number
  page: number
  page_size: number
}

export interface HevyWorkout {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  exercises: HevyExercise[]
  comment?: string
  is_template: boolean
}

export interface HevyExercise {
  id: string
  workout_id: string
  exercise_template_id: string
  exercise_template: HevyExerciseTemplate
  sets: HevySet[]
  supersets: number[]
  index: number
}

export interface HevyExerciseTemplate {
  id: string
  name: string
  description?: string
  exercise_base_id: string
}

export interface HevySet {
  id: string
  exercise_id: string
  set_type: 'normal' | 'drop' | 'failure' | 'warmup'
  weight_kg: number
  reps: number
  distance_meters?: number
  duration_seconds?: number
  rpe?: number
  one_rm?: number
  is_to_failure?: boolean
  is_warmup?: boolean
  is_drop_set?: boolean
  created_at: string
}

export interface HevyExercisesResponse {
  exercises: HevyExerciseTemplate[]
  total_count: number
}

export interface HevyExercise {
  id: string
  name: string
  description?: string
  exercise_base_id: string
}

export interface HevyBodyweightResponse {
  bodyweight: HevyBodyweight[]
}

export interface HevyBodyweight {
  id: string
  weight_kg: number
  date: string
}

export interface HevyUser {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  height_cm?: number
  weight_kg?: number
  gender?: 'male' | 'female'
  created_at: string
}

// Initialize client
export const getHevyClient = () => {
  const apiKey = process.env.HEVY_API_KEY
  if (!apiKey) {
    throw new Error('HEVY_API_KEY not found in environment variables')
  }
  return new HevyClient(apiKey)
}