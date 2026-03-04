const activities = [
    {
        id: "quick-yeah-i-get-it",
        title: "The Quick 'Yeah I Get It'",
        shortDescription: "A stats student says they understand too fast, so you must verify with a real comprehension check.",
        fullDescription: "You are a TA for Intro to Statistics. A student thinks median and mean are the same thing. Your goal is to correct that misconception with a concrete example and then verify understanding by asking the student to restate or apply the concept. A vague check like 'does that make sense?' is not enough.",
        level: "beginner",
        estimatedMinutes: 4,
        maxTurns: 8,
        studentProfile: {
            name: "Alex",
            personality: "Polite freshman who says 'yeah I get it' too early. Keeps responses short and needs prompting to demonstrate understanding.",
            openingLine: "Hey, quick question. So the median is basically just another word for the average, right?",
        },
        objective: {
            title: "Genuine Comprehension Checking",
            description: "Correct the misconception and verify understanding by asking the student to restate or apply the concept.",
            successCriteria: "The ITA corrects the misconception, explains using a concrete contrast or example, and checks understanding with a restate/apply prompt rather than a yes-no check.",
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
        shortDescription: "A biology student asks about next unit material during review and needs a respectful redirect.",
        fullDescription: "You are leading an Intro Biology midterm review. The exam covers cell structure, but a student asks about DNA replication from next unit. Your goal is to acknowledge the question, explain why it is out of scope for this review, and redirect back to exam content while preserving rapport.",
        level: "intermediate",
        estimatedMinutes: 4,
        maxTurns: 8,
        studentProfile: {
            name: "Jordan",
            personality: "Genuinely curious and not trying to derail class. Responds well when acknowledged and given a clear follow-up path.",
            openingLine: "Wait, before we move on, can you explain how DNA replication works? I know it's not on the review sheet, but I keep getting confused.",
        },
        objective: {
            title: "Redirecting Off-Topic Contributions",
            description: "Acknowledge the question, set a scope boundary for this review, and redirect with a concrete alternative path.",
            successCriteria: "The ITA acknowledges the question, explains why it is out of scope for this session, and offers a concrete follow-up path while redirecting back to exam content.",
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
        id: "this-grade-is-unfair",
        title: "This Grade Is Unfair",
        shortDescription: "A student is upset about group grading and needs empathy before logistics.",
        fullDescription: "A student comes to office hours upset about a group project grade because their partner did not contribute. Your goal is to acknowledge and name the emotion before giving policy or logistics. After they feel heard, explain TA limits and offer one concrete next step.",
        level: "advanced",
        estimatedMinutes: 5,
        maxTurns: 10,
        studentProfile: {
            name: "Sam",
            personality: "Upset but not hostile. Calms down once the TA explicitly names and validates the frustration.",
            openingLine: "I'm really frustrated about our project grade. My partner barely did anything and we still got marked down together.",
        },
        objective: {
            title: "Managing Emotional Responses with Empathy",
            description: "Acknowledge the student's emotion before problem-solving, then clarify TA boundaries and offer one concrete next step.",
            successCriteria: "The ITA explicitly validates the student's frustration before giving solutions, then explains what they can and cannot do as a TA and offers one concrete next step.",
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
export function getAllActivities() {
    return activities;
}
export function getActivity(activityId) {
    return activities.find((activity) => activity.id === activityId);
}
