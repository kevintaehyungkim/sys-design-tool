import {
  blankDocument,
  fromPlainText,
  minNodeHeight,
  textRuns,
  type Component,
  type Kind,
  type RichText,
} from './model'
const heading = (text: string): RichText => ({
  type: 'heading',
  attrs: { level: 3 },
  content: textRuns(text),
})
const section = (title: string, text: string): RichText => ({
  type: 'doc',
  content: [heading(title), ...fromPlainText(text).content!],
})
export function exampleDocument() {
  const d = blankDocument()
  d.title = 'URL shortener'
  d.requirements.intro = 'Fast redirects, durable links, lightweight analytics'
  d.requirements.sections = {
    requirements: fromPlainText(
      '- Create immutable short links with `POST /links`\n- Redirect using `GET /:code`\n- Collect `click.created` events asynchronously',
    ),
    keyIdeas: fromPlainText(
      '- Keep redirects on a `cache-aside` read path\n- Use `Base62` codes for compact, unique links\n- Decouple analytics from redirect latency',
    ),
    guarantees: fromPlainText(
      '- A short code always resolves to the same destination\n- Acknowledge new links only after durable storage\n- Analytics failures never block redirects',
    ),
    scaleConstraints: fromPlainText(
      '- 10M new links / day · 100:1 reads to writes\n- p99 redirects < 50 ms\n- 99.99% availability',
    ),
  }
  d.approach.content = fromPlainText(
    'Keep redirects on a cache-first path. Persist each short code once, then process click events asynchronously.\nUse `Base62` for compact keys and `cache-aside` reads for durable fallback',
  )
  const node = (
    id: string,
    kind: Kind,
    name: string,
    description: string,
    x: number,
    y: number,
    width = 250,
  ): Component => ({
    id,
    kind,
    name,
    description,
    x,
    y,
    width,
    height: minNodeHeight({ name, description }, width),
  })
  d.nodes = [
    node('client', 'client', 'Web client', 'Create links · Follow redirects', 340, 64, 300),
    node('gateway', 'service', 'API Gateway', 'Route requests · Rate limits', 100, 236, 740),
    node('link', 'service', 'Link Service', 'Generate codes\nPersist link mappings', 100, 424, 280),
    node(
      'redirect',
      'service',
      'Redirect Service',
      'Resolve short codes\nEmit click events',
      560,
      424,
      280,
    ),
    node('cache', 'cache', 'Link Cache', 'Hot short-code mappings', 1040, 64, 270),
    node('store', 'data', 'Link Store', 'Durable link records', 1040, 362, 270),
    node('queue', 'queue', 'Analytics Queue', 'Buffer click events', 100, 680, 280),
    node('worker', 'worker', 'Analytics Worker', 'Aggregate click metrics', 560, 680, 280),
    node('analytics', 'data', 'Analytics Store', 'Counts · Time series', 1040, 680, 270),
  ]
  d.edges = [
    ['client', 'gateway', 'sync'],
    ['gateway', 'link', 'sync'],
    ['gateway', 'redirect', 'sync'],
    ['link', 'store', 'sync'],
    ['redirect', 'cache', 'sync'],
    ['redirect', 'store', 'sync'],
    ['redirect', 'queue', 'async'],
    ['queue', 'worker', 'async'],
    ['worker', 'analytics', 'sync'],
  ].map(([sourceId, targetId, mode], i) => ({
    id: `edge-${i}`,
    sourceId,
    targetId,
    mode: mode as 'sync' | 'async',
    label: '',
  }))
  d.pages = [
    {
      id: 'general',
      title: 'GENERAL',
      content: section(
        'Read path & resilience',
        '- Cache hot links; fall back to the durable store on a miss\n- Enforce unique `short_code` values and idempotent link creation\n- Queue `click.created` events so analytics never delays a redirect\nReturn `302` with `Location: original_url` when a link resolves',
      ),
    },
    {
      id: 'data-model',
      title: 'DATA MODEL',
      content: section(
        'Link record',
        '- `short_code` · Unique lookup key\n- `original_url` · Destination URL\n- `created_at` · Creation timestamp\nPartition by a hash of `short_code` to distribute reads',
      ),
    },
    {
      id: 'failure-modes',
      title: 'FAILURE MODES',
      content: section(
        'Graceful degradation',
        '- Cache unavailable → fall back to Link Store\n- Analytics delayed → buffer and retry asynchronously\n- Unknown short code → return `404`',
      ),
    },
  ]
  d.viewport = { x: 18, y: 14, zoom: 0.8 }
  return d
}
