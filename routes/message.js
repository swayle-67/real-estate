/**
 * routes/message.js
 * POST /message — main endpoint that simulates receiving a WhatsApp message.
 */

const express = require('express');
const router = express.Router();
const { callAI } = require('../services/aiService');
const { buildMessages, parseLeadData } = require('../services/prompt');
const {
  getSession,
  addMessage,
  updateLeadData,
  LEAD_GRADES,
} = require('../services/memoryService');

// Simulated property listings (replace or extend as needed for your demo)
const PROPERTY_LISTINGS = {
  'prop-001': {
    id: 'prop-001',
    title: 'Modern 2BR Apartment – City Centre',
    price: '$450,000',
    location: 'Downtown, Metro City',
    type: 'Apartment',
    bedrooms: 2,
    available: true,
    description:
      'Newly renovated apartment on the 12th floor with panoramic city views, open-plan kitchen, and secure parking.',
  },
  'prop-002': {
    id: 'prop-002',
    title: 'Spacious Family Villa – Greenwood Estates',
    price: '$1,250,000',
    location: 'Greenwood Estates, North Suburbs',
    type: 'Villa',
    bedrooms: 5,
    available: true,
    description:
      'Private gated villa with landscaped garden, pool, 5 bedrooms, home office, and double garage. School catchment area.',
  },
  'prop-003': {
    id: 'prop-003',
    title: 'Studio Apartment – Arts District',
    price: '$1,800/month',
    location: 'Arts District, Metro City',
    type: 'Apartment',
    bedrooms: 0,
    available: false,
    description:
      'Trendy studio in the heart of the Arts District. Exposed brick, high ceilings, and rooftop access. Currently under offer.',
  },
};

/**
 * POST /message
 * Body: { session_id: string, message: string, property_id?: string }
 */
router.post('/', async (req, res) => {
  const { session_id, message, property_id } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'session_id is required and must be a string.' });
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'message is required and must be a non-empty string.' });
  }

  const trimmedMessage = message.trim();
  const session = getSession(session_id);
  const propertyContext = property_id ? PROPERTY_LISTINGS[property_id] || null : null;

  // ── Terminal logging: Incoming message ───────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║          INCOMING MESSAGE                ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Session ID  : ${session_id}`);
  console.log(`  Message     : "${trimmedMessage}"`);
  if (property_id) {
    console.log(`  Property ID : ${property_id} → ${propertyContext ? propertyContext.title : 'NOT FOUND'}`);
  }
  console.log(`  Lead Grade  : ${session.leadGrade}`);
  console.log(`  Msg History : ${session.messages.length} messages`);

  // ── Store the user's message ──────────────────────────────────────────────
  addMessage(session_id, 'user', trimmedMessage);

  // ── Build and log the full prompt ────────────────────────────────────────
  const messages = buildMessages(session, propertyContext);

  console.log('\n📋 FULL PROMPT SENT TO AI:');
  console.log('┌─────────────────────────────────────────┐');
  messages.forEach((m, i) => {
    const preview =
      m.content.length > 200 ? m.content.substring(0, 200) + '... [truncated]' : m.content;
    console.log(`  [${i}] role=${m.role}`);
    console.log(`      ${preview.replace(/\n/g, '\n      ')}`);
    console.log('');
  });
  console.log('└─────────────────────────────────────────┘');

  // ── Call the AI ──────────────────────────────────────────────────────────
  let rawReply;
  try {
    rawReply = await callAI(messages);
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
    console.error('\n❌ AI API ERROR:', errorMsg);
    return res.status(502).json({
      error: 'AI service unavailable.',
      detail: errorMsg,
    });
  }

  // ── Parse lead metadata from reply ───────────────────────────────────────
  const { cleanReply, leadData } = parseLeadData(rawReply);

  if (leadData) {
    const validGrades = Object.values(LEAD_GRADES);
    const grade = validGrades.includes(leadData.grade?.toUpperCase())
      ? leadData.grade.toUpperCase()
      : 'UNKNOWN';

    updateLeadData(session_id, {
      qualificationData: {
        budget: leadData.budget,
        location: leadData.location,
        propertyType: leadData.propertyType,
        timeline: leadData.timeline,
      },
      leadGrade: grade,
      stage: 'QUALIFYING',
    });
  }

  // ── Store assistant reply ─────────────────────────────────────────────────
  addMessage(session_id, 'assistant', cleanReply);

  // ── Terminal logging: AI response ────────────────────────────────────────
  const updatedSession = getSession(session_id);

  console.log('\n🤖 AI RESPONSE:');
  console.log('┌─────────────────────────────────────────┐');
  console.log(`  ${cleanReply.replace(/\n/g, '\n  ')}`);
  console.log('└─────────────────────────────────────────┘');

  if (leadData) {
    console.log('\n🏷️  EXTRACTED LEAD DATA:');
    console.log('  Budget       :', leadData.budget || '—');
    console.log('  Location     :', leadData.location || '—');
    console.log('  Property Type:', leadData.propertyType || '—');
    console.log('  Timeline     :', leadData.timeline || '—');
    console.log('  Grade        :', updatedSession.leadGrade);
  }

  console.log('\n📊 SESSION MEMORY STATE:');
  console.log(JSON.stringify({
    sessionId: updatedSession.id,
    leadGrade: updatedSession.leadGrade,
    stage: updatedSession.stage,
    qualificationData: updatedSession.qualificationData,
    totalMessages: updatedSession.messages.length,
    updatedAt: updatedSession.updatedAt,
  }, null, 2));

  // ── Response ──────────────────────────────────────────────────────────────
  return res.json({
    reply: cleanReply,
    session_id,
    lead_grade: updatedSession.leadGrade,
    qualification: updatedSession.qualificationData,
  });
});

module.exports = router;
