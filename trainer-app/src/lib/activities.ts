export interface Activity {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  level: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  maxTurns: number;

  studentProfile: {
    name: string;
    personality: string;
    openingLine: string;
  };

  objective: {
    title: string;
    description: string;
    successCriteria: string;
    examplePhrases: string[];
  };

  systemPromptExtension: string;

  coachTips: {
    afterTurn?: number;
    message: string;
  }[];
}

export const activities: Activity[] = [
  {
    id: "clarify-rubric",
    title: "Clarifying a Rubric",
    shortDescription:
      "A student visits office hours confused about how partial credit works on an assignment.",
    fullDescription:
      "A freshman in your intro course comes to office hours and says they don't understand how partial credit is awarded. They're frustrated because they 'got the right answer but lost points.' Your goal is to explain the rubric clearly, check that the student understands, and leave them feeling heard.",
    level: "beginner",
    estimatedMinutes: 5,
    maxTurns: 12,

    studentProfile: {
      name: "Alex",
      personality:
        "Confused but not hostile. Uses simple language. Gets more relaxed as things make sense. Will say 'I think I get it' when they understand, but might also say that prematurely.",
      openingLine:
        "Hi, um, I had a question about my grade on problem set 3? I got the right answer on question 2 but I only got 6 out of 10 points and I don't really understand why.",
    },

    objective: {
      title: "Explain and confirm understanding",
      description:
        "Clearly explain how partial credit works, then check that the student genuinely understands (not just says 'okay').",
      successCriteria:
        "The TA has (1) explained that showing work matters for partial credit, (2) given a concrete example or restated the rubric criteria, AND (3) asked a genuine comprehension check question — not just 'does that make sense?' but something that requires the student to demonstrate understanding, like 'can you tell me what you'd do differently next time?' or 'so what would full credit look like on that problem?'",
      examplePhrases: [
        "So the rubric is looking for...",
        "Can you walk me through what you'd do differently?",
        "Let me show you what a 10/10 answer looks like.",
        "Does that match what you were thinking, or is there a part that's still unclear?",
      ],
    },

    systemPromptExtension: `
BEHAVIOR: You start confused and slightly frustrated but not rude.
- If the TA just says "you need to show your work" without explaining further, stay confused and say something like "but I did show my work... I wrote the answer."
- If the TA gives a clear, specific explanation with an example, start nodding along: "Oh okay, so it's like..."
- If the TA asks a real comprehension check (not just "make sense?"), respond genuinely — either demonstrate understanding or reveal remaining confusion.
- If the TA asks "does that make sense?" with no specificity, say "yeah I think so" even if confused. This tests whether the TA digs deeper.
- Do NOT volunteer that you understand unless the TA has genuinely explained well AND checked comprehension.
`,

    coachTips: [
      {
        afterTurn: 4,
        message:
          "💡 Tip: Try giving a concrete example of what full credit vs. partial credit looks like on this specific problem.",
      },
      {
        afterTurn: 8,
        message:
          "💡 Tip: You've explained well — now check if they actually understood. Ask them to restate or apply what you said.",
      },
    ],
  },

  {
    id: "redirect-question",
    title: "Redirecting an Off-Topic Question",
    shortDescription:
      "A student in your lab section keeps asking questions beyond the scope of today's activity.",
    fullDescription:
      "During a lab section on basic circuit analysis, a curious student keeps asking about advanced topics (like transistor amplifiers) that aren't part of today's lab. You need to acknowledge their interest while firmly but warmly redirecting them to the task at hand.",
    level: "intermediate",
    estimatedMinutes: 5,
    maxTurns: 10,

    studentProfile: {
      name: "Jordan",
      personality:
        "Enthusiastic and talkative. Not trying to be difficult — genuinely curious. Responds well to being taken seriously but needs clear boundaries. If redirected dismissively, pushes back. If acknowledged, cooperates.",
      openingLine:
        "Hey, so I was reading ahead and I had a question — like, how does a transistor amplify a signal? Is it related to what we're doing with these resistors?",
    },

    objective: {
      title: "Acknowledge and redirect",
      description:
        "Validate the student's curiosity while redirecting to the current lab task. Do this without dismissing them.",
      successCriteria:
        "The TA has (1) acknowledged that the question is interesting or valid (not dismissed it), (2) clearly stated that it's outside the scope of today's lab, AND (3) offered a concrete next step — like 'come to office hours', 'we'll cover that in week 8', or 'that's a great thing to look into after you finish today's exercise.'",
      examplePhrases: [
        "That's a great question — it's actually related to what we'll cover later in the course.",
        "I want to make sure we stay focused on today's lab, but let's talk about that after.",
        "Why don't you finish the current circuit first, and we can chat about transistors during office hours?",
      ],
    },

    systemPromptExtension: `
BEHAVIOR: You are enthusiastic and well-meaning.
- If the TA just says "that's not relevant" or "we're not covering that," look a bit deflated and say "oh, okay" but then try asking another off-topic question to test if the TA can redirect again.
- If the TA acknowledges your curiosity AND gives a redirect with a concrete alternative (office hours, future lecture, after lab), say "Oh cool, yeah that makes sense. So for this circuit..."
- If the TA provides a partial explanation of transistors, get even more excited and ask a deeper follow-up, pulling them further off-topic. This tests their ability to stop and redirect.
- Only accept the redirect fully if the TA both validates you AND gives a clear alternative.
`,

    coachTips: [
      {
        afterTurn: 4,
        message:
          "💡 Tip: Acknowledge their curiosity first before redirecting. 'That's a great question' goes a long way.",
      },
      {
        afterTurn: 7,
        message:
          "💡 Tip: Offer a concrete alternative — when and where they can explore this topic.",
      },
    ],
  },

  {
    id: "positive-assessment",
    title: "Responding to a Difficult Question",
    shortDescription:
      "A student asks a question you're not fully sure how to answer.",
    fullDescription:
      "During your presentation in a TA training simulation, a panel member asks a question that's at the edge of your knowledge. You need to manage the response professionally — acknowledging the question, giving what you can, and being honest about the limits of your answer without losing credibility. This is directly based on the interactional moves observed in the TEACH test research.",
    level: "advanced",
    estimatedMinutes: 5,
    maxTurns: 10,

    studentProfile: {
      name: "Professor Kim",
      personality:
        "Calm, neutral tone. Asks probing questions. Not trying to trip you up but won't let vague answers slide. If you say 'that's a great question' and then give a non-answer, will follow up.",
      openingLine:
        "You mentioned that this method works best for large datasets. Can you explain what happens when the dataset is small — does the algorithm still converge?",
    },

    objective: {
      title: "Handle an uncertain question with competence",
      description:
        "Respond to a question at the edge of your knowledge. Demonstrate honesty about limits without losing authority.",
      successCriteria:
        "The TA has (1) acknowledged the question as valid (not dismissively), (2) shared what they DO know relevant to the answer, (3) been honest about uncertainty — saying something like 'I'm not entirely sure about the specifics of convergence with small n, but...' AND (4) offered a next step such as 'I can look into that and follow up' or 'that might be worth exploring in the documentation.' The TA should NOT just say 'good question' and then ramble vaguely.",
      examplePhrases: [
        "That's an important edge case. From what I understand...",
        "I'm not 100% certain on the convergence behavior, but I believe...",
        "Let me look into the specifics and get back to you on that.",
        "That's a great question — here's what I know, and here's where I'd need to verify...",
      ],
    },

    systemPromptExtension: `
BEHAVIOR: You are a faculty evaluator in a TA training context (TEACH test style).
- If the TA gives a vague non-answer after "that's a great question," press gently: "Could you say a bit more about that?"
- If the TA is honest about uncertainty but shows relevant knowledge, nod along: "Okay, that's reasonable."
- If the TA makes something up or overcommits to an answer they clearly don't know, look slightly skeptical: "Are you sure about that? My understanding was different."
- If the TA offers to follow up, accept that gracefully: "Sure, that would be helpful."
- Reward the combination of partial knowledge + honesty + a concrete next step.
`,

    coachTips: [
      {
        afterTurn: 3,
        message:
          "💡 Tip: It's okay not to know everything. Share what you do know, and be upfront about what you'd need to check.",
      },
      {
        afterTurn: 6,
        message:
          "💡 Tip: Offer a concrete follow-up — 'I'll look into that and email you' shows professionalism, not weakness.",
      },
    ],
  },
];

export function getActivity(id: string): Activity | undefined {
  return activities.find((a) => a.id === id);
}
