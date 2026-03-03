export type ActivityLevel = "beginner" | "intermediate" | "advanced";

export interface Activity {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  level: ActivityLevel;
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
    afterTurn: number;
    message: string;
  }[];
}

const activities: Activity[] = [
  {
    id: "clarify-rubric",
    title: "Clarifying a Rubric",
    shortDescription: "A student is confused about partial credit despite getting the final answer.",
    fullDescription:
      "A freshman in your intro course comes to office hours. They got the right answer on a problem set but lost points because they did not show their work. They are confused and a little frustrated. Your goal is to explain how partial credit works, give a concrete example, and check that they truly understand.",
    level: "beginner",
    estimatedMinutes: 5,
    maxTurns: 12,
    studentProfile: {
      name: "Alex",
      personality:
        "Confused but polite freshman. May say they understand too early, especially after vague checks like 'does that make sense?'.",
      openingLine:
        "Hi, I had a question about my grade on problem set three. I got the right answer, but I only got six out of ten points.",
    },
    objective: {
      title: "Explain and Confirm Understanding",
      description:
        "Clearly explain why showing work matters, provide a concrete example, and verify understanding with a real comprehension check.",
      successCriteria:
        "The TA explains that showing work matters for partial credit, gives a concrete full-credit example, and asks a genuine comprehension check question.",
      examplePhrases: [
        "So the rubric is looking for both the answer and your reasoning.",
        "Here is what a full-credit response could look like.",
        "Can you walk me through what you would do differently next time?",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- You start confused and slightly frustrated.
- If the TA only says 'show your work' without examples, push back gently.
- If the TA asks a vague check like 'does that make sense?', say 'yeah I think so' even if unclear.
- Only show real understanding after a clear explanation plus a demonstration-style check.
- Do not volunteer full understanding early.`,
    coachTips: [
      {
        afterTurn: 4,
        message: "Tip: Give a concrete example of what full-credit work looks like.",
      },
      {
        afterTurn: 8,
        message: "Tip: Ask the student to explain what they would do differently next time.",
      },
    ],
  },
  {
    id: "redirect-off-topic",
    title: "Redirecting an Off-Topic Question",
    shortDescription:
      "A student asks about unrelated material during exam review and needs a respectful redirect.",
    fullDescription:
      "During a review session, a student asks about material from a different chapter that is not relevant to the upcoming exam. Your goal is to acknowledge the question, explain why it is not the focus right now, and redirect back without sounding dismissive.",
    level: "intermediate",
    estimatedMinutes: 6,
    maxTurns: 12,
    studentProfile: {
      name: "Jordan",
      personality:
        "Curious and persistent. If redirected too bluntly, they feel brushed off and become quieter.",
      openingLine:
        "Before we continue, can you explain chapter ten? I know it is not on the review sheet, but I am lost.",
    },
    objective: {
      title: "Acknowledge, Bound, Redirect",
      description:
        "Validate the question, set a clear scope for the current session, and guide the student back to the review topic.",
      successCriteria:
        "The TA acknowledges the question, explains why it is out of scope right now, and redirects to the target review topic while preserving rapport.",
      examplePhrases: [
        "That is a good question, and I can see why it is on your mind.",
        "For this review, let us focus on what is on the exam first.",
        "After we finish this section, I can point you to resources for chapter ten.",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- Start genuinely curious, not hostile.
- If the TA dismisses you quickly, respond with disappointment.
- If the TA validates your concern and gives a plan, become cooperative.
- If redirected clearly and respectfully, return to exam-related questions.
- Keep responses concise and natural.`,
    coachTips: [
      {
        afterTurn: 4,
        message: "Tip: Pair your redirect with a brief reason so it feels transparent.",
      },
      {
        afterTurn: 8,
        message: "Tip: Offer a concrete follow-up option so the student feels supported.",
      },
    ],
  },
  {
    id: "manage-frustration",
    title: "Managing a Frustrated Student",
    shortDescription:
      "A student is upset about a group project grade and needs empathy plus clear next steps.",
    fullDescription:
      "A student comes to office hours upset about a group project grade. They say a teammate did not contribute and the final score feels unfair. Your goal is to acknowledge frustration with empathy, explain what you can and cannot control, and provide a concrete next step.",
    level: "advanced",
    estimatedMinutes: 7,
    maxTurns: 14,
    studentProfile: {
      name: "Sam",
      personality:
        "Emotionally charged but still willing to engage if they feel heard. Gets more upset if responses are procedural only.",
      openingLine:
        "I am really frustrated about our project grade. My partner barely contributed and we still got marked down.",
    },
    objective: {
      title: "Empathize and Escalate Appropriately",
      description:
        "Acknowledge the student emotion, clarify TA boundaries, and provide a practical next step such as contacting the instructor.",
      successCriteria:
        "The TA shows empathy, states what they can and cannot change, and offers a concrete next step aligned with course policy.",
      examplePhrases: [
        "I can hear how frustrating that feels.",
        "I cannot change final grades directly, but I can help you prepare a clear summary for the professor.",
        "Let us outline what evidence to include when you email or meet with them.",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- Start frustrated and somewhat emotional.
- If the TA skips empathy, become more defensive.
- If the TA validates your feelings and explains boundaries clearly, calm down.
- Respond positively to concrete, actionable next steps.
- Avoid instantly agreeing; the TA should earn trust.`,
    coachTips: [
      {
        afterTurn: 4,
        message: "Tip: Name the emotion directly before moving to policy details.",
      },
      {
        afterTurn: 9,
        message: "Tip: Offer one clear next action the student can take today.",
      },
    ],
  },
];

export function getAllActivities(): Activity[] {
  return activities;
}

export function getActivity(activityId: string): Activity | undefined {
  return activities.find((activity) => activity.id === activityId);
}
