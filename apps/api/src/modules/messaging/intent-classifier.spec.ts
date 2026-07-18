import { describe, expect, it } from 'vitest';
import { classifyMessageIntent } from './intent-classifier';

describe('classifyMessageIntent', () => {
  it('routes attendance non-observations first', () => {
    expect(classifyMessageIntent('Priya is absent today')).toBe('attendance');
    expect(classifyMessageIntent('She is sick')).toBe('attendance');
  });

  it('routes fees and complaints to admin', () => {
    expect(classifyMessageIntent('When is the fee due?')).toBe('admin');
    expect(classifyMessageIntent('I have a complaint about transport')).toBe('admin');
  });

  it('routes FAQ keywords to faq', () => {
    expect(classifyMessageIntent('What time does school start?')).toBe('faq');
  });

  it('defaults to teacher_queue', () => {
    expect(classifyMessageIntent('How can I help with counting at home?')).toBe('teacher_queue');
  });
});
