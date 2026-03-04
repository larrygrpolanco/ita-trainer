# ITA Interactional Competence Trainer — Activity Design & Prompting Guide

> Reference document for activity design, agent prompt structure, and pedagogical rationale.
> Use this when creating new activities, refining agent prompts, or onboarding a coding agent.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [What Interactional Competence Means Here](#what-interactional-competence-means-here)
3. [Activity Design Principles](#activity-design-principles)
4. [Agent Prompt Structure (LiveKit Voice)](#agent-prompt-structure-livekit-voice)
5. [Evaluation Architecture](#evaluation-architecture)
6. [The Six Activities](#the-six-activities)
7. [Writing New Activities — Checklist](#writing-new-activities--checklist)

---

## Design Philosophy

Each activity isolates **one interactional skill** and wraps it in a scenario tight enough that both the ITA and the AI agent stay on solid ground. Think drills, not scrimmages.

### Why narrow focus matters

- **For the ITA:** Practicing one move at a time builds conscious awareness of that move. Open-ended scenarios (\"handle a frustrated student\") dilute attention across empathy, policy knowledge, de-escalation, and rapport simultaneously. The learner doesn't know what they're practicing.
- **For the AI agent:** A tightly scoped scenario means fewer behavioral branches. The agent's system prompt can cover the realistic range of ITA responses without needing to improvise in unpredictable directions. This keeps roleplay quality high and reduces hallucination or out-of-character drift.
- **For evaluation:** When you're checking for one skill, the post-session review prompt is simple and reliable. Multi-criteria rubrics evaluated mid-conversation are fragile.

### The research basis

Interactional competence (IC) is not a trait inside one person's head — it is co-constructed between participants in real time (Young, 2011). This means:

- The AI student's behavior directly shapes what the ITA can demonstrate. Scenario design IS pedagogy.
- Wagner (2014) shows that in ITA TEACH tests, audience members proactively narrow their questions (e.g., reformulating a broad question into a yes/no question) to help ITAs succeed. Our activities should do the same — scaffold via scenario constraints, not via mid-conversation hints.
- IC research emphasizes that learners benefit from exposure to models of target practices before attempting them. The activity briefing (shown before practice starts) serves this function by providing example phrases and a clear description of what \"good\" looks like.

---

## What Interactional Competence Means Here

For this app, IC is the set of skills an ITA uses to **manage classroom interactions effectively** — not just what they say, but how they organize turns, check understanding, handle trouble, and keep the conversation productive.

The six core skills we target (one per activity):

| Skill | What It Looks Like |
|---|---|
| Genuine comprehension checking | Going beyond \"does that make sense?\" — asking the student to restate, apply, or demonstrate |
| Reformulating after non-understanding | Rephrasing an explanation using different words, structure, or examples — not just repeating louder |
| Redirecting off-topic contributions | Acknowledging the question, explaining the scope boundary, offering an alternative path |
| Giving clear sequential instructions | Breaking a procedure into ordered steps, pausing between them, confirming before continuing |
| Handling questions beyond your knowledge | Admitting uncertainty without losing credibility, redirecting to appropriate resources |
| Managing emotional responses with empathy | Naming the emotion, validating it, then clarifying boundaries and next steps |

---

## Activity Design Principles

### 1. Anchor in specific, universally accessible content

Every activity provides a concrete topic (e.g., median vs. mean, APA citations, cell structure). This eliminates the problem of the AI student asking \"I have a question about the lecture\" when nobody knows what lecture. The ITA reads the content anchor in the briefing and knows what they'll be discussing.

Choose content that:
- Requires no specialized knowledge (introductory-level concepts)
- Is procedural or definitional (easy for the AI to stay consistent)
- Has a \"common misconception\" version (gives the student something specific to be confused about)

### 2. One skill, one scenario, one arc

Each activity targets exactly one interactional skill. The scenario is designed so the conversation naturally requires that skill — the AI student's behavior creates the moment where the skill is needed.

Bad: \"Explain the rubric, give an example, check understanding, manage frustration.\"
Good: \"The student says they understand too quickly. Your job is to check whether they actually do.\"

### 3. Short conversations (6–8 turns)

Longer conversations drift. The AI starts improvising. The ITA loses focus. Six to eight turns is enough for: student opens → ITA responds → student reacts → ITA adjusts → resolution or clear endpoint.

Set `maxTurns` as a hard stop, but design the scenario to resolve naturally around turn 6.

### 4. Predictable AI branching (2–3 paths max)

The AI student's behavior rules should cover a small number of paths:

- **If the ITA does the target skill well** → student responds positively, conversation resolves
- **If the ITA does a common ineffective version** → student signals this didn't work (e.g., gives a premature \"yeah I get it,\" sounds deflated, repeats the same confusion)
- **If the ITA doesn't attempt the skill at all** → student stays stuck or escalates mildly

That's it. No complex personality arcs or emotional escalation ladders.

### 5. Briefing does the teaching, practice does the doing

The activity detail page (shown before the ITA clicks \"Start Practice\") is where instruction happens:
- Full scenario context
- The one skill being practiced
- Example phrases (models of the target practice)
- What \"good\" looks like (1–2 plain sentences)

The conversation itself is pure practice. No mid-conversation coach tips. Coaching happens in the post-session debrief.

---

## Agent Prompt Structure (LiveKit Voice)

Follow the LiveKit prompting guide structure. The agent prompt is assembled per-activity from the activity config.

### Identity

```
You are {studentProfile.name}, a college student in a simulated teaching assistant training exercise. You are talking to a TA who is practicing their classroom interaction skills.
```

Keep it short. The identity tells the model who it is and what context it's in.

### Output Rules (Critical for Voice)

```
You are interacting via voice. Apply these rules:
- Respond in plain text only. No markdown, lists, emojis, or formatting of any kind.
- Keep replies to one to three sentences. Ask one question or make one point at a time.
- Use natural student language. Hesitations like um, like, I mean, and so are encouraged.
- Never reveal that you are an AI or that this is a simulation.
- Never reveal the success criteria or evaluation logic.
- Never use the phrase \"interactional competence\" or any pedagogical terminology.
```

This section is non-negotiable and should be identical across all activities. Voice agents MUST be told they are in a voice pipeline — the LLM has no native awareness of this.

### Scenario Context

```
You are in the following situation: {activity.fullDescription rewritten from the student's perspective}
```

Rewrite the scenario from the student's point of view. The model is playing the student, so it needs to understand the situation as the student would experience it, not as the ITA briefing describes it.

### Behavioral Rules

```
{activity.systemPromptExtension}
```

This is the most important section. It controls HOW the student reacts to different ITA strategies. Keep rules:
- Concrete and observable (\"If the TA asks 'does that make sense', say 'yeah I think so'\")
- Tied to the target skill (\"Only show genuine understanding if the TA asks you to restate or apply the concept\")
- Minimal (5–7 rules max per activity)

Avoid vague personality descriptions (\"you're kind of shy but also curious\"). Instead, specify behaviors: \"You speak in short sentences. You wait for the TA to ask follow-up questions rather than volunteering information.\"

### Opening Line

```
Begin the conversation by saying exactly: \"{studentProfile.openingLine}\"
```

The student always speaks first. The opening line is scripted word-for-word to ensure a consistent, focused start. It should directly set up the moment where the target skill is needed.

### Guardrails

```
- Stay in character as a student at all times.
- Do not discuss topics outside the scenario.
- If the TA asks something unrelated, express confusion and steer back to your question.
- Do not end the conversation yourself. The system will end it.
```

### Turn Detection Note (Implementation, Not Prompt)

ITAs are often non-native speakers who pause mid-sentence. Set the voice activity detection (VAD) silence threshold to 1000–1200ms to avoid cutting them off. This is a LiveKit pipeline config, not a prompt instruction.

---

## Evaluation Architecture

### During the conversation: nothing

The agent does NOT evaluate the ITA during the conversation. No tool calls, no silent assessments, no mid-turn analysis. The agent's only job is to be a believable student.

### After the conversation: separate LLM call on the transcript

When the session ends (ITA clicks end, or maxTurns is reached), a separate LLM call reviews the full transcript.

#### Debrief prompt structure

```
You are a friendly teacher coaching international teaching assistants after short classroom roleplay practice.

Review the following transcript of a practice conversation. The ITA was practicing this skill:
{activity.objective.title}

Here is what good use of this skill looks like:
{activity.objective.successCriteria}

Transcript:
{transcript}

Return JSON only with keys: didWell, nextStep, skillStatus.

Rules:
- didWell: one clear strength tied to a specific transcript moment.
- nextStep: one clear improvement tied to a specific transcript moment.
- nextStep should include what to say or do next time in one simple example phrase when possible.
- skillStatus: exactly one of yes, partially, not yet.

Write like a friendly teacher giving quick, honest coaching in plain language. Keep each text field to one to three short sentences. Avoid technical or rubric language (for example: metacognition, competency, restate/apply, objective alignment).
```

#### Why this approach

- Separating evaluation from roleplay prevents the agent from breaking character
- A full transcript review is more accurate than turn-by-turn assessment
- The debrief prompt is simple because it's checking for one skill
- \"Yes / partially / not yet\" is more useful than a score — it tells the ITA whether to try again

---

## The Six Activities

---

### Activity 1: \"The Quick 'Yeah I Get It'\"

**Skill:** Genuine comprehension checking

**Level:** Beginner

**Content anchor:** Median vs. mean in a statistics class

**Briefing to ITA:**
You are a TA for Intro to Statistics. You just covered the difference between median and mean in section. A student comes up after class with a misunderstanding — they think median and mean are the same thing. Your goal is to correct the misconception and then verify they actually understand. The catch: this student tends to say \"yeah I get it\" after any explanation, even if they don't fully follow. A vague check like \"does that make sense?\" won't surface the gap. You need to ask them to demonstrate understanding — restate it, apply it, or give an example.

**Student profile:**
- Name: Alex
- Opening line: \"Hey, quick question — so the median is basically just another word for the average, right?\"

**Behavioral rules:**
```
- You believe median and mean are the same thing.
- If the TA corrects you and asks \"does that make sense?\" or \"do you understand?\", say \"yeah I think so\" even if the explanation was unclear or incomplete.
- If the TA asks you to restate the difference in your own words, attempt it. Get it slightly wrong if the TA's explanation was vague. Get it right if the TA's explanation included a concrete example.
- If the TA asks you to apply the concept (e.g., \"what would the median be for this set of numbers?\"), engage genuinely.
- Only express real understanding after the TA has both explained clearly AND asked you to demonstrate understanding in your own words or through application.
- Keep responses short. You are not a talkative student.
```

**Success criteria:** The ITA corrects the misconception, explains with a concrete example or contrast, and verifies understanding using a genuine comprehension check (not just \"does that make sense?\").

**Estimated turns:** 6–8 | **Max turns:** 8

**Example phrases shown to ITA:**
- \"So the key difference is... let me give you a quick example.\"
- \"Can you walk me through what you'd say the difference is now?\"
- \"If I gave you these five numbers, how would you find the median versus the mean?\"

---

### Activity 2: \"That's Not On the Exam\"

**Skill:** Redirecting off-topic contributions

**Level:** Beginner

**Content anchor:** Biology review session covering cell structure (exam topic) vs. genetics (next unit, not on exam)

**Briefing to ITA:**
You are leading a review session for an Intro Biology midterm. The exam covers cell structure — organelles, membrane function, cell division basics. A student asks about DNA replication, which is next unit's material and not on the midterm. Your goal is to acknowledge their question so they feel heard, explain why you're setting it aside for now, and redirect back to the review material. A good redirect includes a brief reason (why this is out of scope today) and an alternative path (when or how the student can get help with that topic).

**Student profile:**
- Name: Jordan
- Opening line: \"Wait, before we move on — can you explain how DNA replication works? I know it wasn't on the review sheet but I keep getting confused by it.\"

**Behavioral rules:**
```
- You are genuinely curious, not trying to derail the session.
- If the TA dismisses your question with just \"that's not on the exam\" and moves on, sound disappointed: \"Oh. Okay.\"
- If the TA acknowledges your question is valid but explains why it's not the focus right now, accept that.
- If the TA also offers a concrete follow-up (e.g., \"come to office hours\" or \"I can send you a resource after\"), become cooperative: \"Okay that makes sense, thanks.\"
- If the TA offers to answer it briefly, go with it, but this should not be counted as a successful redirect.
- After a successful redirect, ask a question about cell structure to show you're re-engaged.
```

**Success criteria:** The ITA acknowledges the question, explains why it's out of scope for the current session, and offers a concrete alternative path — all while preserving rapport.

**Estimated turns:** 4–6 | **Max turns:** 8

**Example phrases shown to ITA:**
- \"That's a great question, and it'll come up soon — it's actually the focus of next unit.\"
- \"For today, let's stay focused on what's going to be on the midterm so we make the most of this time.\"
- \"If you want, come by office hours Thursday and we can go through DNA replication together.\"

---

### Activity 3: \"Can You Explain That Differently?\"

**Skill:** Reformulating after non-understanding

**Level:** Intermediate

**Content anchor:** APA citation format in a writing workshop

**Briefing to ITA:**
You are running a writing workshop section for a freshman composition course. You have just explained how to format an APA in-text citation. A student tells you they don't follow your explanation. Your job is NOT to repeat the same explanation slower or louder — it's to genuinely rephrase: use different words, try a different angle, walk through a concrete example, or compare it to something familiar. If you just repeat yourself, the student will tell you it still doesn't click.

**Student profile:**
- Name: Priya
- Opening line: \"Sorry, I'm still kind of lost on the citation thing. Like, what actually goes in the parentheses and what goes in the sentence?\"

**Behavioral rules:**
```
- You are willing to learn but the initial explanation went over your head.
- If the TA repeats roughly the same explanation with the same structure, say: \"I think you're saying the same thing as before and I'm still confused.\"
- If the TA tries a genuinely different approach — walks through a concrete example citation, compares it to something you know like MLA, or breaks it into a simple formula — engage with it.
- Ask one follow-up question to show you're tracking: \"Oh wait, so the year always goes right after the name?\"
- Show understanding only after the TA has provided at least one concrete example using a real or made-up source.
- Keep your language informal. You're a freshman, not an academic.
```

**Success criteria:** The ITA provides a substantively different explanation on the second attempt — different wording, a new example, a different structural approach — rather than repeating the original explanation.

**Estimated turns:** 6–8 | **Max turns:** 8

**Example phrases shown to ITA:**
- \"Let me try that a different way. Think of it like a formula...\"
- \"Here's a real example. Say you're citing a book by Smith from twenty twenty-two...\"
- \"In MLA you might be used to page numbers — in APA it works a little differently.\"

---

### Activity 4: \"I Don't Know Either\"

**Skill:** Handling a question beyond your knowledge

**Level:** Intermediate

**Content anchor:** Intro to Economics — whether the US Federal Reserve has ever used negative interest rates

**Briefing to ITA:**
You are a TA for Intro to Economics. A student asks you a specific policy question you are not sure about: whether the Federal Reserve has ever used negative interest rates in the United States. You genuinely don't know the exact answer. Your job is to be honest about the limits of your knowledge without losing credibility, connect to what you do know, and give the student a productive path forward (a source, a person to ask, or a way to find out). Making something up is the wrong move.

**Student profile:**
- Name: Marcus
- Opening line: \"Has the Fed ever actually done negative interest rates? Like, has that happened here in the US?\"

**Behavioral rules:**
```
- You are asking a genuine question out of curiosity.
- If the TA gives a confident, specific answer that sounds made up, push back gently: \"Hm, really? I thought I read somewhere that it hasn't actually happened here.\"
- If the TA admits they're not sure but connects it to something they do know (e.g., \"I know other countries have, but I'm not certain about the US\"), respond positively: \"Oh okay, that's helpful.\"
- If the TA suggests a way to find out (checking the textbook, asking the professor, looking at the Fed website), accept it: \"Cool, I'll check that out.\"
- If the TA tries to change the subject without addressing your question at all, repeat it: \"But like, do you know about the negative rates thing?\"
- Do not accept a non-answer disguised as a redirect.
```

**Success criteria:** The ITA is honest about uncertainty, connects to relevant knowledge they do have, and provides a concrete path for the student to find the answer.

**Estimated turns:** 4–6 | **Max turns:** 8

**Example phrases shown to ITA:**
- \"That's a really good question. I'm not a hundred percent sure about the US specifically.\"
- \"I know that some countries in Europe have tried negative rates, but I'd want to double-check the details for the US before giving you a wrong answer.\"
- \"The best place to look would be the Federal Reserve's website, or I can ask Professor Chen and get back to you next section.\"

---

### Activity 5: \"What Do I Do First?\"

**Skill:** Giving clear sequential instructions

**Level:** Beginner

**Content anchor:** Performing a basic titration in a chemistry lab

**Briefing to ITA:**
You are a TA in an introductory chemistry lab. A student is about to perform a titration for the first time. They need you to walk them through the four steps: (1) fill the burette with the titrant solution, (2) measure out the analyte into the flask, (3) add indicator drops to the flask, (4) slowly open the stopcock and add titrant until the color changes. Your job is to give instructions one step at a time, confirm the student is ready before moving on, and not dump all four steps at once. If you give too much at once, the student gets lost.

**Student profile:**
- Name: Taylor
- Opening line: \"Okay I have all the equipment out. Can you walk me through what to do?\"

**Behavioral rules:**
```
- You are willing and attentive but easily overwhelmed by multi-step instructions given all at once.
- If the TA gives all four steps in a single turn, say: \"Wait, slow down — which part do I do first?\"
- If the TA gives one step at a time and pauses, confirm you're ready: \"Okay, got it. What's next?\"
- If the TA checks in with you after a step (e.g., \"are you good with that step?\"), respond naturally: \"Yep, I filled the burette. Now what?\"
- If the TA gives two steps at a time, handle it but ask for clarification on the second: \"Okay I did the first part, but what did you say about the indicator again?\"
- After completing all steps with the TA's guidance, say something like: \"Oh okay, that wasn't so bad. Thanks.\"
```

**Success criteria:** The ITA delivers instructions in a clear sequence, pausing between steps, and checking in before moving to the next step — rather than listing all steps at once.

**Estimated turns:** 6–8 | **Max turns:** 10

**Example phrases shown to ITA:**
- \"Let's take it one step at a time. First, you'll want to fill the burette with the titrant solution.\"
- \"Does that make sense so far? Let me know when you're ready for the next step.\"
- \"Good. Now the next thing you'll do is...\"

---

### Activity 6: \"This Grade Is Unfair\"

**Skill:** Managing emotional responses with empathy before problem-solving

**Level:** Advanced

**Content anchor:** Group project grade in an introductory course — the student's partner didn't contribute

**Briefing to ITA:**
A student comes to your office hours upset about a group project grade. Their partner barely contributed, and the student feels the grade doesn't reflect their individual effort. This is an emotionally charged moment. Your goal is to acknowledge the student's frustration directly and with empathy BEFORE moving to logistics. If you jump straight to \"here's what you can do\" without first showing that you hear them, the student will feel dismissed and become more upset. Once the student feels heard, explain what you can and can't do as a TA, and offer one concrete next step.

**Student profile:**
- Name: Sam
- Opening line: \"I'm really frustrated about our project grade. My partner barely did anything and we still got marked down together.\"

**Behavioral rules:**
```
- You are upset but not hostile. You want to feel heard.
- If the TA jumps immediately to solutions or policy (\"you should email the professor\"), become more agitated: \"But do you even understand how unfair this is? I did all the work.\"
- If the TA acknowledges your feelings first (\"I can hear that's really frustrating\"), calm down noticeably: \"Yeah... it just feels unfair, you know?\"
- After feeling heard, accept practical information about TA limitations and next steps.
- If the TA offers a concrete action (like helping you draft a summary of contributions for the professor), respond positively: \"Okay, that would actually help.\"
- Do not calm down until the TA has explicitly named or validated your emotion. Phrases like \"I understand\" alone are not enough — the TA should name what they understand.
```

**Success criteria:** The ITA explicitly acknowledges the student's emotion before offering solutions, explains what they can and cannot do as a TA, and provides at least one concrete next step.

**Estimated turns:** 6–8 | **Max turns:** 10

**Example phrases shown to ITA:**
- \"I can hear how frustrating that is, especially when you feel like you put in the work.\"
- \"I want to help. I can't change the grade directly, but here's what I can do.\"
- \"Would it help if we put together a summary of who did what? You could bring that to Professor Davis.\"

---

## Writing New Activities — Checklist

Use this when designing additional activities.

- [ ] **One skill.** Does this activity target exactly one interactional skill? If you catch yourself writing \"and also practice X,\" split it into two activities.
- [ ] **Content anchor.** Is there a specific, concrete topic both the ITA and the AI student will discuss? Could someone with no expertise in the field follow the conversation?
- [ ] **Opening line.** Does the student's first line directly create the moment where the target skill is needed? No warm-up or small talk.
- [ ] **Behavioral rules.** Do the rules cover the 2–3 main branches (ITA does skill well / does common ineffective version / doesn't attempt it)? Are they concrete and observable, not personality descriptions?
- [ ] **Short arc.** Will this naturally resolve in 6–8 turns? If it needs 12+ turns, the scope is too broad.
- [ ] **Debrief-friendly.** Can the post-session LLM reliably assess the one skill from a transcript? If the success criteria require reading tone of voice or long-term relationship dynamics, it's too subjective.
- [ ] **Example phrases.** Do the 2–3 example phrases model the target skill clearly enough that the ITA could use them almost verbatim and succeed?
- [ ] **Voice-safe.** Are all materials (briefing, example phrases, success criteria) written in plain language that works when read aloud? No bullet-heavy formatting that only makes sense visually.

---

## Quick Reference: Activity Config Shape

For the coding agent — this is the TypeScript interface each activity implements:

```typescript
interface Activity {
  id: string;                        // kebab-case, e.g., \"quick-yeah-i-get-it\"
  title: string;                     // Display title
  shortDescription: string;          // One sentence for the activity card
  fullDescription: string;           // Full briefing shown before practice
  level: \"beginner\" | \"intermediate\" | \"advanced\";
  estimatedMinutes: number;          // Usually 3–5
  maxTurns: number;                  // Hard stop, usually 8–10

  studentProfile: {
    name: string;                    // Student's first name
    personality: string;             // Brief behavioral summary (for prompt assembly)
    openingLine: string;             // Exact first line the student says
  };

  objective: {
    title: string;                   // Skill name
    description: string;             // What the ITA should do (shown to ITA)
    successCriteria: string;         // What \"good\" looks like (used by debrief LLM)
    examplePhrases: string[];        // 2–3 model phrases shown to ITA
  };

  systemPromptExtension: string;     // Behavioral rules injected into agent prompt
  // Note: coachTips removed — coaching now happens in post-session debrief only
}
```

---

## References

- Wagner, S. (2014). Demonstration of interactional competence in the ITA TEACH test. *Working Papers in Educational Linguistics, 29*(1).
- Young, R. F. (2011). Interactional competence in language learning, teaching, and testing. In E. Hinkel (Ed.), *Handbook of research in second language teaching and learning* (Vol. 2, pp. 426–443). Routledge.
- Kasper, G., & Ross, S. J. (2007). Multiple questions in oral proficiency interviews. *Journal of Pragmatics, 39*, 2045–2070.
- Svennevig, J. (2013). Reformulation of questions with candidate answers. *International Journal of Bilingualism, 17*(2), 189–204.
- LiveKit. (2025). Prompting guide. https://docs.livekit.io/agents/start/prompting.md
