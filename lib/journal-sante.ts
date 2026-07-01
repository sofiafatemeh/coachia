// Journal Santé API Client
// Base URL: http://localhost:3000/api/meals (ou URL distante)

export interface JournalMeal {
  id: string
  eatenAt: string
  label: string
  source: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  confidence?: number
  notes?: string
}

export interface JournalMealsResponse {
  meals: JournalMeal[]
}

export interface JournalMeasurement {
  id: string
  measuredAt: string
  weightKg?: number | null
  waistCm?: number | null
  thighCm?: number | null
  neckCm?: number | null
  bicepsCm?: number | null
  notes?: string | null
}

export class JournalSanteClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    let u = (baseUrl || '').trim()
    if (u && !/^https?:\/\//i.test(u)) u = `https://${u}` // tolerate a missing scheme
    this.baseUrl = u.replace(/\/$/, '') // strip trailing slash
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const secret = process.env.JOURNAL_SANTE_SECRET
    let response: Response
    try {
      response = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
          ...options?.headers,
        },
      })
    } catch (err) {
      // Surface the URL we tried so config mistakes (localhost default, missing
      // scheme, wrong domain) are obvious instead of a bare "fetch failed".
      throw new Error(
        `Impossible de joindre Journal Santé à ${url} — vérifie JOURNAL_SANTE_API_URL (doit finir par /api) et le redéploiement. Détail: ${err instanceof Error ? err.message : 'fetch failed'}`
      )
    }

    if (!response.ok) {
      throw new Error(`Journal Santé API error: ${response.status} ${response.statusText} (${url})`)
    }

    return response.json()
  }

  // MEALS
  async getMeals() {
    const data = await this.request<JournalMealsResponse>('/meals')
    return data.meals
  }

  async getMealById(id: string) {
    const data = await this.request<{ meal: JournalMeal }>(`/meals/${id}`)
    return data.meal
  }

  async createMeal(meal: Omit<JournalMeal, 'id' | 'eatenAt'>) {
    const data = await this.request<{ meal: JournalMeal }>('/meals', {
      method: 'POST',
      body: JSON.stringify(meal),
    })
    return data.meal
  }

  // MEASUREMENTS
  async getMeasurements(): Promise<JournalMeasurement[]> {
    const data = await this.request<{ measurements: JournalMeasurement[] }>('/measurements')
    return data.measurements
  }

  // ACTIVITIES
  async getActivities() {
    const data = await this.request<{ activities: any[] }>('/activity')
    return data.activities
  }

  // SUPPLEMENTS
  async getSupplements() {
    const data = await this.request<{ supplements: any[] }>('/supplements')
    return data.supplements
  }
}

// Initialize client
export const getJournalClient = () => {
  // Use environment variable or default localhost
  const baseUrl = process.env.JOURNAL_SANTE_API_URL || 'http://localhost:3000/api'
  return new JournalSanteClient(baseUrl)
}