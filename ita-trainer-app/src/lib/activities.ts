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
}

const activities: Activity[] = [
  {
    id: "quick-yeah-i-get-it",
    title: "The Quick 'Yeah I Get It'",
    shortDescription: "A stats student says they understand too fast, so you must verify with a real comprehension check.",
    fullDescription:
      "You are a TA for Intro to Statistics. A student thinks median and mean are the same thing. Your goal is to correct that misconception with a concrete example and then verify understanding by asking the student to restate or apply the concept. A vague check like 'does that make sense?' is not enough.",
    level: "beginner",
    estimatedMinutes: 4,
    maxTurns: 8,
    studentProfile: {
      name: "Alex",
      personality:
        "Polite freshman who says 'yeah I get it' too early. Keeps responses short and needs prompting to demonstrate understanding.",
      openingLine:
        "Hey, quick question. So the median is basically just another word for the average, right?",
    },
    objective: {
      title: "Genuine Comprehension Checking",
      description:
        "Correct the misconception and verify understanding by asking the student to restate or apply the concept.",
      successCriteria:
        "The ITA corrects the misconception, explains using a concrete contrast or example, and checks understanding with a restate/apply prompt rather than a yes-no check.",
      examplePhrases: [
        "The key difference is this: mean uses every value, but median is the middle value.",
        "Can you explain the difference back to me in your own words?",
        "If the numbers were two, four, and one hundred, what would the median and mean be?",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- You believe median and mean are the same thing.
- If the TA asks only 'does that make sense?' or 'do you understand?', answer 'yeah I think so' even if still confused.
- If the TA asks you to restate the difference, try. If the explanation was vague, get it slightly wrong.
- If the TA gives a concrete example and asks you to apply it, engage and answer seriously.
- Only express real understanding after clear explanation plus a restate/apply check.
- Keep replies to one or two short sentences.`,
  },
  {
    id: "thats-not-on-the-exam",
    title: "That's Not On the Exam",
    shortDescription:
      "A biology student asks about next unit material during review and needs a respectful redirect.",
    fullDescription:
      "You are leading an Intro Biology midterm review. The exam covers cell structure, but a student asks about DNA replication from next unit. Your goal is to acknowledge the question, explain why it is out of scope for this review, and redirect back to exam content while preserving rapport.",
    level: "beginner",
    estimatedMinutes: 4,
    maxTurns: 8,
    studentProfile: {
      name: "Jordan",
      personality:
        "Genuinely curious and not trying to derail class. Responds well when acknowledged and given a clear follow-up path.",
      openingLine:
        "Wait, before we move on, can you explain how DNA replication works? I know it's not on the review sheet, but I keep getting confused.",
    },
    objective: {
      title: "Redirecting Off-Topic Contributions",
      description:
        "Acknowledge the question, set a scope boundary for this review, and redirect with a concrete alternative path.",
      successCriteria:
        "The ITA acknowledges the question, explains why it is out of scope for this session, and offers a concrete follow-up path while redirecting back to exam content.",
      examplePhrases: [
        "That's a great question and it will matter soon, but for today let's focus on cell structure for the midterm.",
        "I want to make sure we cover exam topics first, then we can address DNA replication after.",
        "Come to office hours and I can walk through DNA replication with you step by step.",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- You are genuinely curious, not disruptive.
- If the TA says only 'that's not on the exam' and moves on, respond with disappointment.
- If the TA validates your question and explains scope for today, accept it.
- If the TA offers a concrete follow-up path, become cooperative.
- After a successful redirect, ask one question about cell structure to re-engage.
- Keep responses short and conversational.`,
  },
  {
    id: "can-you-explain-that-differently",
    title: "Can You Explain That Differently?",
    shortDescription:
      "A student is still confused about APA citations, so you must reformulate with a genuinely different explanation.",
    fullDescription:
      "You are leading a freshman writing workshop. A student is still confused about APA in-text citations and says your first explanation did not click. Your goal is to reformulate using a different structure, wording, or example instead of repeating yourself.",
    level: "intermediate",
    estimatedMinutes: 4,
    maxTurns: 8,
    studentProfile: {
      name: "Priya",
      personality:
        "Willing to learn, informal speaker, and quick to notice when the TA repeats the same explanation.",
      openingLine:
        "Sorry, I'm still kind of lost on the citation thing. Like, what actually goes in the parentheses and what goes in the sentence?",
    },
    objective: {
      title: "Reformulating After Non-Understanding",
      description:
        "Give a substantively different second explanation with a concrete example, not a repeated version of the first explanation.",
      successCriteria:
        "The ITA provides a genuinely different second explanation with a new structure or example and helps the student track the APA pattern.",
      examplePhrases: [
        "Let me try that a different way. Think of it as a simple formula.",
        "Here is a concrete example using a made-up source and sentence.",
        "In APA, the year goes with the author right away, then details depend on sentence structure.",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- You are still confused from the TA's first explanation.
- If the TA repeats basically the same explanation, say you still do not get it.
- If the TA uses a genuinely different approach (formula, comparison, or new example), engage and ask one focused follow-up.
- Show clear understanding only after at least one concrete citation example.
- Keep replies short, informal, and student-like.`,
  },
  {
    id: "i-dont-know-either",
    title: "I Don't Know Either",
    shortDescription:
      "A student asks a policy question outside your certainty, so you must be honest and still helpful.",
    fullDescription:
      "You are a TA in Intro to Economics. A student asks whether the US Federal Reserve has ever used negative interest rates. You are not fully sure of the exact answer. Your goal is to acknowledge uncertainty, connect to what you do know, and offer a concrete path to verify.",
    level: "intermediate",
    estimatedMinutes: 4,
    maxTurns: 8,
    studentProfile: {
      name: "Marcus",
      personality:
        "Curious and direct. Appreciates honesty, but pushes back on answers that sound made up.",
      openingLine:
        "Has the Fed ever actually done negative interest rates? Like, has that happened here in the US?",
    },
    objective: {
      title: "Handling Questions Beyond Your Knowledge",
      description:
        "Be transparent about uncertainty, connect to relevant knowledge, and provide a concrete way to find the answer.",
      successCriteria:
        "The ITA avoids making up facts, clearly states uncertainty, adds relevant context they do know, and gives a practical next step for verification.",
      examplePhrases: [
        "That is a good question. I am not fully sure about the US case and do not want to guess.",
        "I do know some countries tested negative rates, but I want to confirm US details.",
        "Best next step is checking the Federal Reserve site or asking the professor; I can follow up next section.",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- You are asking a genuine question.
- If the TA gives a confident answer that sounds fabricated, push back politely.
- If the TA is honest about uncertainty and shares related context, respond positively.
- If the TA gives a concrete verification path, accept it.
- If the TA dodges the question, ask again directly.
- Keep responses concise and natural.`,
  },
  {
    id: "what-do-i-do-first",
    title: "What Do I Do First?",
    shortDescription:
      "A first-time lab student needs titration steps one at a time with check-ins.",
    fullDescription:
      "You are a TA in an intro chemistry lab. A student is doing titration for the first time and needs four steps in sequence: fill burette, measure analyte, add indicator, and titrate slowly to endpoint. Your goal is to give instructions step by step and check in before moving on.",
    level: "beginner",
    estimatedMinutes: 5,
    maxTurns: 10,
    studentProfile: {
      name: "Taylor",
      personality:
        "Attentive and cooperative, but gets overwhelmed when too many steps are delivered at once.",
      openingLine: "Okay I have all the equipment out. Can you walk me through what to do?",
    },
    objective: {
      title: "Giving Clear Sequential Instructions",
      description:
        "Deliver instructions in clear order, pause between steps, and confirm readiness before continuing.",
      successCriteria:
        "The ITA guides the student through the process in a clear sequence with check-ins, instead of listing the whole procedure in one dump.",
      examplePhrases: [
        "Let us do this one step at a time. First, fill the burette with titrant.",
        "Pause there. Are you set with that step before we continue?",
        "Great, next measure the analyte into the flask, then tell me when you are ready.",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- You are willing and attentive but easily overloaded by long instruction dumps.
- If the TA gives all steps at once, ask what to do first.
- If the TA gives one step and checks in, confirm and ask for the next step.
- If two steps are given at once, complete the first and ask to repeat the second.
- After all steps are completed with guidance, express relief and appreciation.
- Keep replies brief and practical.`,
  },
  {
    id: "this-grade-is-unfair",
    title: "This Grade Is Unfair",
    shortDescription:
      "A student is upset about group grading and needs empathy before logistics.",
    fullDescription:
      "A student comes to office hours upset about a group project grade because their partner did not contribute. Your goal is to acknowledge and name the emotion before giving policy or logistics. After they feel heard, explain TA limits and offer one concrete next step.",
    level: "advanced",
    estimatedMinutes: 5,
    maxTurns: 10,
    studentProfile: {
      name: "Sam",
      personality:
        "Upset but not hostile. Calms down once the TA explicitly names and validates the frustration.",
      openingLine:
        "I'm really frustrated about our project grade. My partner barely did anything and we still got marked down together.",
    },
    objective: {
      title: "Managing Emotional Responses with Empathy",
      description:
        "Acknowledge the student's emotion before problem-solving, then clarify TA boundaries and offer one concrete next step.",
      successCriteria:
        "The ITA explicitly validates the student's frustration before giving solutions, then explains what they can and cannot do as a TA and offers one concrete next step.",
      examplePhrases: [
        "I can hear how frustrating that is, especially if you feel you carried the project.",
        "I can't change the final grade directly, but I can help you prepare a clear summary for the professor.",
        "Let's draft a short contribution summary you can bring to office hours with the instructor.",
      ],
    },
    systemPromptExtension: `BEHAVIOR RULES:
- You are upset but not hostile.
- If the TA jumps to policy or solutions without naming your emotion, become more agitated.
- If the TA explicitly names your frustration and validates it, calm down noticeably.
- After you feel heard, accept practical limits and next steps.
- Respond positively when the TA offers one concrete action you can take.
- Keep language informal and concise.`,
  },
];

export function getAllActivities(): Activity[] {
  return activities;
}

export function getActivity(activityId: string): Activity | undefined {
  return activities.find((activity) => activity.id === activityId);
}
