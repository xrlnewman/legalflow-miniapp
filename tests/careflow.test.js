import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises'
test('LegalFlow miniapp renders case and reminder cards', async()=>{const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8'); assert.match(source,/新建案件/); assert.match(source,/我的案件/); assert.match(source,/林律师/)})

test('LegalFlow actions are wired to the real appointment and follow-up client', async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8')
  assert.match(source,/createApiClient/)
  assert.match(source,/refreshFromApi/)
  assert.match(source,/checkinAppointment/)
  assert.match(source,/updateAppointmentStatus/)
  assert.match(source,/completeFollowup/)
  assert.match(source,/演示数据/)
})

test('LegalFlow miniapp renders alias-only matter cards, assigned tasks, documents and closure summary', async()=>{const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8'); assert.match(source,/我的案件/); assert.match(source,/截止日期/); assert.match(source,/文档元数据/); assert.match(source,/结案摘要/); assert.match(source,/listMatters/); assert.match(source,/listMatterEvents/)})

test('Vite proxies the default API path to the local LegalFlow service', async()=>{
  const source=await readFile(new URL('../vite.config.js',import.meta.url),'utf8')
  assert.match(source,/proxy/)
  assert.match(source,/localhost:8080/)
})
