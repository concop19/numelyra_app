import { evaluateAgentDecision } from './agentDecisionEngine';
import type { ProfileItem } from '../store/userProfile';

const profile = [{
  id: 'p1',
  fullName: 'Taylor Reed',
  birthDate: '1994-08-12',
  gender: 'female' as const,
}] as ProfileItem[];

describe('bilingual local agent classifier', () => {
  test.each([
    ['Should I choose option A or option B?', 'two_choices'],
    ['Where should we go for a date nearby?', 'where_to_go'],
    ['What are my personality strengths?', 'core_personality'],
    ['What is coming over the next few months?', 'timing_trajectory'],
    ['What color should I wear today?', 'color_guidance'],
    ['Can I have some guidance for today?', 'daily_guidance'],
  ])('classifies English: %s', (question, intent) => {
    expect(evaluateAgentDecision(question, profile, 'en').intent).toBe(intent);
  });

  it('returns an English trash fallback in an English session', () => {
    const decision = evaluateAgentDecision('asdfasdf', profile, 'en');
    expect(decision.intent).toBe('trash');
    expect(decision.replyText).toContain('clear topic');
    expect(decision.replyText).not.toMatch(/[À-ỹ]/);
  });
});
