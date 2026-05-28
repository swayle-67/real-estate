/**
 * memoryService.js
 * In-memory session store for conversation history and lead data.
 * No database required — all data lives in RAM and resets on server restart.
 */

// Map of session_id -> session object
const sessions = new Map();

const LEAD_STAGES = {
  NEW: 'NEW',
  QUALIFYING: 'QUALIFYING',
  QUALIFIED: 'QUALIFIED',
};

const LEAD_GRADES = {
  HOT: 'HOT',
  WARM: 'WARM',
  COLD: 'COLD',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Retrieve or create a session.
 */
function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stage: LEAD_STAGES.NEW,
      leadGrade: LEAD_GRADES.UNKNOWN,
      qualificationData: {
        budget: null,
        location: null,
        propertyType: null,
        timeline: null,
      },
      messages: [], // { role: 'user' | 'assistant', content: string }
    });
  }
  return sessions.get(sessionId);
}

/**
 * Append a message to a session's history.
 */
function addMessage(sessionId, role, content) {
  const session = getSession(sessionId);
  session.messages.push({ role, content });
  session.updatedAt = new Date().toISOString();
  return session;
}

/**
 * Update lead qualification data and grade.
 */
function updateLeadData(sessionId, updates) {
  const session = getSession(sessionId);
  Object.assign(session.qualificationData, updates.qualificationData || {});
  if (updates.leadGrade) session.leadGrade = updates.leadGrade;
  if (updates.stage) session.stage = updates.stage;
  session.updatedAt = new Date().toISOString();
  return session;
}

/**
 * Return a snapshot of all active sessions (for debugging/logging).
 */
function getAllSessions() {
  const result = {};
  for (const [id, session] of sessions.entries()) {
    result[id] = {
      id: session.id,
      stage: session.stage,
      leadGrade: session.leadGrade,
      qualificationData: session.qualificationData,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
  return result;
}

/**
 * Delete a session (optional cleanup).
 */
function clearSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = {
  getSession,
  addMessage,
  updateLeadData,
  getAllSessions,
  clearSession,
  LEAD_STAGES,
  LEAD_GRADES,
};
