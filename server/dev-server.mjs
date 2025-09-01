// Minimal in-memory implementation of the sync API for local development.
// Not production code: no auth, no persistence, one global dataset.
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 4000);
const PAGE_SIZE = Number(process.env.PAGE_SIZE ?? 200);
// Set to e.g. 0.3 to make a third of requests fail with 503 and watch the client back off.
const FAIL_RATE = Number(process.env.FAIL_RATE ?? 0);
const LATENCY_MS = Number(process.env.LATENCY_MS ?? 0);

const tables = { habits: new Map(), checkins: new Map() };
let seq = 0;

// The cursor is a server-side sequence number, not a timestamp. Client clocks can't
// be trusted for "what changed since", only for resolving conflicts.
function accept(table, record) {
  if (!record || typeof record.id !== 'string' || typeof record.updatedAt !== 'string') {
    return false;
  }
  const current = tables[table].get(record.id);
  if (current && Date.parse(current.record.updatedAt) > Date.parse(record.updatedAt)) {
    return false;
  }
  tables[table].set(record.id, { record, seq: ++seq });
  return true;
}

function changesSince(since) {
  const rows = [];
  for (const [table, map] of Object.entries(tables)) {
    for (const { record, seq: rowSeq } of map.values()) {
      if (rowSeq > since) rows.push({ table, record, seq: rowSeq });
    }
  }
  rows.sort((a, b) => a.seq - b.seq);
  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    habits: page.filter((r) => r.table === 'habits').map((r) => r.record),
    checkins: page.filter((r) => r.table === 'checkins').map((r) => r.record),
    cursor: String(last ? last.seq : since),
    hasMore: rows.length > page.length,
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  console.log(req.method, url.pathname + url.search);

  if (LATENCY_MS) await new Promise((r) => setTimeout(r, LATENCY_MS));
  if (FAIL_RATE && Math.random() < FAIL_RATE) return send(res, 503, { error: 'unlucky' });

  try {
    if (req.method === 'POST' && url.pathname === '/sync/push') {
      const body = await readJson(req);
      if (!Array.isArray(body.habits) || !Array.isArray(body.checkins)) {
        return send(res, 400, { error: 'expected habits[] and checkins[]' });
      }
      let accepted = 0;
      for (const h of body.habits) if (accept('habits', h)) accepted++;
      for (const c of body.checkins) if (accept('checkins', c)) accepted++;
      return send(res, 200, { ok: true, accepted });
    }

    if (req.method === 'GET' && url.pathname === '/sync/pull') {
      const since = Number(url.searchParams.get('since') ?? 0);
      if (!Number.isFinite(since)) return send(res, 400, { error: 'bad cursor' });
      return send(res, 200, changesSince(since));
    }

    if (req.method === 'GET' && url.pathname === '/debug') {
      return send(res, 200, {
        seq,
        habits: [...tables.habits.values()].map((r) => r.record),
        checkins: [...tables.checkins.values()].map((r) => r.record),
      });
    }

    send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error(err);
    send(res, 400, { error: 'invalid request' });
  }
});

server.listen(PORT, () => console.log(`sync dev server on http://localhost:${PORT}`));
