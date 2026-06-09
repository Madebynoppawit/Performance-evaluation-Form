import { env } from '../config/env'
import { APP_VERSION } from '../config/version'

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AMW Performance Evaluation API',
    version: APP_VERSION,
    description: `Enterprise performance evaluation, review workflow, reporting, and administration API. Release channel: ${env.APP_RELEASE_CHANNEL}. AI features: ${env.aiFeaturesEnabled ? 'enabled' : 'disabled'}.`,
  },
  'x-release': {
    channel: env.APP_RELEASE_CHANNEL,
    aiEnabled: env.aiFeaturesEnabled,
    aiProvider: env.AI_PROVIDER,
  },
  servers: [
    { url: '/api', description: 'Current API host' },
    { url: 'http://localhost:3001/api', description: 'Local development' },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Evaluations' },
    { name: 'Templates' },
    { name: 'Cycles' },
    { name: 'Reports' },
    { name: 'Dashboard' },
    { name: 'Users' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@amw-ems.com' },
          password: { type: 'string', format: 'password', example: 'password123' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
          position: { type: 'string', enum: ['DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF'] },
          department: { type: 'string' },
          managerId: { type: 'string', nullable: true },
        },
      },
      Cycle: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          templateId: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['UPCOMING', 'ACTIVE', 'CLOSED'] },
        },
      },
      Evaluation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          cycleId: { type: 'string' },
          evaluateeId: { type: 'string' },
          evaluatorId: { type: 'string' },
          type: { type: 'string', enum: ['SELF', 'MANAGER', 'PEER', 'THREE_SIXTY'] },
          status: { type: 'string', enum: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'CLOSED'] },
          goalWeight: { type: 'number' },
          competencyWeight: { type: 'number' },
          attendanceWeight: { type: 'number' },
          totalScore: { type: 'number', nullable: true },
          goals: { type: 'array', items: { $ref: '#/components/schemas/GoalEntry' } },
          competencyScores: { type: 'array', items: { $ref: '#/components/schemas/CompetencyScore' } },
          attendanceRecord: { $ref: '#/components/schemas/AttendanceScore' },
          trainingRecord: { $ref: '#/components/schemas/TrainingScore' },
          submittedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      GoalEntry: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          goal: { type: 'string', example: 'Improve customer response SLA' },
          goalDescription: { type: 'string', nullable: true },
          weight: { type: 'number', example: 20 },
          targetRating5: { type: 'string', nullable: true, example: '95' },
          targetRating4: { type: 'string', nullable: true, example: '90' },
          targetRating3: { type: 'string', nullable: true, example: '85' },
          targetRating2: { type: 'string', nullable: true, example: '80' },
          targetRating1: { type: 'string', nullable: true, example: '75' },
          wig: { type: 'string', nullable: true, enum: ['WIG_1_CUSTOMER', 'WIG_2_PEOPLE', 'WIG_3_RESULT'] },
          kpiCategory: { type: 'string', nullable: true, example: 'Customer' },
          result: { type: 'string', nullable: true },
          evaluationScore: { type: 'integer', nullable: true, minimum: 1, maximum: 5 },
          employeeComment: { type: 'string', nullable: true },
          superiorComment: { type: 'string', nullable: true },
          order: { type: 'integer', example: 1 },
        },
      },
      GoalsSaveRequest: {
        type: 'object',
        required: ['goals'],
        properties: {
          goals: { type: 'array', maxItems: 5, items: { $ref: '#/components/schemas/GoalEntry' } },
        },
      },
      CompetencyScore: {
        type: 'object',
        properties: {
          competencyId: { type: 'string', example: 'CC1' },
          score: { type: 'integer', nullable: true, minimum: 1, maximum: 5 },
        },
      },
      CompetencySaveRequest: {
        type: 'object',
        properties: {
          scores: { type: 'array', items: { $ref: '#/components/schemas/CompetencyScore' } },
        },
      },
      AttendanceScore: {
        type: 'object',
        properties: {
          leaveActualDays: { type: 'integer', nullable: true, minimum: 0 },
          lateActualTimes: { type: 'integer', nullable: true, minimum: 0 },
          disciplinaryLevel: {
            type: 'string',
            nullable: true,
            enum: ['NONE', 'VERBAL_WARNING_1', 'WRITTEN_WARNING_1', 'MULTIPLE_WARNING_OR_SUSPENSION'],
          },
          leaveScore: { type: 'integer', nullable: true, minimum: 1, maximum: 5 },
          lateScore: { type: 'integer', nullable: true, minimum: 1, maximum: 5 },
          disciplinaryScore: { type: 'integer', nullable: true, minimum: 1, maximum: 5 },
          attendanceAvgScore: { type: 'number', nullable: true },
        },
      },
      AttendanceSaveRequest: {
        type: 'object',
        properties: {
          leaveActualDays: { type: 'integer', nullable: true, minimum: 0 },
          lateActualTimes: { type: 'integer', nullable: true, minimum: 0 },
          disciplinaryLevel: {
            type: 'string',
            nullable: true,
            enum: ['NONE', 'VERBAL_WARNING_1', 'WRITTEN_WARNING_1', 'MULTIPLE_WARNING_OR_SUSPENSION'],
          },
        },
      },
      TrainingScore: {
        type: 'object',
        properties: {
          minimumHours: { type: 'number', nullable: true, example: 10 },
          actualHours: { type: 'number', nullable: true, example: 12 },
          percentOfMinimum: { type: 'number', nullable: true, example: 120 },
          score: { type: 'integer', nullable: true, minimum: 1, maximum: 5, example: 4 },
          behaviorNote: { type: 'string', nullable: true },
        },
      },
      TrainingSaveRequest: {
        type: 'object',
        properties: {
          minimumHours: { type: 'number', nullable: true, minimum: 0 },
          actualHours: { type: 'number', nullable: true, minimum: 0 },
          behaviorNote: { type: 'string', nullable: true, maxLength: 2000 },
        },
      },
      EvaluationCreateRequest: {
        type: 'object',
        required: ['cycleId', 'evaluatorId'],
        properties: {
          cycleId: { type: 'string' },
          evaluateeId: { type: 'string', description: 'Existing employee id. Mutually exclusive with newEvaluatee.' },
          newEvaluatee: {
            type: 'object',
            description: 'Inline employee record to create before creating the evaluation.',
            required: ['name', 'position'],
            properties: {
              name: { type: 'string', example: 'Jane Doe' },
              position: { type: 'string', enum: ['DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF'] },
              jobTitle: { type: 'string', nullable: true, example: 'Managing Director' },
              department: { type: 'string', nullable: true, example: 'Operations' },
            },
          },
          evaluatorId: { type: 'string', description: 'Authenticated supervisor/manager/director user id used for ownership and access control.' },
          evaluatorName: { type: 'string', nullable: true, description: 'Display name typed on the manager form.' },
          type: { type: 'string', enum: ['SELF', 'MANAGER', 'PEER', 'THREE_SIXTY'], default: 'MANAGER', example: 'MANAGER' },
        },
      },
      Template: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['SELF', 'MANAGER', 'PEER', 'THREE_SIXTY'] },
          sections: { type: 'array', items: { type: 'object' } },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication is required.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Forbidden: {
        description: 'The authenticated user does not have access to this resource.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'The requested resource was not found.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in and receive a bearer token.',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'Authenticated session payload.' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return the current authenticated user.',
        responses: {
          '200': { description: 'Current user.', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/evaluations': {
      get: {
        tags: ['Evaluations'],
        summary: 'List evaluations visible to the current user.',
        responses: {
          '200': {
            description: 'Evaluation list.',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Evaluation' } } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Evaluations'],
        summary: 'Create a new evaluation.',
        description: 'Admin only.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EvaluationCreateRequest' } } },
        },
        responses: {
          '201': { description: 'Created evaluation.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Evaluation' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/evaluations/{id}': {
      get: {
        tags: ['Evaluations'],
        summary: 'Get a full evaluation by id.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Evaluation details.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Evaluation' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Evaluations'],
        summary: 'Delete an evaluation.',
        description: 'Admin only. Removes the evaluation and dependent saved answers.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted.' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/evaluations/{id}/goals': {
      patch: {
        tags: ['Evaluations'],
        summary: 'Save WIG/KPI goal entries for an evaluation.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GoalsSaveRequest' } } },
        },
        responses: {
          '200': { description: 'Saved goal entries.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GoalEntry' } } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/evaluations/{id}/competency': {
      patch: {
        tags: ['Evaluations'],
        summary: 'Save competency scores.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CompetencySaveRequest' } } },
        },
        responses: {
          '200': { description: 'Saved competency scores.' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/evaluations/{id}/attendance': {
      patch: {
        tags: ['Evaluations'],
        summary: 'Save attendance and disciplinary scoring inputs.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AttendanceSaveRequest' } } },
        },
        responses: {
          '200': { description: 'Saved attendance score.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AttendanceScore' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/evaluations/{id}/training': {
      patch: {
        tags: ['Evaluations'],
        summary: 'Save training-hour score from the manager form.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TrainingSaveRequest' } } },
        },
        responses: {
          '200': { description: 'Saved training score.', content: { 'application/json': { schema: { $ref: '#/components/schemas/TrainingScore' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/templates': {
      get: {
        tags: ['Templates'],
        summary: 'List evaluation templates.',
        responses: {
          '200': { description: 'Template list.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Template' } } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Templates'],
        summary: 'Create a template.',
        description: 'Admin only.',
        responses: {
          '201': { description: 'Created template.' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/templates/{id}': {
      delete: {
        tags: ['Templates'],
        summary: 'Delete an evaluation template.',
        description: 'Admin only. Removes the template, dependent sections/questions, linked cycles, and evaluations saved under those cycles.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted.' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/cycles': {
      get: {
        tags: ['Cycles'],
        summary: 'List evaluation cycles.',
        responses: {
          '200': { description: 'Cycle list.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Cycle' } } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Cycles'],
        summary: 'Create an evaluation cycle.',
        description: 'Admin or manager only.',
        responses: {
          '201': { description: 'Created cycle.' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/cycles/{id}': {
      delete: {
        tags: ['Cycles'],
        summary: 'Delete an evaluation cycle.',
        description: 'Admin only. Removes the cycle and evaluations saved under it.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted.' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reports/summary': {
      get: {
        tags: ['Reports'],
        summary: 'Return performance report summary.',
        description: 'Admin or manager only.',
        responses: {
          '200': { description: 'Report summary.' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/reports/evaluations/{id}/export': {
      get: {
        tags: ['Reports'],
        summary: 'Export an evaluation as CSV.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'CSV export.', content: { 'text/csv': { schema: { type: 'string' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Return dashboard KPI metrics.',
        responses: {
          '200': { description: 'Dashboard statistics.' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users.',
        description: 'Admin only.',
        responses: {
          '200': { description: 'User list.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
} as const
