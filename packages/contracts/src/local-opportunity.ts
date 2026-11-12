import { z } from 'zod';

export const LOCAL_OPPORTUNITY_EXAMPLE = 'Computer repair services targeting students and young professionals in Sydney.';
export const SydneyAreaId = z.enum(['haymarket', 'burwood-nsw', 'chatswood']);
export const SYDNEY_AREAS = {
  haymarket: { name: 'Haymarket', sourceId: 'SAL11884' },
  'burwood-nsw': { name: 'Burwood (NSW)', sourceId: 'SAL10716' },
  chatswood: { name: 'Chatswood', sourceId: 'SAL10891' },
} as const;

export const LocalGeography = z.object({
  name: z.string().trim().min(1).max(150),
  country: z.literal('AU'),
  state: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']),
  type: z.enum(['locality', 'sa2', 'lga', 'state', 'metropolitan']),
  coordinates: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict().optional(),
  mapping: z.discriminatedUnion('status', [
    z.object({ status: z.literal('verified'), sourceId: z.string().min(1), datasetVersion: z.string().min(1) }).strict(),
    z.object({ status: z.literal('unresolved'), limitation: z.string().min(1) }).strict(),
  ]),
}).strict();

export const LocalOpportunityInput = z.object({
  category: z.literal('computer_repair'),
  primaryMarket: z.literal('sydney-nsw'),
  areaIds: z.array(SydneyAreaId).min(1).max(3).refine(ids => new Set(ids).size === ids.length, 'Select distinct locations'),
  budgetAud: z.number().int().nonnegative().safe().optional(),
}).strict();

export const LocalOpportunityComparison = z.object({
  input: LocalOpportunityInput,
  areas: z.array(z.object({
    id: SydneyAreaId,
    location: LocalGeography,
    evidenceIds: z.array(z.uuid()),
  }).strict()).min(1).max(3),
}).strict();

export type LocalOpportunityInput = z.infer<typeof LocalOpportunityInput>;
export type LocalOpportunityComparison = z.infer<typeof LocalOpportunityComparison>;
export type LocalGeography = z.infer<typeof LocalGeography>;
