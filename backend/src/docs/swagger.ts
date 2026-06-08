import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'
import { openApiSpec } from './openapi'

const router = Router()

const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customSiteTitle: 'AMW Performance API Docs',
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 32px 0; }
    .swagger-ui .info .title { color: #111827; font-size: 32px; letter-spacing: 0; }
    .swagger-ui .scheme-container { border-radius: 8px; box-shadow: none; border: 1px solid #d8dde8; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
}

router.get('/openapi.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.json(openApiSpec)
})

router.use('/docs', swaggerUi.serve)
router.get('/docs', swaggerUi.setup(openApiSpec, swaggerOptions))

export default router
