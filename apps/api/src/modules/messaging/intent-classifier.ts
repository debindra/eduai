import { isAttendanceNonObservation } from '@eduai/ai';

export type IntentRoute = 'attendance' | 'faq' | 'admin' | 'teacher_queue';

const FAQ_KEYWORDS = [
  'what time',
  'school hours',
  'uniform',
  'holiday',
  'closure',
  'how to join',
  'whatsapp',
];

const ADMIN_KEYWORDS = ['fee', 'fees', 'payment', 'complaint', 'complain', 'billing', 'invoice'];

export function classifyMessageIntent(text: string): IntentRoute {
  if (isAttendanceNonObservation(text)) {
    return 'attendance';
  }
  const lower = text.toLowerCase();
  if (ADMIN_KEYWORDS.some((k) => lower.includes(k))) {
    return 'admin';
  }
  if (FAQ_KEYWORDS.some((k) => lower.includes(k))) {
    return 'faq';
  }
  return 'teacher_queue';
}

export function faqAutoReply(text: string): string {
  return (
    'Thanks for your message. For school hours, uniforms, and holidays, ' +
    'please check the school notice board or wait for the teacher\'s next-school-day reply. ' +
    `(Received: ${text.slice(0, 80)})`
  );
}
