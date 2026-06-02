# Data Model

## ERD Overview

```
User ──< Evaluation (as evaluatee)
User ──< Evaluation (as evaluator)
User ──< User (manager/employee hierarchy)

Template ──< Section ──< Question ──< Answer
Template ──< Cycle ──< Evaluation ──< Answer
```

## Tables

### User
| Column     | Type     | Description                        |
|------------|----------|------------------------------------|
| id         | cuid     | Primary key                        |
| email      | string   | Unique, used for login             |
| name       | string   | Display name                       |
| password   | string   | bcrypt hash                        |
| role       | enum     | ADMIN / MANAGER / EMPLOYEE         |
| department | string?  | แผนก                               |
| managerId  | string?  | FK → User (self-relation)          |

### Template
| Column      | Type          | Description               |
|-------------|---------------|---------------------------|
| id          | cuid          | Primary key               |
| name        | string        | ชื่อแม่แบบ                |
| description | string?       |                           |
| type        | EvaluationType| SELF / MANAGER / PEER / THREE_SIXTY |

### Section
| Column      | Type    | Description               |
|-------------|---------|---------------------------|
| id          | cuid    | Primary key               |
| templateId  | string  | FK → Template             |
| title       | string  | ชื่อหมวด                  |
| weight      | float   | น้ำหนักหมวด (default 1.0) |
| order       | int     | ลำดับการแสดงผล            |

### Question
| Column    | Type    | Description                              |
|-----------|---------|------------------------------------------|
| id        | cuid    | Primary key                              |
| sectionId | string  | FK → Section                             |
| text      | string  | ข้อความคำถาม                             |
| type      | string  | rating / text / multiple_choice          |
| weight    | float   | น้ำหนักคำถาม                             |
| options   | json?   | ตัวเลือก (สำหรับ multiple_choice)        |
| required  | boolean | บังคับตอบหรือไม่                          |

### Cycle
| Column      | Type        | Description               |
|-------------|-------------|---------------------------|
| id          | cuid        | Primary key               |
| name        | string      | เช่น "Q1 2026"            |
| templateId  | string      | FK → Template             |
| startDate   | datetime    |                           |
| endDate     | datetime    |                           |
| status      | CycleStatus | UPCOMING / ACTIVE / CLOSED|

### Evaluation
| Column      | Type            | Description               |
|-------------|-----------------|---------------------------|
| id          | cuid            | Primary key               |
| cycleId     | string          | FK → Cycle                |
| evaluateeId | string          | FK → User (ผู้รับการประเมิน) |
| evaluatorId | string          | FK → User (ผู้ประเมิน)    |
| type        | EvaluationType  |                           |
| status      | EvaluationStatus| DRAFT → IN_PROGRESS → SUBMITTED → REVIEWED → CLOSED |
| totalScore  | float?          | คำนวณอัตโนมัติตอน submit  |
| submittedAt | datetime?       |                           |

**Unique constraint:** `(cycleId, evaluateeId, evaluatorId, type)`

### Answer
| Column       | Type    | Description               |
|--------------|---------|---------------------------|
| id           | cuid    | Primary key               |
| evaluationId | string  | FK → Evaluation           |
| questionId   | string  | FK → Question             |
| value        | string? | คำตอบ (text / choice)     |
| score        | float?  | คะแนน (สำหรับ rating)     |

**Unique constraint:** `(evaluationId, questionId)`

## Score Calculation

คะแนนรวมคำนวณตอน submit:

```
totalScore = Σ(answer.score × question.weight) / Σ(question.weight)
```

เฉพาะคำถามประเภท `rating` เท่านั้นที่นำมาคำนวณ
