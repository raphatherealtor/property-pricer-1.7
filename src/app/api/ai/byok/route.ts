import { NextRequest, NextResponse } from 'next/server';

// BYOK multi-provider AI chat route — Phase 3 upgrade
// Guardrails: calc_version injected, math-only constraint, no hallucinated statistics
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, model, messages, parameters, userApiKey, calcVersion } = body;

    if (!provider || !model || !messages) {
      return NextResponse.json({ error: 'Missing required fields: provider, model, messages' }, { status: 400 });
    }

    if (!userApiKey) {
      return NextResponse.json({ error: 'No API key provided. Configure your API key in Settings.' }, { status: 401 });
    }

    // Phase 3: Inject calc_version guardrail into system prompt
    const injectedCalcVersion = calcVersion || '1.6.1';
    const guardrailInjection = `

## NEGOTIATION COACH GUARDRAILS (calc_version: ${injectedCalcVersion})

CRITICAL CONSTRAINTS — you MUST follow these without exception:
1. **Math-only constraint**: You MUST use ONLY the engine state values provided above (E[DOM], P(>120d), κ_eff, u_eff, costOfTesting, netProceeds, etc.). Do NOT invent, estimate, or hallucinate any statistics, percentages, prices, or market data not present in the provided engine state.
2. **No external market data**: Do not reference external market statistics, national averages, or data not in the MCP context handoff above.
3. **Cite engine values**: When making any quantitative claim, cite the specific engine output value (e.g., "P(>120d) = 24.4% from the engine").
4. **calc_version lock**: All analysis is anchored to calc_version ${injectedCalcVersion}. Do not reference outputs from other engine versions.
5. **Uncertainty acknowledgment**: If the engine state does not contain data needed to answer a question, say so explicitly rather than estimating.`;

    // Inject guardrail into the system message
    const messagesWithGuardrail = messages.map((m: { role: string; content: string }) => {
      if (m.role === 'system') {
        return { ...m, content: m.content + guardrailInjection };
      }
      return m;
    });

    // If no system message exists, prepend a minimal one with guardrails
    const hasSystem = messages.some((m: { role: string }) => m.role === 'system');
    const finalMessages = hasSystem ? messagesWithGuardrail : [
      { role: 'system', content: `You are a property pricing analyst assistant for Property Pricer v1.6.${guardrailInjection}` },
      ...messagesWithGuardrail,
    ];

    let responseText = '';

    if (provider === 'OPEN_AI') {
      const { OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: userApiKey });
      const completion = await client.chat.completions.create({
        model,
        messages: finalMessages,
        max_tokens: parameters?.max_tokens || 2048,
        temperature: parameters?.temperature ?? 1,
      });
      responseText = completion.choices[0]?.message?.content || '';
    } else if (provider === 'ANTHROPIC') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: userApiKey });
      const systemMsg = finalMessages.find((m: { role: string }) => m.role === 'system');
      const userMessages = finalMessages.filter((m: { role: string }) => m.role !== 'system');
      const completion = await client.messages.create({
        model,
        max_tokens: parameters?.max_tokens || 2048,
        system: systemMsg?.content || undefined,
        messages: userMessages,
      });
      responseText = completion.content[0]?.type === 'text' ? completion.content[0].text : '';
    } else if (provider === 'GEMINI') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(userApiKey);
      const geminiModel = client.getGenerativeModel({ model });
      const systemMsg = finalMessages.find((m: { role: string }) => m.role === 'system');
      const userMessages = finalMessages.filter((m: { role: string }) => m.role !== 'system');
      const history = userMessages.slice(0, -1).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const lastMsg = userMessages[userMessages.length - 1];
      const chat = geminiModel.startChat({
        history,
        systemInstruction: systemMsg?.content,
      });
      const result = await chat.sendMessage(lastMsg?.content || '');
      responseText = result.response.text();
    } else {
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    return NextResponse.json({
      choices: [{ message: { role: 'assistant', content: responseText } }],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as { status?: number })?.status;
    const safeMessage = message.replace(/sk-[A-Za-z0-9\-_]{10,}/g, '[REDACTED]').replace(/AIza[A-Za-z0-9\-_]{10,}/g, '[REDACTED]');
    console.error(`[AI BYOK] Provider error — code: ${code ?? 'unknown'}, message: ${safeMessage}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
