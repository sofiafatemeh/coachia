// Single-user profile defaults.
export const DEFAULT_HEIGHT_CM = 174
export const DEFAULT_GENDER: 'male' | 'female' = 'male'
export const BIRTH_DATE = '1981-04-28' // 28 April 1981

/** Age in whole years from a birth date (defaults to the owner's DOB). */
export function currentAge(dob: string = BIRTH_DATE): number {
  const b = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}
