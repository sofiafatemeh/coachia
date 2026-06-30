import prisma from '@/lib/prisma'
import { getJournalClient, type JournalMeal } from '@/lib/journal-sante'

export class JournalSanteSyncService {
  private journal = getJournalClient()

  async syncMeals(options?: { days?: number }) {
    const days = options?.days || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch meals from Journal Santé
    const meals = await this.journal.getMeals()

    // Filter by date
    const filteredMeals = meals.filter(meal => {
      const mealDate = new Date(meal.eatenAt)
      return mealDate >= startDate
    })

    let synced = 0
    let errors = 0

    for (const meal of filteredMeals) {
      try {
        await this.syncMeal(meal)
        synced++
      } catch (error) {
        console.error(`Error syncing meal ${meal.id}:`, error)
        errors++
      }
    }

    return {
      total: filteredMeals.length,
      synced,
      errors,
      message: `Synced ${synced}/${filteredMeals.length} meals from Journal Santé`
    }
  }

  private async syncMeal(journalMeal: JournalMeal) {
    // Check if meal already exists
    const existing = await prisma.meal.findUnique({
      where: { journalId: journalMeal.id }
    })

    if (existing) {
      // Update existing meal
      return await prisma.meal.update({
        where: { id: existing.id },
        data: {
          name: journalMeal.label,
          calories: journalMeal.calories,
          protein: journalMeal.protein,
          carbs: journalMeal.carbs,
          fats: journalMeal.fat,
          fiber: journalMeal.fiber,
          time: new Date(journalMeal.eatenAt)
        }
      })
    }

    // Create new meal
    return await prisma.meal.create({
      data: {
        journalId: journalMeal.id,
        userId: 'system', // TODO: Get from auth
        name: journalMeal.label,
        type: this.determineMealType(new Date(journalMeal.eatenAt)),
        time: new Date(journalMeal.eatenAt),
        calories: journalMeal.calories,
        protein: journalMeal.protein,
        carbs: journalMeal.carbs,
        fats: journalMeal.fat,
        fiber: journalMeal.fiber,
        sugar: null // Not available in Journal Santé
      }
    })
  }

  private determineMealType(date: Date): string {
    const hour = date.getHours()

    if (hour >= 5 && hour < 11) return 'breakfast'
    if (hour >= 11 && hour < 14) return 'lunch'
    if (hour >= 14 && hour < 18) return 'dinner'
    return 'snack'
  }
}

// Singleton instance
let syncService: JournalSanteSyncService

export const getJournalSyncService = () => {
  if (!syncService) {
    syncService = new JournalSanteSyncService()
  }
  return syncService
}