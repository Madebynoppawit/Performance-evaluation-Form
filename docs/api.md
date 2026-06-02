# API Reference

Base URL: `http://localhost:3001/api`

## Authentication

ทุก endpoint (ยกเว้น login/register) ต้องส่ง header:
```
Authorization: Bearer <token>
```

---

## Auth

### POST /auth/login
```json
{ "email": "admin@company.com", "password": "password123" }
```
Response: `{ user, token }`

### POST /auth/register
```json
{ "email": "", "password": "", "name": "", "department": "" }
```
Response: `{ user, token }`

### GET /auth/me
Response: `User`

---

## Templates

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /templates | All | รายการแม่แบบทั้งหมด |
| GET | /templates/:id | All | รายละเอียดแม่แบบ |
| POST | /templates | ADMIN | สร้างแม่แบบ |
| PATCH | /templates/:id | ADMIN | แก้ไขแม่แบบ |
| DELETE | /templates/:id | ADMIN | ลบแม่แบบ |
| POST | /templates/:id/sections | ADMIN | เพิ่มหมวด |
| POST | /templates/sections/:sectionId/questions | ADMIN | เพิ่มคำถาม |

---

## Cycles

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /cycles | All | รายการรอบทั้งหมด |
| GET | /cycles/:id | All | รายละเอียดรอบ |
| POST | /cycles | ADMIN/MANAGER | สร้างรอบ |
| PATCH | /cycles/:id/status | ADMIN | เปลี่ยนสถานะ |

### Body สร้างรอบ
```json
{
  "name": "Q1 2026",
  "templateId": "...",
  "startDate": "2026-01-01",
  "endDate": "2026-03-31",
  "description": ""
}
```

---

## Evaluations

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /evaluations | All | แบบประเมินของ user นั้น (admin เห็นทั้งหมด) |
| GET | /evaluations/:id | All | รายละเอียดแบบประเมิน |
| PATCH | /evaluations/:id/answers | All | บันทึกคำตอบ (draft) |
| PATCH | /evaluations/:id/submit | All | ส่งแบบประเมิน + คำนวณคะแนน |

### Body answers
```json
{
  "answers": {
    "<questionId>": "<value>",
    "<questionId2>": "3"
  }
}
```

---

## Reports

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /reports/summary | ADMIN/MANAGER | สรุปผลทุกรอบ |

### Response
```json
[
  {
    "cycleId": "...",
    "cycleName": "Q1 2026",
    "averageScore": 3.75,
    "totalEvaluations": 10,
    "completedEvaluations": 8,
    "byDepartment": [
      { "department": "Engineering", "averageScore": 4.0 }
    ]
  }
]
```
