import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadConfig } from '../config.js'
import { AuditStore } from '../logging/store.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function startDashboard() {
  const config = loadConfig()

  if (!config.dashboard.enabled) {
    console.error('[Dashboard] Dashboard is disabled in config')
    process.exit(1)
  }

  // Initialize audit store
  const auditStore = new AuditStore(config)

  const app = express()

  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')))

  // API endpoint: recent activity
  app.get('/api/activity', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100
    const entries = auditStore.getRecent(limit)
    res.json(entries)
  })

  // API endpoint: DLP summary
  app.get('/api/dlp-summary', (_req, res) => {
    const summary = auditStore.getDLPSummary()
    res.json(summary)
  })

  // API endpoint: tool usage stats
  app.get('/api/tool-stats', (_req, res) => {
    const entries = auditStore.getRecent(1000)
    const stats: Record<string, number> = {}

    for (const entry of entries) {
      stats[entry.tool_name] = (stats[entry.tool_name] || 0) + 1
    }

    res.json(stats)
  })

  // API endpoint: sessions
  app.get('/api/sessions', (_req, res) => {
    const entries = auditStore.getRecent(1000)
    const sessions = new Map<
      string,
      {
        session_id: string
        user: string
        tool_count: number
        first_seen: string
        last_seen: string
        dlp_violations: number
      }
    >()

    for (const entry of entries) {
      const existing = sessions.get(entry.session_id)
      if (existing) {
        existing.tool_count++
        existing.last_seen = entry.timestamp
        existing.dlp_violations += entry.dlp_findings.length
      } else {
        sessions.set(entry.session_id, {
          session_id: entry.session_id,
          user: entry.user,
          tool_count: 1,
          first_seen: entry.timestamp,
          last_seen: entry.timestamp,
          dlp_violations: entry.dlp_findings.length,
        })
      }
    }

    res.json(Array.from(sessions.values()))
  })

  const port = config.dashboard.port
  const bind = config.dashboard.bind

  app.listen(port, bind, () => {
    console.log(`[Dashboard] Running on http://${bind}:${port}`)
  })
}

startDashboard().catch(err => {
  console.error('[Dashboard] Fatal error:', err)
  process.exit(1)
})
