import { ServerOptions, cli, defineAgent, voice, } from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createStudentAgent, getOpeningLine } from "./agent";
import * as activitiesModule from "../../src/lib/activities";
dotenv.config({ path: "../.env.local" });
const sharedActivitiesModule = "default" in activitiesModule ? activitiesModule.default : activitiesModule;
const { getActivity } = sharedActivitiesModule;
function getActivityIdFromRoomName(roomName) {
    const parts = roomName.split("-");
    const prefix = parts.at(0);
    if (parts.length < 3 || prefix !== "ita") {
        return "general-practice";
    }
    return parts.slice(1, -1).join("-");
}
function asRecord(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    return value;
}
function getString(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value;
        }
    }
    return null;
}
function getBoolean(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "boolean") {
            return value;
        }
    }
    return null;
}
function extractTranscriptText(event) {
    const record = asRecord(event);
    if (!record) {
        return null;
    }
    const direct = getString(record, ["transcript", "text", "message", "content"]);
    if (direct) {
        return direct;
    }
    const alternatives = record.alternatives;
    if (!Array.isArray(alternatives) || alternatives.length === 0) {
        return null;
    }
    const first = asRecord(alternatives[0]);
    if (!first) {
        return null;
    }
    return getString(first, ["transcript", "text", "message", "content"]);
}
function isFinalTranscription(event) {
    const record = asRecord(event);
    if (!record) {
        return true;
    }
    return getBoolean(record, ["isFinal", "final", "lk.transcription_final", "transcriptionFinal"]) ?? true;
}
function includesAny(text, terms) {
    return terms.some((term) => text.includes(term));
}
function evaluateObjective(activityId, joinedUserText) {
    const text = joinedUserText.toLowerCase();
    if (activityId === "clarify-rubric") {
        const explainedRubric = includesAny(text, ["partial credit", "show your work", "rubric", "reasoning"]);
        const gaveExample = includesAny(text, ["for example", "example", "full-credit", "full credit"]);
        const checkedUnderstanding = includesAny(text, [
            "can you",
            "walk me through",
            "what would you do",
            "tell me how",
            "?",
        ]);
        const met = explainedRubric && gaveExample && checkedUnderstanding;
        return {
            objectiveMet: met,
            reason: met
                ? "Criteria met: explanation, concrete example, and comprehension check detected."
                : "Waiting for clearer rubric explanation, concrete example, and comprehension check.",
        };
    }
    if (activityId === "redirect-off-topic") {
        const acknowledged = includesAny(text, ["good question", "great question", "i hear", "i get why"]);
        const boundedScope = includesAny(text, ["for this review", "not on the exam", "out of scope", "right now"]);
        const redirected = includesAny(text, ["let us focus", "let's focus", "back to", "review topic"]);
        const met = acknowledged && boundedScope && redirected;
        return {
            objectiveMet: met,
            reason: met
                ? "Criteria met: acknowledged question, set scope, and redirected respectfully."
                : "Waiting for acknowledgement, scope-setting, and a clear redirect.",
        };
    }
    if (activityId === "manage-frustration") {
        const empathy = includesAny(text, ["i can hear", "that sounds frustrating", "i am sorry", "that is frustrating"]);
        const boundary = includesAny(text, ["i cannot change", "as a ta", "cannot control", "cannot adjust"]);
        const nextStep = includesAny(text, ["professor", "email", "next step", "meet with", "office hours"]);
        const met = empathy && boundary && nextStep;
        return {
            objectiveMet: met,
            reason: met
                ? "Criteria met: empathy, boundaries, and concrete next step detected."
                : "Waiting for explicit empathy, boundary statement, and concrete next step.",
        };
    }
    return {
        objectiveMet: false,
        reason: "No evaluation rules found for this activity.",
    };
}
async function publishObjectiveEvaluation(ctx, message) {
    const localParticipant = ctx.room.localParticipant;
    if (!localParticipant) {
        return;
    }
    const payload = new TextEncoder().encode(JSON.stringify(message));
    await localParticipant.publishData(payload, {
        reliable: true,
        topic: "objective-evaluation",
    });
}
export default defineAgent({
    entry: async (ctx) => {
        const roomName = ctx.room.name ?? "";
        const activityId = getActivityIdFromRoomName(roomName);
        const activity = getActivity(activityId);
        const maxTurns = activity?.maxTurns ?? 0;
        console.info("Agent job received", { roomName, activityId });
        const agent = createStudentAgent(activityId);
        const session = new voice.AgentSession({
            llm: new openai.realtime.RealtimeModel({
                voice: "alloy",
                turnDetection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 1200,
                },
            }),
        });
        await session.start({
            agent,
            room: ctx.room,
            inputOptions: {
                noiseCancellation: BackgroundVoiceCancellation(),
            },
        });
        await ctx.connect();
        let taTurnCount = 0;
        const taUtterances = [];
        await publishObjectiveEvaluation(ctx, {
            type: "objective_evaluation",
            activityId,
            objectiveMet: false,
            turnCount: taTurnCount,
            maxTurns,
            reason: "Session started. Objective not met yet.",
            timestamp: Date.now(),
        });
        session.on(voice.AgentSessionEventTypes.UserInputTranscribed, async (event) => {
            if (!isFinalTranscription(event)) {
                return;
            }
            const transcript = extractTranscriptText(event);
            if (!transcript) {
                return;
            }
            taTurnCount += 1;
            taUtterances.push(transcript);
            const evaluation = evaluateObjective(activityId, taUtterances.join(" "));
            await publishObjectiveEvaluation(ctx, {
                type: "objective_evaluation",
                activityId,
                objectiveMet: evaluation.objectiveMet,
                turnCount: taTurnCount,
                maxTurns,
                reason: evaluation.reason,
                timestamp: Date.now(),
            });
        });
        const openingLine = getOpeningLine(activityId);
        console.info("Sending opening line", { activityId, openingLine });
        const reply = session.generateReply({
            instructions: `Start the conversation naturally with this exact opening line: "${openingLine}"`,
        });
        await reply.waitForPlayout();
    },
});
cli.runApp(new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "ita-student-agent",
}));
