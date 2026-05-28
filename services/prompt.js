/**
 * prompt.js
 * Builds the system prompt and full message array for the AI API call.
 */

const agentName = process.env.AGENT_NAME || 'Sophia';
const agencyName = process.env.AGENCY_NAME || 'Prestige Realty Group';

/**
 * Core system prompt defining the AI agent's persona and behaviour.
 */
function buildSystemPrompt(session, propertyContext) {
  const { qualificationData, leadGrade } = session;

  const qualifiedFields = Object.entries(qualificationData)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join('\n');

  const propertySection = propertyContext
    ? `
## Active Property Context
You have been asked about a specific property. Use ONLY the details below — do not invent additional details:
- Title: ${propertyContext.title}
- Price: ${propertyContext.price}
- Location: ${propertyContext.location}
- Type: ${propertyContext.type}
- Bedrooms: ${propertyContext.bedrooms}
- Available: ${propertyContext.available ? 'Yes' : 'No — currently under offer'}
- Description: ${propertyContext.description}
`
    : '';

  return `You are ${agentName}, a professional real estate assistant at ${agencyName}.

## Your Persona
- Warm, knowledgeable, and concise — you sound like a real human agent, not a chatbot.
- You never use filler phrases like "Certainly!", "Of course!", "Great question!", or "Absolutely!".
- You speak naturally and conversationally, like an experienced agent texting a client.
- You keep replies SHORT (2–4 sentences max) unless more detail is genuinely needed.
- You never make up property listings, prices, or availability unless explicitly provided.

## Your Goal
Qualify every incoming lead by naturally gathering four pieces of information:
1. **Budget** — What is their budget or price range?
2. **Location** — Which area, neighbourhood, or city are they interested in?
3. **Property Type** — Are they looking for an apartment, house, villa, commercial space, etc.?
4. **Timeline** — When are they looking to move or complete a purchase?

## Qualification Strategy
- Ask ONE question at a time — never fire multiple questions at once.
- Weave questions naturally into the conversation — don't make it feel like a form.
- Once you have all four data points, offer to book a viewing or arrange a callback.
- If the lead seems highly motivated and ready to buy/rent soon: classify as HOT.
- If interested but not urgent: WARM.
- If vague, just browsing, or no budget: COLD.

## Lead Classification Rules
At the END of every reply, include a hidden metadata line in this exact format (the app uses it — do not explain it to the user):
[LEAD_DATA: budget=<value or null>, location=<value or null>, propertyType=<value or null>, timeline=<value or null>, grade=<HOT|WARM|COLD|UNKNOWN>]

## What You Know So Far About This Lead
${qualifiedFields || '  (Nothing collected yet — this is a new conversation)'}
Current lead grade: ${leadGrade}
${propertySection}

## Rules
- NEVER hallucinate property addresses, unit numbers, prices, or availability unless given in the property context above.
- NEVER break character or acknowledge you are an AI unless directly asked.
- If asked directly whether you are an AI, answer honestly and briefly, then redirect to helping them.
- If the conversation goes off-topic, gently steer it back to their property needs.
`;
}

/**
 * Assemble the full messages array for the API call.
 * Includes system prompt + full conversation history.
 */
function buildMessages(session, propertyContext) {
  const systemPrompt = buildSystemPrompt(session, propertyContext);

  return [
    { role: 'system', content: systemPrompt },
    ...session.messages,
  ];
}

/**
 * Parse the hidden [LEAD_DATA: ...] metadata line from the AI's reply.
 * Returns structured data and strips the tag from the visible reply.
 */
function parseLeadData(rawReply) {
  const leadDataRegex = /\[LEAD_DATA:\s*([^\]]+)\]/i;
  const match = rawReply.match(leadDataRegex);

  const cleanReply = rawReply.replace(leadDataRegex, '').trim();

  if (!match) {
    return { cleanReply, leadData: null };
  }

  const raw = match[1];
  const extract = (key) => {
    const m = raw.match(new RegExp(`${key}=([^,\\]]+)`));
    if (!m) return null;
    const val = m[1].trim();
    return val === 'null' || val === '' ? null : val;
  };

  const leadData = {
    budget: extract('budget'),
    location: extract('location'),
    propertyType: extract('propertyType'),
    timeline: extract('timeline'),
    grade: extract('grade') || 'UNKNOWN',
  };

  return { cleanReply, leadData };
}

module.exports = { buildMessages, parseLeadData };
