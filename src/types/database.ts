// src/types/database.ts

export type DeliveryScheduleType =
  | 'weekdays_only'        // Sadece Hafta İçi (Pzt - Cum)
  | 'except_sunday'        // Pazar Hariç (Pzt - Cmt)
  | 'every_day_sat_double' // Her Gün (Cumartesi 2 paket - Cumartesi ve Pazar)

export interface MealItem {
  title: string
  desc: string
  kcal: string
}

export interface SampleMenuDay {
  day: string
  meals: MealItem[]
}

export interface DietPackage {
  id: string
  slug: string
  title: string
  short_description: string | null
  full_description: string | null
  daily_base_price: number
  calories_range: string | null
  protein_info: string | null
  meal_count_text: string | null
  cover_image: string | null
  gallery_urls: string[]
  video_url: string | null
  sample_menu_pdf: string | null
  sample_menu_table: SampleMenuDay[]
  min_calorie_target: number | null
  max_calorie_target: number | null
  is_featured: boolean
  is_active: boolean
}

export interface PackageDuration {
  id: number
  days: number
  label: string
  discount_percentage: number
  is_active: boolean
}

export interface City {
  id: number
  name: string
  is_active: boolean
}

export interface District {
  id: number
  city_id: number
  side: 'Anadolu Yakası' | 'Avrupa Yakası' | 'Merkez'
  name: string
  is_active: boolean
  default_daily_fee: number
}

export interface Neighborhood {
  id: number
  district_id: number
  name: string
  is_active: boolean
  custom_daily_fee: number | null
  delivery_order: number
}

export interface AddonProduct {
  id: string
  title: string
  description: string | null
  price: number
  image_url: string | null
  is_active: boolean
}

export interface CalendarBlock {
  id: number
  blocked_date: string // YYYY-MM-DD
  reason: string
  block_type: 'holiday' | 'quota_full'
}