cd apProject setup and credentials

    Create a project

    In this quickstart we will create a voice agent you can use in the browser. If you want to check out a new project, you can try out Next.js or Vite.
    Terminal window

    npm create vite@latest my-project -- --template vanilla-ts

    Install the recommended package (requires Zod v4)
    Terminal window

    npm install @openai/agents zod

    Generate a client ephemeral token

    As this application will run in the user’s browser, we need a secure way to connect to the model through the Realtime API. For this we can use an ephemeral client key that should be generated on your backend server. For testing purposes you can also generate a key using curl and your regular OpenAI API key.
    Terminal window

    export OPENAI_API_KEY="sk-proj-...(your own key here)"
    curl -X POST https://api.openai.com/v1/realtime/client_secrets \
       -H "Authorization: Bearer $OPENAI_API_KEY" \
       -H "Content-Type: application/json" \
       -d '{
         "session": {
           "type": "realtime",
           "model": "gpt-realtime"
         }
       }'

    The response contains a top-level value field that starts with the ek_ prefix, plus the effective session object. Use value as the client secret when establishing the WebRTC connection. This token is short-lived, so your backend should mint a fresh one when needed.

Create and connect the voice agent

    Create your first Agent

    Creating a new RealtimeAgent is very similar to creating a regular Agent.

    import { RealtimeAgent } from '@openai/agents/realtime';

    const agent = new RealtimeAgent({
      name: 'Assistant',
      instructions: 'You are a helpful assistant.',
    });

    Create a session

    Unlike a regular agent, a Voice Agent is continuously running and listening inside a RealtimeSession that handles the conversation and connection to the model over time. This session will also handle the audio processing, interruptions, and a lot of the other lifecycle functionality we will cover later on.

    import { RealtimeSession } from '@openai/agents/realtime';

    const session = new RealtimeSession(agent, {
      model: 'gpt-realtime',
    });

    The RealtimeSession constructor takes an agent as the first argument. This agent will be the first agent that your user will be able to interact with.

    Connect to the session

    To connect to the session you need to pass the client ephemeral token you generated earlier on.

    await session.connect({ apiKey: 'ek_...(put your own key here)' });

    This will connect to the Realtime API using WebRTC in the browser and automatically configure your microphone and speaker for audio input and output. If you are running your RealtimeSession on a backend server (like Node.js) the SDK will automatically use WebSocket as a connection. You can learn more about the different transport layers in the Realtime Transport Layer guide.

Run and test the app

    Putting it all together

    import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

    export async function setupCounter(element: HTMLButtonElement) {
      // ....
      // for quickly start, you can append the following code to the auto-generated TS code

      const agent = new RealtimeAgent({
        name: 'Assistant',
        instructions: 'You are a helpful assistant.',
      });
      const session = new RealtimeSession(agent);
      // Automatically connects your microphone and audio output in the browser via WebRTC.
      try {
        await session.connect({
          // To get this ephemeral key string, you can run the following command or implement the equivalent on the server side:
          // curl -s -X POST https://api.openai.com/v1/realtime/client_secrets -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" -d '{"session": {"type": "realtime", "model": "gpt-realtime"}}' | jq .value
          apiKey: 'ek_...(put your own key here)',
        });
        console.log('You are connected!');
      } catch (e) {
        console.error(e);
      }
    }

    Fire up the engines and start talking

    Start up your webserver and navigate to the page that includes your new Realtime Agent code. You should see a request for microphone access. Once you grant access you should be able to start talking to your agent.
    Terminal window

    npm run dev

Next Steps

From here you can start designing and building your own voice agent:

    Add tools, handoffs, and guardrails.
    Learn how to handle audio interruptions and manage session history.
    Choose the right transport for your deployment: WebRTC, WebSocket, or a custom transport.



Building Voice Agents

Caution

Choose your architecture early:

    OpenAIRealtimeWebRTC is the simplest browser path and handles audio input/output for you.
    OpenAIRealtimeWebSocket gives you more control, but you must manage audio capture and playback yourself.
    Function tools run wherever the RealtimeSession runs. If the session runs in the browser, the tool runs in the browser too.
    Realtime handoffs keep the same voice and model. If you need a different backend model, delegate through a tool instead of a handoff.

Session setup
Audio handling

Some transport layers like the default OpenAIRealtimeWebRTC will handle audio input and output automatically for you. For other transport mechanisms like OpenAIRealtimeWebSocket you will have to handle session audio yourself:

import {
  RealtimeAgent,
  RealtimeSession,
  TransportLayerAudio,
} from '@openai/agents/realtime';

const agent = new RealtimeAgent({ name: 'My agent' });
const session = new RealtimeSession(agent);
const newlyRecordedAudio = new ArrayBuffer(0);

session.on('audio', (event: TransportLayerAudio) => {
  // play your audio
});

// send new audio to the agent
session.sendAudio(newlyRecordedAudio);

When the underlying transport supports it, session.muted reports the current mute state and session.mute(true | false) toggles microphone capture. OpenAIRealtimeWebSocket does not implement muting: session.muted returns null and session.mute() throws, so for websocket setups you should pause capture on your side and stop calling sendAudio() until the microphone should be live again.
Session configuration

You can configure your session by passing additional options to either the RealtimeSession during construction or when you call connect(...).

import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

const agent = new RealtimeAgent({
  name: 'Greeter',
  instructions: 'Greet the user with cheer and answer questions.',
});

const session = new RealtimeSession(agent, {
  model: 'gpt-realtime',
  config: {
    outputModalities: ['text', 'audio'],
    audio: {
      input: {
        format: 'pcm16',
        transcription: {
          model: 'gpt-4o-mini-transcribe',
        },
      },
      output: {
        format: 'pcm16',
      },
    },
  },
});

These transport layers allow you to pass any parameter that matches session.

Prefer the newer config shape with outputModalities, audio.input, and audio.output. Legacy top-level fields such as modalities, inputAudioFormat, outputAudioFormat, inputAudioTranscription, and turnDetection are still normalized for backwards compatibility, but new code should use the nested audio structure shown here.

For parameters that are new and don’t have a matching parameter in the RealtimeSessionConfig you can use providerData. Anything passed in providerData will be passed directly as part of the session object.

Additional RealtimeSession options you can set at construction time:
Option	Type	Purpose
context	TContext	Extra local context merged into the session context.
historyStoreAudio	boolean	Store audio data in the local history snapshot (disabled by default).
outputGuardrails	RealtimeOutputGuardrail[]	Output guardrails for the session (see Guardrails).
outputGuardrailSettings	{ debounceTextLength?: number }	Guardrail cadence. Defaults to 100; use -1 to only run once full text is available.
tracingDisabled	boolean	Disable tracing for the session.
groupId	string	Group traces across sessions or backend runs.
traceMetadata	Record<string, any>	Custom metadata to attach to session traces.
workflowName	string	Friendly name for the trace workflow.
automaticallyTriggerResponseForMcpToolCalls	boolean	Auto-trigger a model response when an MCP tool call completes (default: true).
toolErrorFormatter	ToolErrorFormatter	Customize tool approval rejection messages returned to the model.

connect(...) options:
Option	Type	Purpose
apiKey	string | (() => string | Promise<string>)	API key (or lazy loader) used for this connection.
model	OpenAIRealtimeModels | string	Optional model override for the transport connection.
url	string	Optional custom Realtime endpoint URL.
callId	string	Attach to an existing SIP-initiated call/session.
Agent capabilities
Handoffs

Similarly to regular agents, you can use handoffs to break your agent into multiple agents and orchestrate between them to improve the performance of your agents and better scope the problem.

import { RealtimeAgent } from '@openai/agents/realtime';

const mathTutorAgent = new RealtimeAgent({
  name: 'Math Tutor',
  handoffDescription: 'Specialist agent for math questions',
  instructions:
    'You provide help with math problems. Explain your reasoning at each step and include examples',
});

const agent = new RealtimeAgent({
  name: 'Greeter',
  instructions: 'Greet the user with cheer and answer questions.',
  handoffs: [mathTutorAgent],
});

Unlike regular agents, handoffs behave slightly differently for Realtime Agents. When a handoff is performed, the ongoing session will be updated with the new agent configuration. Because of this, the agent automatically has access to the ongoing conversation history and input filters are currently not applied.

Additionally, this means that the voice or model cannot be changed as part of the handoff. You can also only connect to other Realtime Agents. If you need to use a different model, for example a reasoning model like gpt-5.2, you can use delegation through tools.
Tools

Just like regular agents, Realtime Agents can call tools to perform actions. Realtime supports function tools (executed locally) and hosted MCP tools (executed remotely by the Realtime API). You can define a function tool using the same tool() helper you would use for a regular agent.

import { tool, RealtimeAgent } from '@openai/agents/realtime';
import { z } from 'zod';

const getWeather = tool({
  name: 'get_weather',
  description: 'Return the weather for a city.',
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`;
  },
});

const weatherAgent = new RealtimeAgent({
  name: 'Weather assistant',
  instructions: 'Answer weather questions.',
  tools: [getWeather],
});

Function tools

Function tools run in the same environment as your RealtimeSession. This means if you are running your session in the browser, the tool executes in the browser. If you need to perform sensitive actions, call your backend from inside the tool and let the server do the privileged work.

This lets a browser-side tool act as a thin backchannel to server-side logic. For example, examples/realtime-next defines a refundBackchannel tool in the browser that forwards the request and current conversation history to handleRefundRequest(...) on the server, where a separate Runner can use a different agent or model to evaluate the refund before returning the result to the voice session.
Hosted MCP tools

Hosted MCP tools can be configured with hostedMcpTool and are executed remotely. When MCP tool availability changes the session emits mcp_tools_changed. To prevent the session from auto-triggering a model response after MCP tool calls complete, set automaticallyTriggerResponseForMcpToolCalls: false.

The current filtered MCP tool list is also available as session.availableMcpTools. Both that property and the mcp_tools_changed event reflect only the hosted MCP servers enabled on the active agent, after applying any allowed_tools filters from the agent configuration.
Background results

While the tool is executing the agent will not be able to process new requests from the user. One way to improve the experience is by telling your agent to announce when it is about to execute a tool or say specific phrases to buy the agent some time to execute the tool.

If a function tool should finish without immediately triggering another model response, return backgroundResult(output) from @openai/agents/realtime. This sends the tool output back to the session while leaving response triggering under your control.
Timeouts

Function tool timeout options (timeoutMs, timeoutBehavior, timeoutErrorFunction) work the same way in Realtime sessions. With the default error_as_result, the timeout message is sent as tool output. With raise_exception, the session emits an error event with ToolTimeoutError and does not send tool output for that call.
Accessing the conversation history

Additionally to the arguments that the agent called a particular tool with, you can also access a snapshot of the current conversation history that is tracked by the Realtime Session. This can be useful if you need to perform a more complex action based on the current state of the conversation or are planning to use tools for delegation.

import {
  tool,
  RealtimeContextData,
  RealtimeItem,
} from '@openai/agents/realtime';
import { z } from 'zod';

const parameters = z.object({
  request: z.string(),
});

const refundTool = tool<typeof parameters, RealtimeContextData>({
  name: 'Refund Expert',
  description: 'Evaluate a refund',
  parameters,
  execute: async ({ request }, details) => {
    // The history might not be available
    const history: RealtimeItem[] = details?.context?.history ?? [];
    // making your call to process the refund request
  },
});

Note

The history passed in is a snapshot of the history at the time of the tool call. The transcription of the last thing the user said might not be available yet.
Approval before tool execution

If you define your tool with needsApproval: true the agent will emit a tool_approval_requested event before executing the tool.

By listening to this event you can show a UI to the user to approve or reject the tool call.

import { session } from './agent';

session.on('tool_approval_requested', (_context, _agent, request) => {
  // show a UI to the user to approve or reject the tool call
  // you can use the `session.approve(...)` or `session.reject(...)` methods to approve or reject the tool call

  session.approve(request.approvalItem); // or session.reject(request.rawItem);
});

Note

While the voice agent is waiting for approval for the tool call, the agent won’t be able to process new requests from the user.
Guardrails

Guardrails offer a way to monitor whether what the agent has said violated a set of rules and immediately cut off the response. These guardrail checks will be performed based on the transcript of the agent’s response and therefore requires that the text output of your model is enabled (it is enabled by default).

The guardrails that you provide will run asynchronously as a model response is returned, allowing you to cut off the response based a predefined classification trigger, for example “mentions a specific banned word”.

When a guardrail trips the session emits a guardrail_tripped event. The event also provides a details object containing the itemId that triggered the guardrail.

import { RealtimeOutputGuardrail, RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

const agent = new RealtimeAgent({
  name: 'Greeter',
  instructions: 'Greet the user with cheer and answer questions.',
});

const guardrails: RealtimeOutputGuardrail[] = [
  {
    name: 'No mention of Dom',
    async execute({ agentOutput }) {
      const domInOutput = agentOutput.includes('Dom');
      return {
        tripwireTriggered: domInOutput,
        outputInfo: { domInOutput },
      };
    },
  },
];

const guardedSession = new RealtimeSession(agent, {
  outputGuardrails: guardrails,
});

By default guardrails run every 100 characters and again when the final transcript is available. Because speaking the text usually takes longer than generating the transcript, this often lets the guardrail cut off unsafe output before the user hears it.

If you want to modify this behavior you can pass a outputGuardrailSettings object to the session.

Set debounceTextLength: -1 when you only want to evaluate the fully generated transcript once, at the end of the response.

import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

const agent = new RealtimeAgent({
  name: 'Greeter',
  instructions: 'Greet the user with cheer and answer questions.',
});

const guardedSession = new RealtimeSession(agent, {
  outputGuardrails: [
    /*...*/
  ],
  outputGuardrailSettings: {
    debounceTextLength: 500, // run guardrail every 500 characters or set it to -1 to run it only at the end
  },
});

Interaction flow
Turn detection / voice activity detection

The Realtime Session will automatically detect when the user is speaking and trigger new turns using the built-in voice activity detection modes of the Realtime API.

You can change the voice activity detection mode by passing audio.input.turnDetection in the session config.

import { RealtimeSession } from '@openai/agents/realtime';
import { agent } from './agent';

const session = new RealtimeSession(agent, {
  model: 'gpt-realtime',
  config: {
    audio: {
      input: {
        turnDetection: {
          type: 'semantic_vad',
          eagerness: 'medium',
          createResponse: true,
          interruptResponse: true,
        },
      },
    },
  },
});

Modifying the turn detection settings can help calibrate unwanted interruptions and dealing with silence. Check out the Realtime API documentation for more details on the different settings
Interruptions

When using the built-in voice activity detection, speaking over the agent automatically triggers the agent to detect and update its context based on what was said. It will also emit an audio_interrupted event. This can be used to immediately stop all audio playback (only applicable to WebSocket connections).

import { session } from './agent';

session.on('audio_interrupted', () => {
  // handle local playback interruption
});

If you want to perform a manual interruption, for example if you want to offer a “stop” button in your UI, you can call interrupt() manually:

import { session } from './agent';

session.interrupt();
// this will still trigger the `audio_interrupted` event for you
// to cut off the audio playback when using WebSockets

In either way, the Realtime Session will handle both interrupting the generation of the agent, truncate its knowledge of what was said to the user, and update the history.

If you are using WebRTC to connect to your agent, it will also clear the audio output. If you are using WebSocket, you will need to handle this yourself by stopping audio playack of whatever has been queued up to be played.
Text input

If you want to send text input to your agent, you can use the sendMessage method on the RealtimeSession.

This can be useful if you want to enable your user to interface in both modalities with the agent, or to provide additional context to the conversation.

import { RealtimeSession, RealtimeAgent } from '@openai/agents/realtime';

const agent = new RealtimeAgent({
  name: 'Assistant',
});

const session = new RealtimeSession(agent, {
  model: 'gpt-realtime',
});

session.sendMessage('Hello, how are you?');

Conversation state and delegation
Conversation history management

The RealtimeSession automatically manages the conversation history in a history property:

You can use this to render the history to the customer or perform additional actions on it. As this history will constantly change during the course of the conversation you can listen for the history_updated event.

If you want to modify the history, like removing a message entirely or updating its transcript, you can use the updateHistory method.

import { RealtimeSession, RealtimeAgent } from '@openai/agents/realtime';

const agent = new RealtimeAgent({
  name: 'Assistant',
});

const session = new RealtimeSession(agent, {
  model: 'gpt-realtime',
});

await session.connect({ apiKey: '<client-api-key>' });

// listening to the history_updated event
session.on('history_updated', (history) => {
  // returns the full history of the session
  console.log(history);
});

// Option 1: explicit setting
session.updateHistory([
  /* specific history */
]);

// Option 2: override based on current state like removing all agent messages
session.updateHistory((currentHistory) => {
  return currentHistory.filter(
    (item) => !(item.type === 'message' && item.role === 'assistant'),
  );
});

Limitations

    You can currently not update/change function tool calls after the fact
    Text output in the history requires transcripts and text modalities to be enabled
    Responses that were truncated due to an interruption do not have a transcript

Delegation through tools

Delegation through tools

By combining the conversation history with a tool call, you can delegate the conversation to another backend agent to perform a more complex action and then pass it back as the result to the user.

import {
  RealtimeAgent,
  RealtimeContextData,
  tool,
} from '@openai/agents/realtime';
import { handleRefundRequest } from './serverAgent';
import z from 'zod';

const refundSupervisorParameters = z.object({
  request: z.string(),
});

const refundSupervisor = tool<
  typeof refundSupervisorParameters,
  RealtimeContextData
>({
  name: 'escalateToRefundSupervisor',
  description: 'Escalate a refund request to the refund supervisor',
  parameters: refundSupervisorParameters,
  execute: async ({ request }, details) => {
    // This will execute on the server
    return handleRefundRequest(request, details?.context?.history ?? []);
  },
});

const agent = new RealtimeAgent({
  name: 'Customer Support',
  instructions:
    'You are a customer support agent. If you receive any requests for refunds, you need to delegate to your supervisor.',
  tools: [refundSupervisor],
});

The code below will then be executed on the server. In this example through a server actions in Next.js.

// This runs on the server
import 'server-only';

import { Agent, run } from '@openai/agents';
import type { RealtimeItem } from '@openai/agents/realtime';
import z from 'zod';

const agent = new Agent({
  name: 'Refund Expert',
  instructions:
    'You are a refund expert. You are given a request to process a refund and you need to determine if the request is valid.',
  model: 'gpt-5.2',
  outputType: z.object({
    reasong: z.string(),
    refundApproved: z.boolean(),
  }),
});

export async function handleRefundRequest(
  request: string,
  history: RealtimeItem[],
) {
  const input = `
The user has requested a refund.

The request is: ${request}

Current conversation history:
${JSON.stringify(history, null, 2)}
`.trim();

  const result = await run(agent, input);

  return JSON.stringify(result.finalOutput, null, 2);
}

