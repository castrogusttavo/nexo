export function withTimestamps<T extends { createdAt: Date; updatedAt: Date }>(
  entity: T,
): { createdAt: string; updatedAt: string } {
  return {
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}
