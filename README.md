# CompeteX: Centralized College Competition Management Platform

CompeteX is a full-featured, centralized web platform engineered to eliminate fragmented competition management across colleges and universities. It unites **Students**, **Organizers**, **Judges**, and **Administrators** into a single cohesive interface for hackathons, coding contests, project expos, quizzes, and paper presentations.

---

## 🌟 Key Features

### 1. 🎓 Student & Participant Experience
* **Discovery & Filtering:** Search competitions across categories (Hackathons, Coding Contests, Project Expos, Quizzes, Paper Presentations) and status filters (Ongoing, Upcoming, In Judging, Completed).
* **Team Formation & Join Codes:** Create squads with custom names or join existing teams via 6-character alphanumeric Join Codes (e.g. `CPX-7821`).
* **Multi-Stage Submission:** Submit project abstracts, GitHub repositories, live demo URLs, presentation decks, and video walkthroughs before deadline locks.
* **Live Leaderboards:** View real-time rank progression, medals, and judge feedback.

### 2. 👩‍🏫 Organizer Command Center
* **Host New Competitions:** Multi-field creator configuring event format (Individual vs Team), min/max squad sizes, prize pools, and stages.
* **Manage Registrations & Squads:** Review incoming teams and member rosters.
* **Campus Broadcasts:** Post high-priority alerts and schedule updates to participants.

### 3. ⚖️ Judge Evaluation Pad
* **Queue-Driven Interface:** View assigned team submissions.
* **Rubric Scoring Matrix:** Interactive sliders to evaluate against weighted criteria (Innovation, Technical Execution, Real-world Impact, UI/UX Polish, Presentation).
* **Feedback Engine:** Write private remarks for organizers and constructive feedback for students with instant score calculation and leaderboard syncing.

### 4. 🛡️ Institutional Administrator & Governance
* **Campus KPIs:** Live metrics tracking active competitions, registered squads, project submissions, and jury evaluations.
* **Category Breakdown:** Graphical distribution of competitions across technical and non-technical domains.
* **Audit Trail:** Timestamped log of significant evaluation and submission events.

### 5. 📜 Verifiable Digital Certificates & Merit Badges
* **Automatic Merit Credentials:** Issues high-resolution diploma certificates for 1st place (🥇), 2nd place (🥈), 3rd place (🥉), and participation (📜).
* **Print & PDF Export:** One-click print/PDF download with gold borders, institutional crest, and academic signatures.
* **Public Verifier Tool:** Instant credential verification using unique serial codes (e.g. `CX-2026-HCKS-001` or `VFY-8921-9402`).
* **Bulk Issuance:** Organizers and admins can calculate final standings and generate certificates in bulk for any completed event.

---

## 🔐 Authentication & Database Persistence

CompeteX features an interactive **Authentication System (Login & Register)** connected to persistent database storage:

* **User Registration (`POST /api/auth/register`):**
  * Registers new users with Full Name, Email, Password (hashed using SHA-256), Role (Student, Organizer, Judge, Admin), College, Department, and Skills.
  * Writes directly to `data/db.json` with immediate availability for sign in.
* **User Login (`POST /api/auth/login`):**
  * Authenticates credentials against the database.
  * Issues user session tokens (`cpx-token-...`) and stores session in client `localStorage`.
* **Quick Demo Fill:**
  * 1-click test credentials buttons on the login modal for instant evaluation across all 4 personas without manual typing.
* **Sign Out:**
  * Immediate session termination and UI state clearing.

### 👥 Preloaded Role Accounts (Password: `password123`)

| Role | Email | Name | Department / Affiliation | Preloaded Activities |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `student@college.edu` | Alex Chen | Computer Science & Engineering | Leader of *NeuralKnights*, submitted *EcoCampus AI* |
| **Organizer** | `organizer@college.edu` | Dr. Sarah Jenkins | Dean of Research & Faculty Lead | Organizer of *HackSprint 2026* & *CodeCraft* |
| **Judge** | `judge@college.edu` | Michael Vance | VP of Engineering at CloudScale | Industry Judge with assigned scoring queue |
| **Admin** | `admin@college.edu` | Prof. H. Sharma | Dean of Student Affairs | Institutional platform metrics & audit logs |

---

## 🚀 Running CompeteX

The project is completely self-contained in:
`C:\Users\marth\.gemini\antigravity\scratch\competex`

### Option 1: Double-Click
Double-click `start.bat` in the project folder.

### Option 2: Command Line
```powershell
cd C:\Users\marth\.gemini\antigravity\scratch\competex
.\bin\node.exe server.js
```

Then open your browser to:
**`http://localhost:3000`**

---

## 📡 REST API Endpoints

* `GET /api/competitions` - List competitions with filters (`?category=...&status=...&search=...`)
* `GET /api/competitions/:id` - Detailed view of competition and stages
* `POST /api/competitions` - Create and publish a competition
* `GET /api/teams` - List teams (`?competitionId=...&userId=...`)
* `POST /api/teams` - Create a new team with an auto-generated join code
* `POST /api/teams/join` - Join an existing team using a join code
* `GET /api/submissions` - List submissions
* `POST /api/submissions` - Submit project deliverables
* `GET /api/evaluations` - List evaluations
* `POST /api/evaluations` - Submit judge rubric scores and feedback
* `GET /api/leaderboard/:competitionId` - Compute rankings with weighted averages
* `GET /api/announcements` - List bulletins
* `POST /api/announcements` - Post a new announcement
* `GET /api/stats` - Platform statistics
* `POST /api/reset` - Reset back to clean demo seeds
