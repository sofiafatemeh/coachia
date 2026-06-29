import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...\n')

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'crypton@coach.ai' },
    update: {},
    create: {
      email: 'crypton@coach.ai',
      name: 'Crypton'
    }
  })
  console.log('✅ Created user:', user.email)

  // Create measurements
  const measurements = []
  for (let i = 0; i < 5; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (i * 7)) // Weekly measurements

    const measurement = await prisma.measurement.create({
      data: {
        userId: user.id,
        weight: 85 - (i * 0.5), // Weight trending down
        bodyFat: 18 - (i * 0.3),
        muscleMass: 38 + (i * 0.2),
        bmi: 26.5 - (i * 0.1),
        bodyScoreData: {
          score: 75 + i,
          recommendations: ['Increase protein', 'Add cardio']
        }
      }
    })
    measurements.push(measurement)
  }
  console.log(`✅ Created ${measurements.length} measurements`)

  // Create workouts
  const workouts = []
  const workoutTypes = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Full Body']

  for (let i = 0; i < 5; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (i * 3))

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        name: workoutTypes[i % workoutTypes.length],
        description: `${workoutTypes[i % workoutTypes.length]} - Week ${i + 1}`,
        duration: 45 + (i * 5),
        calories: 300 + (i * 20),
        volume: 2500 + (i * 100),
        completedAt: date,
        exercises: {
          create: [
            {
              name: 'Bench Press',
              sets: {
                create: [
                  { reps: 8, weight: 80, rpe: 7 },
                  { reps: 8, weight: 80, rpe: 8 },
                  { reps: 6, weight: 85, rpe: 9 }
                ]
              }
            },
            {
              name: 'Overhead Press',
              sets: {
                create: [
                  { reps: 10, weight: 40, rpe: 7 },
                  { reps: 10, weight: 40, rpe: 8 }
                ]
              }
            },
            {
              name: 'Tricep Dips',
              sets: {
                create: [
                  { reps: 12, weight: 0, rpe: 7 },
                  { reps: 12, weight: 0, rpe: 8 }
                ]
              }
            }
          ]
        }
      }
    })
    workouts.push(workout)
  }
  console.log(`✅ Created ${workouts.length} workouts`)

  // Create meals
  const meals = []
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
  const mealNames = [
    ['Oatmeal with protein', 'Protein pancakes', 'Egg omelette'],
    ['Grilled chicken salad', 'Salmon with rice', 'Turkey wrap'],
    ['Steak with vegetables', 'Pasta with bolognese', 'Grilled fish'],
    ['Protein shake', 'Almonds', 'Greek yogurt']
  ]

  for (let day = 0; day < 3; day++) {
    const date = new Date()
    date.setDate(date.getDate() - day)

    for (let i = 0; i < mealTypes.length; i++) {
      const mealDate = new Date(date)
      mealDate.setHours(8 + (i * 4), 0, 0, 0)

      const meal = await prisma.meal.create({
        data: {
          userId: user.id,
          name: mealNames[i][day % mealNames[i].length],
          type: mealTypes[i],
          time: mealDate,
          calories: 400 + (i * 100),
          protein: 25 + (i * 10),
          carbs: 30 + (i * 15),
          fats: 10 + (i * 5),
          fiber: i === 1 ? 5 : 3,
          sugar: i === 0 ? 15 : 5
        }
      })
      meals.push(meal)
    }
  }
  console.log(`✅ Created ${meals.length} meals`)

  console.log('\n🎉 Seeding complete!')
  console.log(`\n📊 Summary:`)
  console.log(`   - Users: 1`)
  console.log(`   - Measurements: ${measurements.length}`)
  console.log(`   - Workouts: ${workouts.length}`)
  console.log(`   - Meals: ${meals.length}`)
  console.log(`   - Exercises: created with workouts`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })