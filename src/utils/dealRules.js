const STAGE_PROBABILITIES = {
  qualification: 10,
  discovery: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0
};

const VALID_TRANSITIONS = {
  qualification: ['discovery', 'lost'],
  discovery: ['proposal', 'lost'],
  proposal: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: []
};

/**
 * Check if deal can transition from currentStage to nextStage
 * @param {string} currentStage 
 * @param {string} nextStage 
 * @returns {boolean}
 */
const canTransition = (currentStage, nextStage) => {
  const allowed = VALID_TRANSITIONS[currentStage] || [];
  return allowed.includes(nextStage);
};

/**
 * Check if a deal stage is considered closed (won or lost)
 * @param {string} stage 
 * @returns {boolean}
 */
const isClosed = (stage) => {
  return stage === 'won' || stage === 'lost';
};

module.exports = {
  STAGE_PROBABILITIES,
  VALID_TRANSITIONS,
  canTransition,
  isClosed
};
