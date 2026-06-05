import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateAttendanceScores } from './attendanceService'
import { calculateCompetencyScore } from './competencyService'
import { calculateGoalScore } from './goalService'

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
