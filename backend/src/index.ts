/* env must load first — it calls dotenv before any module reads process.env. */
import { env } from './config/env'
import { initMonitoring } from './config/monitoring'
import { createApp, APP_VERSION } from './app'

void initMonitoring()

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`[server] AMW Command v${APP_VERSION} · ${env.NODE_ENV} · http://localhost:${env.PORT}`)
  console.log(`[server] CORS allowlist: ${env.corsOrigins.join(', ')}`)
})
