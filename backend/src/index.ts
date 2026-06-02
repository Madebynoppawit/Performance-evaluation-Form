import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import evaluationRoutes from './routes/evaluations'
import templateRoutes from './routes/templates'
import cycleRoutes from './routes/cycles'
import reportRoutes from './routes/reports'
import dashboardRoutes from './routes/dashboard'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/evaluations', evaluationRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/cycles', cycleRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
