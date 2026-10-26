// 本機預覽與測試用：用 Node 內建的 SQLite 模擬 Cloudflare D1（prepare/bind/first/run/all/batch）。
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function makeD1(dir = path.resolve(import.meta.dirname, '../drizzle')) {
  const db = new DatabaseSync(':memory:');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of fs.readFileSync(path.join(dir, f), 'utf8').split('--> statement-breakpoint')) if (sql.trim()) db.exec(sql);
  }
  const norm = row => row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Uint8Array ? v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) : v]));
  const toArg = v => v instanceof ArrayBuffer ? new Uint8Array(v) : v;
  function statement(sql, args = []) {
    return {
      bind: (...a) => statement(sql, a.map(toArg)),
      async first() { return norm(db.prepare(sql).get(...args)) ?? null; },
      async all() { return { results: db.prepare(sql).all(...args).map(norm) }; },
      async run() { db.prepare(sql).run(...args); return { success: true }; },
      _exec() { return db.prepare(sql).run(...args); }
    };
  }
  return {
    prepare: sql => statement(sql),
    async batch(list) { db.exec('BEGIN'); try { const r = list.map(s => s._exec()); db.exec('COMMIT'); return r.map(() => ({ success: true })); } catch (e) { db.exec('ROLLBACK'); throw e; } }
  };
}
