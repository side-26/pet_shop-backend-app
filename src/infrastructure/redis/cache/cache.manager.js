import { LazyLoadStrategy } from './strategies/lazyLoad.strategy.js';

import { WriteThroughStrategy } from './strategies/writeThrough.strategy.js';

import { WriteBehindStrategy } from './strategies/writeBehind.strategy.js';

import { RefreshAheadStrategy } from './strategies/refreshAhead.strategy.js';

export class CacheManager {
  constructor({ store, lock, writeQueue }) {
    this.lazyLoad = new LazyLoadStrategy({
      store,
      lock,
    });

    this.writeThrough = new WriteThroughStrategy({
      store,
    });

    this.writeBehind = new WriteBehindStrategy({
      store,
      queue: writeQueue,
    });

    this.refreshAhead = new RefreshAheadStrategy({
      store,
      lock,
    });
  }
}
