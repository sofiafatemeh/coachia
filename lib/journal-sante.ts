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

export class JournalSanteClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Journal Santé API error: ${response.status} ${response.statusText}`)
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
  async getMeasurements() {
    const data = await this.request<{ measurements: any[] }>('/measurements')
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