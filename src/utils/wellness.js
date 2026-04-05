/**
 * Wellness Index Calculation
 *
 * Formula: Wellness = α(RMSSD) + β(SpO2) + γ(RR_Stability)
 *
 * Each component is normalized to 0-100 then weighted.
 * Placeholder constants — tune with real clinical data.
 */

// Weight constants (must sum to 1.0)
const ALPHA = 0.4; // HRV (RMSSD) weight
const BETA = 0.35; // SpO2 weight
const GAMMA = 0.25; // RR stability weight

// Normal ranges for normalization
const RMSSD_MIN = 10; // ms — very low HRV
const RMSSD_MAX = 100; // ms — excellent HRV
const SPO2_MIN = 88; // % — dangerously low
const SPO2_MAX = 100; // % — perfect
const RR_IDEAL = 15; // breaths/min — ideal
const RR_TOLERANCE = 6; // acceptable deviation

/**
 * Clamp value between 0 and 100
 */
function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Normalize RMSSD to 0-100 score
 */
function normalizeRMSSD(rmssd) {
  if (rmssd == null) return 50; // default if missing
  const score = ((rmssd - RMSSD_MIN) / (RMSSD_MAX - RMSSD_MIN)) * 100;
  return clamp(score);
}

/**
 * Normalize SpO2 to 0-100 score
 */
function normalizeSpO2(spo2) {
  if (spo2 == null) return 85; // default if missing
  const score = ((spo2 - SPO2_MIN) / (SPO2_MAX - SPO2_MIN)) * 100;
  return clamp(score);
}

/**
 * Normalize RR stability to 0-100 score
 * Closer to ideal = higher score
 */
function normalizeRRStability(rr) {
  if (rr == null) return 70; // default if missing
  const deviation = Math.abs(rr - RR_IDEAL);
  const score = Math.max(0, (1 - deviation / RR_TOLERANCE)) * 100;
  return clamp(score);
}

/**
 * Calculate the Wellness Index (0-100)
 *
 * @param {Object} vitals
 * @param {number} vitals.hrv - HRV in ms
 * @param {number} vitals.respiratory_rate - Respiratory rate bpm
 * @returns {number} Wellness score 0-100
 */
export function calculateWellnessIndex({ hrv, respiratory_rate }) {
  const rmssdScore = normalizeRMSSD(hrv);
  // Re-distribute the SPO2 weight if we don't track it anymore
  const rrScore = normalizeRRStability(respiratory_rate);

  // Since SPO2 isn't in DB, we'll re-weight ALPHA and GAMMA to sum to 1.0 (e.g. ALPHA=0.6, GAMMA=0.4)
  const wellness = 0.6 * rmssdScore + 0.4 * rrScore;
  return Math.round(clamp(wellness));
}

/**
 * Get the plain-English wellness status label
 */
export function getWellnessLabel(score) {
  if (score >= 80) return { label: 'Excellent', color: 'green' };
  if (score >= 60) return { label: 'Good', color: 'green' };
  if (score >= 40) return { label: 'Fair', color: 'yellow' };
  if (score >= 20) return { label: 'Low', color: 'yellow' };
  return { label: 'Critical', color: 'red' };
}

/**
 * Get plain-English translation for a vital metric
 */
export function getVitalTranslation(type, value) {
  if (value == null) return "No data yet";
  switch (type) {
    case 'hr':
      if (value < 50) return 'Low resting heart rate';
      if (value <= 100) return 'Normal resting';
      if (value <= 120) return 'Mildly elevated';
      return 'Elevated — monitor closely';
    case 'hrv':
      if (value < 20) return 'Low variability';
      if (value <= 50) return 'Stable stress levels';
      if (value <= 80) return 'Good variability';
      return 'Excellent variability';
    case 'rr':
      if (value < 10) return 'Slow breathing';
      if (value <= 20) return 'Clear breathing';
      if (value <= 24) return 'Slightly elevated';
      return 'Rapid breathing — monitor';
    default:
      return '';
  }
}

/**
 * Get accurate reference ranges based on age and gender charts.
 */
export function getReferenceRanges(profile) {
  let hrRef = "60-100 BPM"; // fallback
  let rrRef = "10-20 BR/MIN"; // fallback adult

  if (!profile || !profile.gender || !profile.date_of_birth) {
    return { hrRef, rrRef };
  }

  const dobDate = new Date(profile.date_of_birth);
  const now = new Date();
  let age = now.getFullYear() - dobDate.getFullYear();
  if (now.getMonth() < dobDate.getMonth() || (now.getMonth() === dobDate.getMonth() && now.getDate() < dobDate.getDate())) {
    age--;
  }

  const gender = profile.gender.toLowerCase();

  // Heart Rate (Athlete Min to Below Average Max)
  if (gender === 'female') {
    if (age <= 25) hrRef = "54-84";
    else if (age >= 26 && age <= 35) hrRef = "54-82";
    else if (age >= 36 && age <= 45) hrRef = "54-84";
    else if (age >= 46 && age <= 55) hrRef = "54-83";
    else if (age >= 56 && age <= 65) hrRef = "54-83";
    else hrRef = "54-84";
  } else if (gender === 'male') {
    if (age <= 25) hrRef = "49-81";
    else if (age >= 26 && age <= 35) hrRef = "49-81";
    else if (age >= 36 && age <= 45) hrRef = "50-82";
    else if (age >= 46 && age <= 55) hrRef = "50-83";
    else if (age >= 56 && age <= 65) hrRef = "51-81";
    else hrRef = "50-79";
  }

  // Respiration
  if (age < 1) rrRef = "26-60";
  else if (age >= 1 && age <= 10) rrRef = "14-50";
  else if (age >= 11 && age < 18) rrRef = "12-22";
  else rrRef = "10-20";

  return { hrRef: `Ref: ${hrRef} BPM`, rrRef: `Ref: ${rrRef} BR/MIN` };
}

// Export constants for testing / tuning
export const WEIGHTS = { ALPHA, BETA, GAMMA };
