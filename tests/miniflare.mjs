import { Miniflare as Runtime, convertV4MiniflareOptions } from 'miniflare';

// The pinned runtime is v5; existing tests use the documented v4 option shape.
export class Miniflare extends Runtime {
  constructor(options) { super(convertV4MiniflareOptions(options)); }
}
