import type { MetadataRoute } from 'next';
import { urlDelSitio } from '@/lib/seo/sitio';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL('/', urlDelSitio()).href, changeFrequency: 'monthly', priority: 1 }];
}
