import { describe, expect, it } from 'vitest'
import {
  CreateEstimateValueSchema,
  EstimateModelSchema,
  EstimateSystemSchema,
  ReorderEstimateValuesSchema,
  UpdateEstimateSettingsSchema,
  UpdateEstimateValueSchema,
} from '../estimate.schema'

describe('EstimateSystemSchema / EstimateModelSchema', () => {
  it('accepts every declared system', () => {
    for (const system of ['POINTS', 'CATEGORIES', 'TIME']) {
      expect(EstimateSystemSchema.safeParse(system).success).toBe(true)
    }
  })

  it('accepts every declared model', () => {
    for (const model of [
      'FIBONACCI',
      'LINEAR',
      'SQUARES',
      'T_SHIRT_SIZES',
      'EASY_TO_HARD',
      'HOURS',
    ]) {
      expect(EstimateModelSchema.safeParse(model).success).toBe(true)
    }
  })

  it('rejects an unknown system', () => {
    expect(EstimateSystemSchema.safeParse('WEIGHT').success).toBe(false)
  })
})

describe('UpdateEstimateSettingsSchema', () => {
  it('accepts a model compatible with its system', () => {
    expect(
      UpdateEstimateSettingsSchema.safeParse({
        system: 'POINTS',
        model: 'FIBONACCI',
      }).success,
    ).toBe(true)
  })

  it('accepts every compatible system/model pair', () => {
    const pairs: [string, string][] = [
      ['POINTS', 'LINEAR'],
      ['POINTS', 'SQUARES'],
      ['CATEGORIES', 'T_SHIRT_SIZES'],
      ['CATEGORIES', 'EASY_TO_HARD'],
      ['TIME', 'HOURS'],
    ]
    for (const [system, model] of pairs) {
      expect(
        UpdateEstimateSettingsSchema.safeParse({ system, model }).success,
      ).toBe(true)
    }
  })

  it('rejects a model incompatible with the system', () => {
    const result = UpdateEstimateSettingsSchema.safeParse({
      system: 'TIME',
      model: 'FIBONACCI',
    })
    expect(result.success).toBe(false)
    expect(!result.success && result.error.issues[0].path).toEqual(['model'])
  })
})

describe('CreateEstimateValueSchema / UpdateEstimateValueSchema', () => {
  it('accepts a valid value label', () => {
    expect(CreateEstimateValueSchema.safeParse({ value: '3' }).success).toBe(
      true,
    )
    expect(UpdateEstimateValueSchema.safeParse({ value: 'XL' }).success).toBe(
      true,
    )
  })

  it('rejects an empty value', () => {
    expect(CreateEstimateValueSchema.safeParse({ value: '' }).success).toBe(
      false,
    )
  })

  it('rejects a value longer than 20 characters', () => {
    expect(
      CreateEstimateValueSchema.safeParse({ value: 'x'.repeat(21) }).success,
    ).toBe(false)
  })
})

describe('ReorderEstimateValuesSchema', () => {
  it('accepts a non-empty array of ids', () => {
    expect(
      ReorderEstimateValuesSchema.safeParse({ valueIds: ['a', 'b'] }).success,
    ).toBe(true)
  })

  it('rejects an empty array', () => {
    expect(
      ReorderEstimateValuesSchema.safeParse({ valueIds: [] }).success,
    ).toBe(false)
  })

  it('rejects a missing valueIds field', () => {
    expect(ReorderEstimateValuesSchema.safeParse({}).success).toBe(false)
  })
})
