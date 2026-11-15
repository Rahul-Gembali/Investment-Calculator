import { CurrencyCode, formatCompactCurrency, formatCurrency } from './currency';
import type { ActionCardData } from './strategyStore';

export const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-flash', label: 'Google Gemini 2.0 Flash' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta Llama 3.3 70B Instruct' },
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_MODELS)[number]['id'];

const STORAGE_KEY_API = 'openrouter_api_key';
const STORAGE_KEY_MODEL = 'openrouter_model';

export function getSavedOpenRouterKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_API) ?? '';
}

export function saveOpenRouterKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_API, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY_API);
  }
}

export function getSavedOpenRouterModel(): OpenRouterModelId {
  if (typeof window === 'undefined') return OPENROUTER_MODELS[0].id;
  const saved = localStorage.getItem(STORAGE_KEY_MODEL);
  const found = OPENROUTER_MODELS.find((m) => m.id === saved);
  return found ? found.id : OPENROUTER_MODELS[0].id;
}

export function saveOpenRouterModel(model: OpenRouterModelId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MODEL, model);
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
            description: 'Annual step-up percentage or fixed currency increment (activates Step-Up SIP in annual mode).',
          },
          stepUpMonthly: {
            type: 'number',
            description: 'Monthly step-up percentage or fixed currency increment (activates Step-Up SIP in monthly mode).',
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
            description: 'Monthly investment (for sip/rd/dividend) or principal deposit (for fd/lumpsum).',
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
            description: 'Set true only if creating a brand-new portfolio from scratch; false to append to existing streams.',
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

type OpenRouterApiMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenRouterToolCall[] }
  | { role: 'tool'; tool_call_id: string; name: string; content: string };

export async function sendAgenticChatWithOpenRouter(
  getLatestSnapshot: () => AnalysisSnapshot,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
  model: OpenRouterModelId,
  executeToolCall: ToolExecutionHandler,
  signal?: AbortSignal
): Promise<{ reply: string; actions: ActionCardData[] }> {
  const collectedActions: ActionCardData[] = [];
  const initialSnapshot = getLatestSnapshot();

  const buildSystemPrompt = (snap: AnalysisSnapshot) =>
    `You are an interactive fiduciary AI Wealth Copilot embedded inside Meridian Wealth.
You have bidirectional control over the app via tools:
- update_calculator_inputs: change active calculator and sliders/inputs (including annual/monthly step-ups).
- add_portfolio_stream: inject SIP, FD, Lump Sum, RD, or Dividend streams into the Multi-Asset Portfolio Aggregator.
- set_inflation_rate: adjust the dashed inflation reference baseline on charts.

When the user asks to simulate a scenario, add streams, change rates/tenures, or stress-test inflation, CALL the appropriate tool(s) immediately so the UI updates live, and then explain the resulting numbers in crisp Markdown.

${buildContextPrompt(snap)}`;

  const conversation: OpenRouterApiMessage[] = [
    { role: 'system', content: buildSystemPrompt(initialSnapshot) },
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
        model,
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

    // Refresh system context with updated calculations for the follow-up synthesis turn
    conversation[0] = { role: 'system', content: buildSystemPrompt(getLatestSnapshot()) };
  }

  return {
    reply: 'Updated your workspace parameters and refreshed all projections.',
    actions: collectedActions,
  };
}
