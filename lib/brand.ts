/**
 * lib/brand.ts
 * Single source of truth for platform branding in metadata and schema.
 *
 * Driven by NEXT_PUBLIC_PLATFORM_NAME / NEXT_PUBLIC_AI_NAME so the same
 * codebase can be white-labelled per tenant.
 *
 * Page titles must NOT append the platform name themselves — the root layout
 * declares `template: '%s | <PLATFORM_NAME>'`, which Next.js applies to every
 * child page title automatically. Appending it again produces
 * "Product | Zevio Store | Zevio Store".
 */

export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || 'Zevio Store'
export const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || 'Zevio AI'
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://nexastore-eight.vercel.app'
