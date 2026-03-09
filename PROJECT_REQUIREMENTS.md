# IS213 Project Requirements
## Design and Implementation of an Enterprise Solution Using a Microservices Architecture

---

## Executive Summary

| Item | Details |
|------|---------|
| **Requirement Title** | Design and Implementation of an Enterprise Solution Using a Microservices Architecture |
| **Team Size** | 5–6 persons |
| **Grade Percentage** | 35% of all assessments |

---

## Due Dates

### Week 9 – Proposal
- **Before Week 9 class**: Prepare a proposal describing the chosen scenario and draft solution design.
- **During Week 9 class**: 20-minute face-to-face discussion with instructor(s) per team.

### Week 13 – Final Submission
- **30 minutes before class starts**:
  - 0815 class → submit by 0745
  - 1530 class → submit by 1500
  - Submit on eLearn: Presentation Slides, Project Report, All Code + Documentation, Video Demo
- **During Week 13 class**: 15-minute presentation + demo, followed by Q&A.

---

## Learning Outcomes

Build an enterprise solution using **Microservices Architecture** following the **Service Oriented Architecture (SOA)** paradigm. Applications should be structured as assemblies of loosely coupled microservices organised in various layers.

Technologies may include: Python, Flask, REST, RabbitMQ, WampServer, Docker, Visual Studio Code, etc.

---

## Minimum Technical Requirements

Your scenario must implement and showcase **3 most interesting user scenarios** (e.g., for Taxi Booking: passenger sends booking, driver accepts booking, passenger pays for ride).

> **Note:** Uninteresting scenarios include: user registers, user logs in, user updates profile.

| # | Requirement |
|---|-------------|
| 1 | Minimum **3 atomic microservices** for 3 different data entities |
| 2 | At least **1 atomic service built and exposed on OutSystems** |
| 3 | At least **1 microservice reused** across different user scenarios |
| 4 | At least **1 external service** integrated |
| 5 | At least **2 user scenarios** where a microservice orchestrates or initiates a choreography of other microservices |
| 6 | Each microservice must have **exclusive access to its own data store** (file, DB table, or cloud storage) |
| 7 | At least **1 microservice** must use a **DB** as its data store |
| 8 | Use **HTTP communication** between some microservices |
| 9 | Use **message-based communication** (e.g., RabbitMQ) between some microservices |
| 10 | At least **1 web-based Graphical User Interface** (HTML/JS/Vue/jQuery/etc.) |
| 11 | Use **JSON data** in some microservices and/or Web UIs |
| 12 | Use **Docker** in a way suitable for the scenario |
| 13 | Use **Docker Compose** to deploy microservices locally (excluding OutSystems) |

### What Makes a Scenario "Interesting"?
- Handles **business exception situations** (e.g., no driver responds within time limit → cancel booking)
- Requires **rollback logic** (e.g., cancel order → restore stock, cancel order creation)
- Requires **asynchronous request-reply** where applicable (e.g., waiting for driver acceptance)
- Goes beyond lab examples

---

## Beyond-The-Labs (BTL) Requirement

**Recommended** to implement something not covered in labs. Worth up to **3 marks** of the 35 total.

Must clearly justify in presentation and report why the BTL is beneficial for the scenario.

### ✅ Examples That Count as BTL
- Implement/invoke APIs beyond REST (e.g., **GraphQL**, **gRPC**) — project must still have REST APIs
- Enable communication among microservices on **different physical machines**
- Enable **cross-team service reuse** on OutSystems
- Use the **message broker** in a way that goes beyond lab demonstrations
- Use an **API gateway** (e.g., KONG) in a meaningful way for the scenario

### ❌ Examples That Do NOT Count as BTL
- Deploying to cloud platforms
- Technologies covered in other courses (e.g., ESM)
- Implementing complex functionality that could just be called from an external API
- Using a different DBMS (e.g., different cloud storage) for databases easily done in MySQL
- Using a different IDE other than VS Code
- Using version control (git)
- Using multiple programming languages/frameworks
- Using different code editors or IDEs

---

## General Guidelines

- Scenario can be imaginative/futuristic but should link to a real-world problem.
- Must be **legal and morally suitable** for academic settings (e.g., no illegal gambling scenarios).
- State any **simplifications or assumptions**.
- **Functionality > aesthetics** — a fancy UI that doesn't help will not earn marks.
- You may reuse lab code with or without modifications.
- Prepare a **backup video** in case live demo fails.
- Have the setup on **more than one machine** as a backup.

---

## Deliverables

### Week 9 – Proposal (Ungraded, but poor prep = penalty)
- Prepare a proposal using the provided **Proposal Template**.
- During the 20-minute session, present informally:
  - Chosen scenario, assumptions, microservice interaction diagrams
  - Design choices and technologies
  - Conversational log with a generative AI (e.g., ChatGPT) used to identify services
  - Answers to instructor questions
- **All team members must be present**. No submission required, but very poor preparation will result in a penalty.

### Week 13 – Presentation & Demo (25 marks)
- Submit **Presentation Slides** (PPT or PDF) before the deadline.
- Slides must show:
  - Business processes and microservice design
  - Microservice Interaction diagrams / SOA Layer diagrams
  - At least **1 slide** on BTL implementation and justification (if applicable)
- **15 minutes** for presentation + demo; strict time limit — running over may result in failure for the demo portion.
- All team members must be prepared to answer questions from audience and instructors.

### Week 13 – Report (10 marks)
- Submit in **Word or PDF** format (min font size 10), following the **Report Template**.
- **Max 6 pages** (excluding cover page and appendix).
- Appendix must include (not explicitly graded but penalties apply if missing):
  - Technical Overview / SOA Layer diagrams
  - API docs for all microservices
  - Table of technical contributions per team member
- Must be self-contained and understandable without attending the presentation.

### Executables / Code Submission
- Submit all: `.py`, `.html`, `.js`, `.bat`, `.sh`, Dockerfiles, configs (`.yml`), data files (`.json`, `.csv`, `.sql`).
- Zip into one file or provide a **GitHub / SharePoint link**.
- Do **NOT** include files that can be generated (e.g., Docker images).
- If zip exceeds 100MB, consult instructor before submission.
- Must include a **`README.txt` or `README.md`** with setup and run instructions. Penalty applies if missing.

### Video Demo
- Maximum **3 minutes** recording of the application demo.
- Upload to **YouTube** (ensure access is granted).
- Submit a `video.txt` file with the YouTube URL on eLearn.
- Penalty applies if missing.

---

## Submissions

- Submit electronically via **eLearn Assignment drop-boxes** only (no email or printout).
- Submit **early** to avoid network congestion penalties.

### Late Submission Penalties
| Late Duration | Penalty |
|---------------|---------|
| Within 1 hour | 10% deduction |
| Each subsequent hour | Doubles (20% → 40% → 80% → 100%) |

---

## Marking Scheme

### (1) In-Class Presentation with Demo — 25 marks

Criteria:
- Business scenario clearly explained and justified
- User scenarios handle business exception situations (not just UI-to-microservice)
- Smooth flow and well-designed slides
- Demo clearly demonstrates discussed scenarios and works without hiccups
- Team can answer audience questions
- Team demonstrates understanding of course concepts

| Marks | Details |
|-------|---------|
| ≤12 | Sloppy presentation and demo; bare minimum technical depth |
| >12–16 | Reasonable standard; reasonable technical depth |
| >16–20 | Good presentation and demo; good technical depth |
| >20–22 | Very good presentation and demo; very good technical depth |
| >22 | Exceptional presentation and demo; exceptional technical depth |

### (2) Report — 10 marks

Criteria:
- Well-structured and professional
- Scenario clearly explained
- Design and technical implementation clearly described and justified
- Diagrams are clear and consistent with scenario
- BTL aspects clearly explained and justified
- Correct and consistent terminology

| Marks | Details |
|-------|---------|
| ≤5 | Sloppy report |
| >5–7 | Reasonable standard |
| >7–8 | Good |
| >8–9 | Very good |
| >9 | Exceptional |

### (3) Penalties (at instructor's discretion)

---

## Penalty Situations

- Fail to show scenario or draft solution design during Week 9 discussion
- Late or no submission on eLearn
- Presenting a different version of slides than the latest submitted version
- Changing slides or code after submission
- Being "busy" with own work while others are presenting (during peer evaluation)
- Running over time due to lack of preparation or testing
- Failing to demonstrate solution = **automatic failure** for demo portion
- Report exceeds page limits
- Poor inter-team or intra-team peer evaluations
- Any other inappropriate situation at instructor's discretion

---

## Notes on External Services

- **Do NOT misuse** services provided by external service providers.
- Use only **free/development sandbox** versions — do NOT rely on paid services.
- Use your **official SMU email** to create only **one** test/demo account.
- **Minimise hits** on live servers; simulate responses during development, then switch back to live servers close to demo day.
- Prepare a **backup video** in case external services go down during demo — penalties may still apply at instructor's discretion.
