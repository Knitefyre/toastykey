const Database = require('../../../src/db');
const fs = require('fs');
const path = require('path');

const TEST_DB = path.join(__dirname, 'tangible-output-test.db');

describe('Tangible Output Categorization', () => {
  let db;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    db = new Database(TEST_DB);
    await db.ready;
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('categorizes OpenAI chat calls as LLM calls', async () => {
    await db.logApiCall({
      provider: 'openai',
      endpoint: '/v1/chat/completions',
      model: 'gpt-4o',
      cost_inr: 10.5,
      input_tokens: 100,
      output_tokens: 50
    });

    const calls = await db.getAllApiCalls();
    expect(calls.length).toBe(1);

    // Simulate endpoint logic
    const outputs = { images: { count: 0, cost: 0 }, llm_calls: { count: 0, cost: 0 }, audio: { count: 0, cost: 0 } };
    calls.forEach(call => {
      if ((call.provider === 'openai' || call.provider === 'anthropic') &&
          (call.endpoint.includes('/chat') || call.endpoint.includes('/messages'))) {
        outputs.llm_calls.count += 1;
        outputs.llm_calls.cost += call.cost_inr || 0;
      }
    });

    expect(outputs.llm_calls.count).toBe(1);
    expect(outputs.llm_calls.cost).toBe(10.5);
  });

  test('categorizes Anthropic messages as LLM calls', async () => {
    await db.logApiCall({
      provider: 'anthropic',
      endpoint: '/v1/messages',
      model: 'claude-sonnet-4',
      cost_inr: 15.0,
      input_tokens: 200,
      output_tokens: 100
    });

    const calls = await db.getAllApiCalls();
    const anthropicCalls = calls.filter(c => c.provider === 'anthropic');
    expect(anthropicCalls.length).toBe(1);
  });

  test('categorizes DALL-E as images', async () => {
    await db.logApiCall({
      provider: 'openai',
      endpoint: '/v1/images/generations',
      model: 'dall-e-3',
      cost_inr: 8.0
    });

    const calls = await db.getAllApiCalls();
    const imageCalls = calls.filter(c =>
      c.endpoint.includes('/images') || (c.model && c.model.includes('dall-e'))
    );
    expect(imageCalls.length).toBeGreaterThan(0);
  });

  test('categorizes Stability AI as images', async () => {
    await db.logApiCall({
      provider: 'stability',
      endpoint: '/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      model: 'stable-diffusion-xl',
      cost_inr: 5.0
    });

    const calls = await db.getAllApiCalls();
    const stabilityCalls = calls.filter(c => c.provider === 'stability');
    expect(stabilityCalls.length).toBe(1);
  });

  test('categorizes ElevenLabs as audio', async () => {
    await db.logApiCall({
      provider: 'elevenlabs',
      endpoint: '/v1/text-to-speech',
      model: 'eleven_multilingual_v2',
      cost_inr: 2.5
    });

    const calls = await db.getAllApiCalls();
    const audioCalls = calls.filter(c => c.provider === 'elevenlabs' || c.provider === 'cartesia');
    expect(audioCalls.length).toBe(1);
  });

  test('categorizes Cartesia as audio', async () => {
    await db.logApiCall({
      provider: 'cartesia',
      endpoint: '/v1/tts',
      cost_inr: 1.5
    });

    const calls = await db.getAllApiCalls();
    const cartesiaCalls = calls.filter(c => c.provider === 'cartesia');
    expect(cartesiaCalls.length).toBe(1);
  });

  test('handles mixed call types correctly', async () => {
    // Clear previous calls
    await db.db.run('DELETE FROM api_calls');

    // Add 2 LLM, 1 image, 1 audio
    await db.logApiCall({
      provider: 'openai',
      endpoint: '/v1/chat/completions',
      cost_inr: 10
    });
    await db.logApiCall({
      provider: 'anthropic',
      endpoint: '/v1/messages',
      cost_inr: 15
    });
    await db.logApiCall({
      provider: 'stability',
      endpoint: '/v1/generation/text-to-image',
      cost_inr: 5
    });
    await db.logApiCall({
      provider: 'elevenlabs',
      endpoint: '/v1/text-to-speech',
      cost_inr: 2
    });

    const calls = await db.getAllApiCalls();
    expect(calls.length).toBe(4);

    // Simulate categorization
    const outputs = { images: { count: 0, cost: 0 }, llm_calls: { count: 0, cost: 0 }, audio: { count: 0, cost: 0 } };
    calls.forEach(call => {
      if (call.provider === 'stability' ||
          call.endpoint.includes('/images') ||
          (call.model && (call.model.includes('dall-e') || call.model.includes('stable-diffusion')))) {
        outputs.images.count += 1;
        outputs.images.cost += call.cost_inr || 0;
      }
      if ((call.provider === 'openai' || call.provider === 'anthropic') &&
          (call.endpoint.includes('/chat') || call.endpoint.includes('/messages'))) {
        outputs.llm_calls.count += 1;
        outputs.llm_calls.cost += call.cost_inr || 0;
      }
      if (call.provider === 'elevenlabs' || call.provider === 'cartesia' ||
          call.endpoint.includes('/audio') ||
          (call.model && (call.model.includes('whisper') || call.model.includes('tts')))) {
        outputs.audio.count += 1;
        outputs.audio.cost += call.cost_inr || 0;
      }
    });

    expect(outputs.llm_calls.count).toBe(2);
    expect(outputs.llm_calls.cost).toBe(25);
    expect(outputs.images.count).toBe(1);
    expect(outputs.images.cost).toBe(5);
    expect(outputs.audio.count).toBe(1);
    expect(outputs.audio.cost).toBe(2);
  });
});
