import { exerciseVolumeKg, totalVolumeKg } from '../../src/utils/workout-volume';

describe('workout-volume', () => {
  it('sums per-set volume', () => {
    expect(
      totalVolumeKg([
        {
          setDetails: [
            { reps: 10, weightKg: 50 },
            { reps: 8, weightKg: 52.5 },
          ],
        },
      ])
    ).toBe(920);
  });

  it('falls back to aggregate fields', () => {
    expect(
      exerciseVolumeKg({
        actualSets: 3,
        actualReps: 10,
        actualWeightKg: 40,
      })
    ).toBe(1200);
  });
});
