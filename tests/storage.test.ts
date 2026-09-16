// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { attachContentCache, initialState, splitContentCache, type State } from '../src/model';

function stateWithContent(): State {
  return initialState({
    readLater: ['e1'],
    subscriptions: [{ id: 'local:s1', url: 'https://example.com/feed', name: 's1', group: 'g', entries: [
      { id: 'e1', sourceId: 'local:s1', title: 't1', content: '<p>body-one</p>' },
      { id: 'e2', sourceId: 'local:s1', title: 't2' },
    ], updatedAt: 1, error: '' }],
    channelStates: { k: { entries: [{ id: 'e1', sourceId: 'local:s1', title: 't1', content: '<p>body-one</p>' }], bundle: null, mode: 'original', filter: 'all', query: '', unread: [], cursor: '', hasMore: false, listTop: 0, readerTop: 0, articlePending: false } },
  });
}

describe('content-cache split', () => {
  it('defaults readLater to empty and accepts the later filter', () => {
    const fresh = initialState(null);
    expect(fresh.readLater).toEqual([]);
    const later = initialState({ channelStates: { k: { entries: [], bundle: null, mode: 'original', filter: 'later', query: '', unread: [], cursor: '', hasMore: false, listTop: 0, readerTop: 0, articlePending: false } } });
    expect(later.channelStates.k.filter).toBe('later');
  });
  it('moves bodies out of the persisted state and restores them by id', () => {
    const state = stateWithContent();
    const { slim, cache } = splitContentCache(state);
    expect(cache).toEqual({ e1: '<p>body-one</p>' });
    // Slim state carries no body: subscriptions + channelStates both stripped.
    expect(slim.subscriptions[0].entries[0].content).toBeUndefined();
    expect(slim.channelStates.k.entries[0].content).toBeUndefined();
    // Original in-memory state untouched.
    expect(state.subscriptions[0].entries[0].content).toBe('<p>body-one</p>');
    // Slim state round-trips through JSON and rehydrates.
    const revived = initialState(JSON.parse(JSON.stringify(slim)));
    attachContentCache(revived, cache);
    expect(revived.subscriptions[0].entries[0].content).toBe('<p>body-one</p>');
    expect(revived.channelStates.k.entries[0].content).toBe('<p>body-one</p>');
    // Missing cache entries leave metadata intact.
    const bare = initialState(JSON.parse(JSON.stringify(slim)));
    attachContentCache(bare, {});
    expect(bare.subscriptions[0].entries[0].content).toBeUndefined();
    expect(bare.subscriptions[0].entries[0].title).toBe('t1');
  });
  it('queues at most the ids that exist and preserves insertion order', () => {
    const state = stateWithContent();
    expect(state.readLater).toEqual(['e1']);
  });
});
