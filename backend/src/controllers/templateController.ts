import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as templateService from '../services/templateService'

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
    res.status(201).json(await templateService.createTemplate(req.body))
  } catch (err) {
    next(err)
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await templateService.updateTemplate(req.params.id, req.body))
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
    res.status(201).json(await templateService.addSection(req.params.id, req.body))
  } catch (err) {
    next(err)
  }
}

export async function addQuestion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await templateService.addQuestion(req.params.sectionId, req.body))
  } catch (err) {
    next(err)
  }
}
