import { describe, expect, it } from 'vitest';
import { mockProvider } from './mock';

describe('mockProvider', () => {
  it('returns empty array immediately if query is empty or only whitespace', async () => {
    const emptyResult = await mockProvider.search('');
    expect(emptyResult).toEqual([]);

    const whitespaceResult = await mockProvider.search('   ');
    expect(whitespaceResult).toEqual([]);
  });

  it('returns search results matching query', async () => {
    const results = await mockProvider.search('zelda');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain('zelda');
  });

  it('guarantees at least 2 items without coverUrl and 2 without releaseYear in dataset', async () => {
    // Buscar con término general para recuperar catálogo amplio
    const allResults = await mockProvider.search('all');
    const noCovers = allResults.filter((item) => !item.coverUrl);
    const noYears = allResults.filter((item) => item.releaseYear === undefined);

    expect(noCovers.length).toBeGreaterThanOrEqual(2);
    expect(noYears.length).toBeGreaterThanOrEqual(2);
  });
});
