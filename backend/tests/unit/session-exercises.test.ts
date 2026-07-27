import { getCurrentVersionExercises } from '../../src/utils/session-exercises';

describe('session-exercises', () => {
  it('returns exercises matching session version', () => {
    const exercises = [
      { id: '1', sessionVersion: 1, exerciseName: 'Old' },
      { id: '2', sessionVersion: 2, exerciseName: 'New' },
    ];
    expect(getCurrentVersionExercises(2, exercises)).toEqual([exercises[1]]);
  });

  it('returns empty when no version match', () => {
    expect(getCurrentVersionExercises(3, [{ id: '1', sessionVersion: 1 }])).toEqual([]);
  });
});
