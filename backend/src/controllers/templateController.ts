import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import * as templateService from '../services/templateService'
import { EvaluationType } from '@prisma/client'

const EvalType = z.nativeEnum(EvaluationType)
const QuestionType = z.enum(['rating', 'text', 'multiple_choice'])

const createTemplateSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(120),
  type:        EvalType,
  description: z.string().max(500).optional(),
})

const updateTemplateSchema = createTemplateSchema.partial()

const sectionSchema = z.object({
  title:       z.string().min(1).max(120),
  weight:      z.number().min(0).max(100),
  order:       z.number().int().min(0),
  description: z.string().max(500).optional(),
})

const questionSchema = z.object({
  text:     z.string().min(1).max(500),
  type:     QuestionType,
  weight:   z.number().min(0).max(10).default(1.0),
  order:    z.number().int().min(0),
  required: z.boolean().default(true),
  options:  z.array(z.string()).optional(),
})

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await templateService.getAllTemplates())
  } catch (err) {
    next(err)
  }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await templateService.getTemplateById(req.params.id))
  } catch (err) {
    next(err)
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = createTemplateSchema.parse(req.body)
    res.status(201).json(await templateService.createTemplate(body))
  } catch (err) { next(err) }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = updateTemplateSchema.parse(req.body)
    res.json(await templateService.updateTemplate(req.params.id, body))
  } catch (err) {
    next(err)
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await templateService.deleteTemplate(req.params.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export async function addSection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = sectionSchema.parse(req.body)
    res.status(201).json(await templateService.addSection(req.params.id, body))
  } catch (err) { next(err) }
}

export async function addQuestion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = questionSchema.parse(req.body)
    res.status(201).json(await templateService.addQuestion(req.params.sectionId, body))
  } catch (err) { next(err) }
}
