import test from 'node:test'
import assert from 'node:assert/strict'

import { createApiClient } from '../src/api.js'

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return { code: 0, message: 'ok', data }
    },
  }
}

test('默认请求 /api/v1 并为案件写操作注入幂等键', async () => {
  const requests = []
  const client = createApiClient({
    fetchImpl: async (url, init) => {
      requests.push({ url, init })
      return response({ id: 'LG-0716-082', status: '待立案' })
    },
  })

  const appointment = await client.createAppointment({
    patientId: 'LG-001',
    patient: '案卷 C001',
    department: '合同纠纷',
    doctor: '林律师',
    scheduledAt: '2026-07-17T09:30:00+08:00',
  })

  assert.equal(appointment.id, 'LG-0716-082')
  assert.equal(requests[0].url, '/api/v1/appointments')
  assert.equal(requests[0].init.method, 'POST')
  assert.match(requests[0].init.headers['Idempotency-Key'], /^cf-/)
  assert.equal(requests[0].init.headers['Content-Type'], 'application/json')
})

test('列表请求保留查询参数，配置了完整 API 地址时不重复拼接路径', async () => {
  const urls = []
  const client = createApiClient({
    baseUrl: 'http://localhost:8088/api/v1/',
    fetchImpl: async (url) => {
      urls.push(url)
      return response({ list: [], total: 0, page: 1, pageSize: 20 })
    },
  })

  await client.listAppointments({ page: 1, pageSize: 20, status: '待办理' })
  await client.listFollowups({ page: 1, pageSize: 10, status: '待完成' })

  assert.deepEqual(urls, [
    'http://localhost:8088/api/v1/appointments?page=1&pageSize=20&status=%E5%BE%85%E5%8A%9E%E7%90%86',
    'http://localhost:8088/api/v1/followups?page=1&pageSize=10&status=%E5%BE%85%E5%AE%8C%E6%88%90',
  ])
})

test('案件生命周期和合规完成操作走后端契约', async () => {
  const calls = []
  const client = createApiClient({
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return response({ id: 'ok' })
    },
  })

  await client.checkinAppointment('LG-1')
  await client.updateAppointmentStatus('LG-1', '待办理')
  await client.updateAppointmentStatus('LG-1', '办理中')
  await client.updateAppointmentStatus('LG-1', '已结案')
  await client.completeFollowup('FW-1')

  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/v1/appointments/LG-1/checkin',
    '/api/v1/appointments/LG-1/status',
    '/api/v1/appointments/LG-1/status',
    '/api/v1/appointments/LG-1/status',
    '/api/v1/followups/FW-1/complete',
  ])
  for (const { init } of calls) {
    assert.match(init.headers['Idempotency-Key'], /^cf-/)
  }
})

test('非零响应会抛错，调用方可以保留演示数据', async () => {
  const client = createApiClient({
    fetchImpl: async () => ({
      ok: false,
      status: 409,
      async json() {
        return { code: 409, message: '状态不可推进', data: null }
      },
    }),
  })

  await assert.rejects(() => client.updateAppointmentStatus('LG-1', '待办理'), /状态不可推进/)
})

test('案件协同客户端覆盖案件、任务、文档元数据和结案摘要', async () => {
  const calls = []
  const client = createApiClient({ fetchImpl: async (url, init) => { calls.push({ url, init }); return response({ id: 'LF-1', status: '协同中' }) } })
  await client.listMatters({ status: '协同中' })
  await client.getMatter('LF-1')
  await client.listMatterEvents('LF-1')
  await client.assignMatter('LF-1', { assignee: '林律师', actor: '当事人端' })
  await client.updateMatterStatus('LF-1', '待结案', '林律师')
  await client.addMatterFile('LF-1', { name: '证据.pdf', kind: 'evidence', checksum: 'sha256:mobile-1' })
  await client.closeMatter('LF-1', { result: '结案摘要已确认', actor: '当事人端' })
  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/v1/matters?status=%E5%8D%8F%E5%90%8C%E4%B8%AD',
    '/api/v1/matters/LF-1',
    '/api/v1/matters/LF-1/events',
    '/api/v1/matters/LF-1/assign',
    '/api/v1/matters/LF-1/status',
    '/api/v1/matters/LF-1/file',
    '/api/v1/matters/LF-1/close',
  ])
})
