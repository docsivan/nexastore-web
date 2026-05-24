import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/coming-soon',
      disallow: ['/api/', '/admin/', '/dashboard/'],
    },
    sitemap: 'https://nexastore.io/sitemap.xml',
  }
}
