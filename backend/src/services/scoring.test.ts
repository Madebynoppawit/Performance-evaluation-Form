import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateAttendanceScores } from './attendanceService'
import { calculateCompetencyScore } from './competencyService'
import { calculateGoalScore } from './goalService'
import { calculateTotalScore } from './evaluationService'

describe('scoring services', () => {
  it('calculates weighted goal scores from completed entries only', () => {
    const score = calculateGoalScore([
      { weight: 70, evaluationScore: 5 },
      { weight: 30, evaluationScore: 3 },
      { weight: 100, evaluationScore: null },
    ])

    assert.equal(score, 4.4)
  })

  it('returns null for goal score when no scored goal has weight', () => {
    assert.equal(calculateGoalScore([{ weight: 0, evaluationScore: 5 }]), null)
    assert.equal(calculateGoalScore([{ weight: 10, evaluationScore: null }]), null)
  })

  it('averages competency scores and ignores missing values', () => {
    const score = calculateCompetencyScore([{ score: 5 }, { score: null }, { score: 3 }])

    assert.equal(score, 4)
  })

  it('returns null for competency score when every value is missing', () => {
    assert.equal(calculateCompetencyScore([{ score: null }]), null)
  })

  it('calculates attendance component scores and average', () => {
    const scores = calculateAttendanceScores({
      leaveActualDays: 3,
      lateActualTimes: 9,
      disciplinaryLevel: 'NONE',
    })

    assert.deepEqual(scores, {
      leaveScore: 3,
      lateScore: 3,
      disciplinaryScore: 5,
      attendanceAvgScore: 11 / 3,
    })
  })

  it('leaves omitted attendance components undefined', () => {
    assert.deepEqual(calculateAttendanceScores({}), {
      leaveScore: undefined,
      lateScore: undefined,
      disciplinaryScore: undefined,
      attendanceAvgScore: undefined,
    })
  })
})

describe('calculateTotalScore', () => {
  it('computes a weighted average across scored rating answers', () => {
    const total = calculateTotalScore([
      { type: 'rating', score: 5, weight: 70 },
      { type: 'rating', score: 3, weight: 30 },
    ])
    assert.equal(total, 4.4)
  })

  it('ignores non-rating questions and unscored answers', () => {
    const total = calculateTotalScore([
      { type: 'rating', score: 5, weight: 70 },
      { type: 'rating', score: 3, weight: 30 },
      { type: 'text', score: 1, weight: 100 },
      { type: 'rating', score: null, weight: 50 },
    ])
    assert.equal(total, 4.4)
  })

  it('returns null when there are no scored rating answers', () => {
    assert.equal(calculateTotalScore([]), null)
    assert.equal(calculateTotalScore([{ type: 'text', score: 5, weight: 10 }]), null)
    assert.equal(calculateTotalScore([{ type: 'rating', score: null, weight: 10 }]), null)
  })

  it('returns null when total weight is zero', () => {
    assert.equal(calculateTotalScore([{ type: 'rating', score: 5, weight: 0 }]), null)
  })
})
