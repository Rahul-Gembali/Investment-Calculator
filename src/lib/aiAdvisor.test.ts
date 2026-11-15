import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COPILOT_TOOLS,
  DEFAULT_GEMINI_MODEL,
  GEMINI_COPILOT_DECLARATIONS,
  getActiveAiConfiguration,
  getSavedAiProvider,
  getSavedGeminiKey,
  getSavedGeminiModel,
  getSavedOpenRouterKey,
  getSavedOpenRouterModel,
  saveAiProvider,
  saveGeminiKey,
  saveGeminiModel,
  saveOpenRouterKey,
  saveOpenRouterModel,
  sendAgenticChatWithOpenRouter,
} from './aiAdvisor';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  (globalThis as unknown as { window: Record<string, unknown>; localStorage: typeof mockStorage }).window = {
    location: { origin: 'https://example.github.io' },
  };
  (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
  return mockStorage;
}

test('OpenRouter has no hardcoded default model and stores user-typed custom model slugs', () => {
  const storage = installMockLocalStorage();
  storage.clear();

  assert.equal(getSavedAiProvider(), 'openrouter');
  assert.equal(getSavedOpenRouterModel(), '');

  saveOpenRouterKey('sk-or-v1-test');
  // Without a user-typed model, OpenRouter is not configured yet
  assert.equal(getActiveAiConfiguration().isConfigured, false);

  saveOpenRouterModel('  nvidia/nemotron-3-nano-30b-a3b:free  ');
  assert.equal(getSavedOpenRouterModel(), 'nvidia/nemotron-3-nano-30b-a3b:free');

  const cfg = getActiveAiConfiguration();
  assert.equal(cfg.provider, 'openrouter');
  assert.equal(cfg.apiKey, 'sk-or-v1-test');
  assert.equal(cfg.model, 'nvidia/nemotron-3-nano-30b-a3b:free');
  assert.equal(cfg.isConfigured, true);
});

test('Gemini provider persists API key, defaults to gemini-4-hydrogen, and accepts custom model names', () => {
  const storage = installMockLocalStorage();
  storage.clear();

  saveGeminiKey('AIzaSyTestKey123');
  // Auto-detects gemini if only Gemini key is saved and ai_provider is unset
  assert.equal(getSavedAiProvider(), 'gemini');
  assert.equal(getSavedGeminiKey(), 'AIzaSyTestKey123');
  assert.equal(getSavedGeminiModel(), DEFAULT_GEMINI_MODEL);

  let cfg = getActiveAiConfiguration();
  assert.equal(cfg.provider, 'gemini');
  assert.equal(cfg.model, DEFAULT_GEMINI_MODEL);
  assert.equal(cfg.isConfigured, true);

  saveAiProvider('gemini');
  saveGeminiModel('gemini-2.5-flash');
  cfg = getActiveAiConfiguration();
  assert.equal(cfg.model, 'gemini-2.5-flash');
});

test('Gemini function declarations match OpenRouter COPILOT_TOOLS tool names', () => {
  const openRouterToolNames = COPILOT_TOOLS.map((t) => t.function.name);
  const geminiToolNames = GEMINI_COPILOT_DECLARATIONS.map((t) => t.name);
  assert.deepEqual(geminiToolNames, openRouterToolNames);
});

test('sendAgenticChatWithOpenRouter requires non-empty model and sends custom model in request body', async () => {
  installMockLocalStorage();
  const sampleSnapshot = {
    calculatorName: 'SIP',
    currency: 'INR' as const,
    investedAmount: 1200000,
    maturityAmount: 2323391,
    estimatedGain: 1123391,
    details: { Monthly: 10000 },
  };

  await assert.rejects(
    () =>
      sendAgenticChatWithOpenRouter(
        () => sampleSnapshot,
        [{ role: 'user', content: 'Analyze my SIP' }],
        'sk-or-test',
        '   ',
        () => ({ summary: 'ok' })
      ),
    /model name is required/i
  );

  let capturedModel = '';
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const parsed = JSON.parse(String(init?.body ?? '{}')) as { model: string };
    capturedModel = parsed.model;
    return new Response(
      JSON.stringify({
        choices: [{ message: { role: 'assistant', content: 'Your SIP looks balanced.' } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const res = await sendAgenticChatWithOpenRouter(
      () => sampleSnapshot,
      [{ role: 'user', content: 'Analyze my SIP' }],
      'sk-or-test',
      'nvidia/nemotron-super-49b-v1',
      () => ({ summary: 'ok' })
    );
    assert.equal(capturedModel, 'nvidia/nemotron-super-49b-v1');
    assert.equal(res.reply, 'Your SIP looks balanced.');
  } finally {
    globalThis.fetch = origFetch;
  }
});
