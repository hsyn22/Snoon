/**
 * Callback payloads for the day question.
 *
 * Telegram caps `callback_data` at 64 bytes, so these stay short. The payload
 * carries the *day* and the answer and never the case: callback data is
 * attacker-controlled — anyone can send any string to a bot — so the case is
 * always resolved from the chat's own binding, exactly as the contact
 * confirmation does. A day is not a secret and cannot identify anyone.
 */
export const DAY_ANSWER_PREFIX = 'day:'

export type DayAnswer = { answer: 'yes' | 'no'; day: string }

export function parseDayAnswer(data: string): DayAnswer | null {
  if (!data.startsWith(DAY_ANSWER_PREFIX)) return null

  const [answer, day] = data.slice(DAY_ANSWER_PREFIX.length).split(':')
  if ((answer !== 'yes' && answer !== 'no') || !day) return null

  return { answer, day }
}
