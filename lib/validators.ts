import { CheckoutFormData } from './types'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateCheckoutForm(data: Partial<CheckoutFormData>): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.firstName?.trim()) errors.firstName = 'First name is required'
  if (!data.lastName?.trim()) errors.lastName = 'Last name is required'
  if (!data.email?.trim()) {
    errors.email = 'Email address is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (!data.phone?.trim()) {
    errors.phone = 'Phone number is required'
  } else if (!/^(\+?968)?[279]\d{7}$/.test(data.phone.replace(/\s/g, ''))) {
    errors.phone = 'Enter a valid Oman phone number'
  }
  if (!data.address?.trim()) errors.address = 'Delivery address is required'
  if (!data.city?.trim()) errors.city = 'City is required'
  if (!data.governorate?.trim()) errors.governorate = 'Governorate is required'

  return { valid: Object.keys(errors).length === 0, errors }
}

export const OMAN_GOVERNORATES = [
  'Muscat',
  'Dhofar',
  'Musandam',
  'Al Buraymi',
  'Al Batinah North',
  'Al Batinah South',
  'Al Dakhliyah',
  'Al Sharqiyah North',
  'Al Sharqiyah South',
  'Al Dhahirah',
  'Al Wusta',
]
