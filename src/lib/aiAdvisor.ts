import {
  Content,
  FunctionDeclaration,
  GoogleGenAI,
  Part,
  Type,
} from '@google/genai';
import { CurrencyCode, formatCompactCurrency, formatCurrency } from './currency';
import type { ActionCardData } from './strategyStore';

export type AiProvider = 'openrouter' | 'gemini';

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

const STORAGE_KEY_PROVIDER = 'ai_provider';
const STORAGE_KEY_OPENROUTER_API = 'openrouter_api_key';
const STORAGE_KEY_OPENROUTER_MODEL = 'openrouter_model';
const STORAGE_KEY_GEMINI_API = 'gemini_api_key';
const STORAGE_KEY_GEMINI_MODEL = 'gemini_model';

export function getSavedAiProvider(): AiProvider {
  if (typeof window === 'undefined') return 'openrouter';
  const saved = localStorage.getItem(STORAGE_KEY_PROVIDER);
  if (saved === 'gemini' || saved === 'openrouter') {
    return saved;
  }
  const hasGemini = Boolean(localStorage.getItem(STORAGE_KEY_GEMINI_API)?.trim());
  const hasOpenRouter = Boolean(localStorage.getItem(STORAGE_KEY_OPENROUTER_API)?.trim());
  if (hasGemini && !hasOpenRouter) return 'gemini';
  return 'openrouter';
}

export function saveAiProvider(provider: AiProvider): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
}

export function getSavedOpenRouterKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_OPENROUTER_API) ?? '';
}

export function saveOpenRouterKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_OPENROUTER_API, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY_OPENROUTER_API);
  }
}

export function getSavedOpenRouterModel(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(STORAGE_KEY_OPENROUTER_MODEL) ?? '').trim();
}

export function saveOpenRouterModel(model: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = model.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_OPENROUTER_MODEL, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY_OPENROUTER_MODEL);
  }
}

export function getSavedGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_GEMINI_API) ?? '';
}

export function saveGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_GEMINI_API, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY_GEMINI_API);
  }
}

export function getSavedGeminiModel(): string {
  if (typeof window === 'undefined') return DEFAULT_GEMINI_MODEL;
  const saved = (localStorage.getItem(STORAGE_KEY_GEMINI_MODEL) ?? '').trim();
  return saved || DEFAULT_GEMINI_MODEL;
}

export function saveGeminiModel(model: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = model.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY_GEMINI_MODEL);
  }
}

export interface ActiveAiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  isConfigured: boolean;
}

export function getActiveAiConfiguration(): ActiveAiConfig {
  const provider = getSavedAiProvider();
  if (provider === 'gemini') {
    const apiKey = getSavedGeminiKey().trim();
    const model = getSavedGeminiModel().trim();
    return {
      provider,
      apiKey,
      model,
      isConfigured: Boolean(apiKey && model),
    };
  }

  const apiKey = getSavedOpenRouterKey().trim();
  const model = getSavedOpenRouterModel().trim();
  return {
    provider: 'openrouter',
    apiKey,
    model,
    isConfigured: Boolean(apiKey && model),
  };
}

export interface AnalysisSnapshot {
  calculatorName: string;
  currency: CurrencyCode;
  investedAmount: number;
  maturityAmount: number;
  estimatedGain: number;
  details: Record<string, string | number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionCardData[];
}

export interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ToolExecutionHandler = (
  toolName: string,
  args: Record<string, unknown>
) => { summary: string; actionCard?: ActionCardData };

export const COPILOT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'update_calculator_inputs',
      description:
        'Switch to a specific calculator tab and update its sliders/inputs in real time. Use this when the user asks to simulate, adjust, or step up a single calculator (Lump Sum, SIP, Step-Up SIP, SWP, FD, RD, PPF, CAGR, or FIRE).',
      parameters: {
        type: 'object',
        properties: {
          calculatorType: {
            type: 'string',
            enum: [
              'lumpsum',
              'sip',
              'stepup-sip',
              'swp',
              'fd',
              'rd',
              'ppf',
              'cagr',
              'fire',
              'portfolio',
            ],
            description: 'Target calculator tab identifier.',
          },
          amount: {
            type: 'number',
            description:
              'Primary monetary input: principal (Lump Sum/FD), monthly investment (SIP/Step-Up/RD), initial corpus (SWP), annual deposit (PPF), initial value (CAGR), or monthly expense (FIRE).',
          },
          withdrawalAmount: {
            type: 'number',
            description: 'Monthly withdrawal amount (for SWP calculator).',
          },
          finalValue: {
            type: 'number',
            description: 'Final value (for CAGR calculator).',
          },
          rate: {
            type: 'number',
            description: 'Expected annual return or interest rate percentage (e.g., 12 for 12%).',
          },
          tenure: {
            type: 'number',
            description: 'Investment or withdrawal duration in years.',
          },
          compounding: {
            type: 'number',
            enum: [1, 2, 4, 12],
            description: 'Compounding frequency per year (Lump Sum only).',
          },
          stepUpAnnual: {
            type: 'number',
            description:
              'Annual step-up percentage or fixed currency increment (activates Step-Up SIP in annual mode).',
          },
          stepUpMonthly: {
            type: 'number',
            description:
              'Monthly step-up percentage or fixed currency increment (activates Step-Up SIP in monthly mode).',
          },
          stepUpMode: {
            type: 'string',
            enum: ['percent', 'amount'],
            description: 'Whether the step-up increment is a percentage or fixed currency amount.',
          },
        },
        required: ['calculatorType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_portfolio_stream',
      description:
        'Add an investment stream (SIP, FD, Lump Sum, RD, or Dividend yield) into the Multi-Asset Portfolio Aggregator and activate the Portfolio view.',
      parameters: {
        type: 'object',
        properties: {
          streamType: {
            type: 'string',
            enum: ['sip', 'fd', 'lumpsum', 'rd', 'dividend'],
            description: 'Instrument type for the portfolio stream.',
          },
          name: {
            type: 'string',
            description: 'Descriptive name for the stream (e.g., "Nifty 50 SIP", "5-Year Bank FD").',
          },
          amount: {
            type: 'number',
            description:
              'Monthly investment (for sip/rd/dividend) or principal deposit (for fd/lumpsum).',
          },
          rate: {
            type: 'number',
            description: 'Expected annual return / interest rate in % (e.g., 12 or 7).',
          },
          tenure: {
            type: 'number',
            description: 'Stream duration in years.',
          },
          stepUpPct: {
            type: 'number',
            description: 'Optional annual step-up percentage for SIP/dividend streams.',
          },
          startYear: {
            type: 'number',
            description: 'Optional start year offset (0 = starts immediately).',
          },
          replaceExisting: {
            type: 'boolean',
            description:
              'Set true only if creating a brand-new portfolio from scratch; false to append to existing streams.',
          },
        },
        required: ['streamType', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_inflation_rate',
      description:
        'Update the dashed inflation benchmark percentage and toggle visibility on trajectory charts.',
      parameters: {
        type: 'object',
        properties: {
          inflationPercentage: {
            type: 'number',
            description: 'Annual inflation percentage (0 to 15).',
          },
          enabled: {
            type: 'boolean',
            description: 'Whether the dashed inflation benchmark line is shown on charts.',
          },
        },
        required: ['inflationPercentage'],
      },
    },
  },
] as const;

export const GEMINI_COPILOT_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'update_calculator_inputs',
    description:
      'Switch to a specific calculator tab and update its sliders/inputs in real time. Use this when the user asks to simulate, adjust, or step up a single calculator (Lump Sum, SIP, Step-Up SIP, SWP, FD, RD, PPF, CAGR, or FIRE).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        calculatorType: {
          type: Type.STRING,
          enum: [
            'lumpsum',
            'sip',
            'stepup-sip',
            'swp',
            'fd',
            'rd',
            'ppf',
            'cagr',
            'fire',
            'portfolio',
          ],
          description: 'Target calculator tab identifier.',
        },
        amount: {
          type: Type.NUMBER,
          description:
            'Primary monetary input: principal (Lump Sum/FD), monthly investment (SIP/Step-Up/RD), initial corpus (SWP), annual deposit (PPF), initial value (CAGR), or monthly expense (FIRE).',
        },
        withdrawalAmount: {
          type: Type.NUMBER,
          description: 'Monthly withdrawal amount (for SWP calculator).',
        },
        finalValue: {
          type: Type.NUMBER,
          description: 'Final value (for CAGR calculator).',
        },
        rate: {
          type: Type.NUMBER,
          description: 'Expected annual return or interest rate percentage (e.g., 12 for 12%).',
        },
        tenure: {
          type: Type.NUMBER,
          description: 'Investment or withdrawal duration in years.',
        },
        compounding: {
          type: Type.INTEGER,
          description: 'Compounding frequency per year (1, 2, 4, or 12 for Lump Sum only).',
        },
        stepUpAnnual: {
          type: Type.NUMBER,
          description:
            'Annual step-up percentage or fixed currency increment (activates Step-Up SIP in annual mode).',
        },
        stepUpMonthly: {
          type: Type.NUMBER,
          description:
            'Monthly step-up percentage or fixed currency increment (activates Step-Up SIP in monthly mode).',
        },
        stepUpMode: {
          type: Type.STRING,
          enum: ['percent', 'amount'],
          description: 'Whether the step-up increment is a percentage or fixed currency amount.',
        },
      },
      required: ['calculatorType'],
    },
  },
  {
    name: 'add_portfolio_stream',
    description:
      'Add an investment stream (SIP, FD, Lump Sum, RD, or Dividend yield) into the Multi-Asset Portfolio Aggregator and activate the Portfolio view.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        streamType: {
          type: Type.STRING,
          enum: ['sip', 'fd', 'lumpsum', 'rd', 'dividend'],
          description: 'Instrument type for the portfolio stream.',
        },
        name: {
          type: Type.STRING,
          description: 'Descriptive name for the stream (e.g., "Nifty 50 SIP", "5-Year Bank FD").',
        },
        amount: {
          type: Type.NUMBER,
          description:
            'Monthly investment (for sip/rd/dividend) or principal deposit (for fd/lumpsum).',
        },
        rate: {
          type: Type.NUMBER,
          description: 'Expected annual return / interest rate in % (e.g., 12 or 7).',
        },
        tenure: {
          type: Type.NUMBER,
          description: 'Stream duration in years.',
        },
        stepUpPct: {
          type: Type.NUMBER,
          description: 'Optional annual step-up percentage for SIP/dividend streams.',
        },
        startYear: {
          type: Type.NUMBER,
          description: 'Optional start year offset (0 = starts immediately).',
        },
        replaceExisting: {
          type: Type.BOOLEAN,
          description:
            'Set true only if creating a brand-new portfolio from scratch; false to append to existing streams.',
        },
      },
      required: ['streamType', 'amount'],
    },
  },
  {
    name: 'set_inflation_rate',
    description:
      'Update the dashed inflation benchmark percentage and toggle visibility on trajectory charts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        inflationPercentage: {
          type: Type.NUMBER,
          description: 'Annual inflation percentage (0 to 15).',
        },
        enabled: {
          type: Type.BOOLEAN,
          description: 'Whether the dashed inflation benchmark line is shown on charts.',
        },
      },
      required: ['inflationPercentage'],
    },
  },
];

export function buildContextPrompt(snapshot: AnalysisSnapshot): string {
  const detailsText = Object.entries(snapshot.details)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `Active Wealth Projection Context:
- Calculator: ${snapshot.calculatorName}
- Currency: ${snapshot.currency}
- Total Invested / Principal: ${formatCurrency(snapshot.investedAmount, snapshot.currency)} (${formatCompactCurrency(snapshot.investedAmount, snapshot.currency)})
- Estimated Gains / Interest: ${formatCurrency(snapshot.estimatedGain, snapshot.currency)} (${formatCompactCurrency(snapshot.estimatedGain, snapshot.currency)})
- Projected Maturity / Net Worth: ${formatCurrency(snapshot.maturityAmount, snapshot.currency)} (${formatCompactCurrency(snapshot.maturityAmount, snapshot.currency)})

Parameters:
${detailsText}`;
}

function buildCopilotSystemPrompt(snap: AnalysisSnapshot): string {
  return `You are an interactive fiduciary AI Wealth Copilot embedded inside Meridian Wealth.
You have bidirectional control over the app via tools:
- update_calculator_inputs: change active calculator and sliders/inputs (including annual/monthly step-ups).
- add_portfolio_stream: inject SIP, FD, Lump Sum, RD, or Dividend streams into the Multi-Asset Portfolio Aggregator.
- set_inflation_rate: adjust the dashed inflation reference baseline on charts.

When the user asks to simulate a scenario, add streams, change rates/tenures, or stress-test inflation, CALL the appropriate tool(s) immediately so the UI updates live, and then explain the resulting numbers in crisp Markdown.

${buildContextPrompt(snap)}`;
}

type OpenRouterApiMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenRouterToolCall[] }
  | { role: 'tool'; tool_call_id: string; name: string; content: string };

export async function sendAgenticChatWithOpenRouter(
  getLatestSnapshot: () => AnalysisSnapshot,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
  model: string,
  executeToolCall: ToolExecutionHandler,
  signal?: AbortSignal
): Promise<{ reply: string; actions: ActionCardData[] }> {
  const targetModel = model.trim();
  if (!targetModel) {
    throw new Error('OpenRouter model name is required. Add one in AI settings.');
  }

  const collectedActions: ActionCardData[] = [];
  const initialSnapshot = getLatestSnapshot();

  const conversation: OpenRouterApiMessage[] = [
    { role: 'system', content: buildCopilotSystemPrompt(initialSnapshot) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let round = 0; round < 3; round++) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
        'X-Title': 'Meridian Wealth Calculator',
      },
      body: JSON.stringify({
        model: targetModel,
        messages: conversation,
        tools: COPILOT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.35,
        max_tokens: 950,
      }),
    });

    if (!response.ok) {
      let errDetail = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errDetail = errJson.error.message;
        }
      } catch {
        // ignore json parse failure
      }
      throw new Error(`OpenRouter request failed: ${errDetail}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    if (!message) {
      throw new Error('OpenRouter returned an empty response.');
    }

    const toolCalls = Array.isArray(message.tool_calls)
      ? (message.tool_calls as OpenRouterToolCall[])
      : [];

    if (toolCalls.length === 0) {
      const text = typeof message.content === 'string' ? message.content.trim() : '';
      if (!text && collectedActions.length > 0) {
        return {
          reply: 'Applied your requested updates to the calculator and refreshed the trajectory.',
          actions: collectedActions,
        };
      }
      if (!text) {
        throw new Error('OpenRouter returned an empty message.');
      }
      return { reply: text, actions: collectedActions };
    }

    conversation.push({
      role: 'assistant',
      content: typeof message.content === 'string' ? message.content : null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        parsedArgs = {};
      }

      const execResult = executeToolCall(tc.function.name, parsedArgs);
      if (execResult.actionCard) {
        collectedActions.push(execResult.actionCard);
      }

      conversation.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: tc.function.name,
        content: JSON.stringify({
          status: 'applied',
          summary: execResult.summary,
          updatedContext: getLatestSnapshot(),
        }),
      });
    }

    conversation[0] = { role: 'system', content: buildCopilotSystemPrompt(getLatestSnapshot()) };
  }

  return {
    reply: 'Updated your workspace parameters and refreshed all projections.',
    actions: collectedActions,
  };
}

function formatGeminiError(err: unknown): Error {
  if (err instanceof Error && err.name === 'AbortError') {
    return err;
  }
  const raw = err instanceof Error ? err.message : String(err);
  if (/API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(raw)) {
    return new Error('Gemini API key was rejected. Check your Gemini API key in AI settings.');
  }
  if (/RESOURCE_EXHAUSTED|429/i.test(raw)) {
    return new Error(
      'Gemini quota exceeded (429). Try again shortly or switch to another Gemini model or OpenRouter.'
    );
  }
  if (/NOT_FOUND|404/i.test(raw)) {
    return new Error(
      'Gemini model not found (404). Verify the Gemini model name in AI settings (for example gemini-4-hydrogen or gemini-2.5-flash).'
    );
  }
  return new Error(`Gemini request failed: ${raw}`);
}

export async function sendAgenticChatWithGemini(
  getLatestSnapshot: () => AnalysisSnapshot,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
  model: string,
  executeToolCall: ToolExecutionHandler,
  signal?: AbortSignal
): Promise<{ reply: string; actions: ActionCardData[] }> {
  const targetModel = model.trim() || DEFAULT_GEMINI_MODEL;
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const collectedActions: ActionCardData[] = [];

  const contents: Content[] = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    for (let round = 0; round < 3; round++) {
      if (signal?.aborted) {
        const abortErr = new Error('Request aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction: buildCopilotSystemPrompt(getLatestSnapshot()),
          tools: [{ functionDeclarations: GEMINI_COPILOT_DECLARATIONS }],
          abortSignal: signal,
        },
      });

      const functionCalls = response.functionCalls ?? [];
      if (functionCalls.length === 0) {
        const text = (response.text ?? '').trim();
        if (!text && collectedActions.length > 0) {
          return {
            reply:
              'Applied your requested updates to the calculator and refreshed the trajectory.',
            actions: collectedActions,
          };
        }
        if (!text) {
          throw new Error('Gemini returned an empty message.');
        }
        return { reply: text, actions: collectedActions };
      }

      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      } else {
        contents.push({
          role: 'model',
          parts: functionCalls.map((fc) => ({
            functionCall: {
              id: fc.id,
              name: fc.name,
              args: fc.args,
            },
          })),
        });
      }

      const responseParts: Part[] = functionCalls.map((fc) => {
        const fnName = fc.name ?? '';
        const fnArgs = (fc.args ?? {}) as Record<string, unknown>;
        const execResult = executeToolCall(fnName, fnArgs);
        if (execResult.actionCard) {
          collectedActions.push(execResult.actionCard);
        }

        return {
          functionResponse: {
            id: fc.id,
            name: fnName,
            response: {
              status: 'applied',
              summary: execResult.summary,
              updatedContext: getLatestSnapshot(),
            },
          },
        };
      });

      contents.push({
        role: 'user',
        parts: responseParts,
      });
    }

    return {
      reply: 'Updated your workspace parameters and refreshed all projections.',
      actions: collectedActions,
    };
  } catch (err) {
    throw formatGeminiError(err);
  }
}

export async function sendAgenticChat(
  getLatestSnapshot: () => AnalysisSnapshot,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  config: ActiveAiConfig,
  executeToolCall: ToolExecutionHandler,
  signal?: AbortSignal
): Promise<{ reply: string; actions: ActionCardData[] }> {
  if (config.provider === 'gemini') {
    return sendAgenticChatWithGemini(
      getLatestSnapshot,
      history,
      config.apiKey,
      config.model,
      executeToolCall,
      signal
    );
  }

  return sendAgenticChatWithOpenRouter(
    getLatestSnapshot,
    history,
    config.apiKey,
    config.model,
    executeToolCall,
    signal
  );
}
