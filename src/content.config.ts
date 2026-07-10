import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    cluster: z.enum(['ai-agents-101', 'saas-mvp', 'automation-smes', 'healthcare', 'founder-led']),
    clusterLabel: z.string(),
    keyword: z.string(),
    readingTime: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
