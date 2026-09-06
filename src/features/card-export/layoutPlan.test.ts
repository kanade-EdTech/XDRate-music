import { describe, expect, it } from 'vitest';

import type { MusicRatingDraft } from '../../domain/rating/types';
import type { CardContentProfile } from './types';
import {
  estimateLines,
  estimateTextUnits,
  profileCardContent,
  resolveCardLayout,
} from './layoutPlan';
import { ALL_CARD_RATIOS, getRatioConfig } from './ratioConfig';

const sparseProfile: CardContentProfile = {
  hasCover: false,
  enabledAxisCount: 0,
  axisReasonCount: 0,
  axisReasonUnits: 0,
  negativeItemCount: 0,
  commentUnits: 0,
  storyUnits: 0,
};

const denseProfile: CardContentProfile = {
  hasCover: true,
  enabledAxisCount: 12,
  axisReasonCount: 12,
  axisReasonUnits: 6000,
  negativeItemCount: 5,
  commentUnits: 2000,
  storyUnits: 3000,
};

describe('card content composition plan', () => {
  it('uses deterministic mixed-script text units and line estimates', () => {
    expect(estimateTextUnits('中文A1')).toBeCloseTo(3.1, 5);
    expect(estimateLines(72, 36)).toBe(2);
    expect(estimateLines(0, 36)).toBe(0);
  });

  it('selects sparse and dense plans at the documented extremes', () => {
    expect(resolveCardLayout(getRatioConfig('1:1'), sparseProfile).density).toBe('sparse');
    expect(resolveCardLayout(getRatioConfig('1:1'), denseProfile).density).toBe('dense');
  });

  it('includes enabled non-empty axis reasons only when reasons are enabled', () => {
    const draft: MusicRatingDraft = {
      mode: 'simple',
      work: {
        title: 'Fixture',
        artistLabel: null,
        artist: '',
        albumLabel: null,
        album: '',
        extraFields: [],
        releaseYear: '',
        coverDataUrl: null,
      },
      axes: [
        { id: 'a', name: 'A', score: 7, importanceLevel: 3, enabled: true, reason: 'visible' },
        { id: 'b', name: 'B', score: 8, importanceLevel: 3, enabled: false, reason: 'hidden' },
        { id: 'c', name: 'C', score: 9, importanceLevel: 3, enabled: true, reason: '  ' },
      ],
      negativeItems: [],
      overallComment: '',
      personalStory: '',
    };

    expect(profileCardContent(draft, { showReasons: true, showStory: true }).axisReasonCount).toBe(
      1,
    );
    expect(profileCardContent(draft, { showReasons: false, showStory: true }).axisReasonCount).toBe(
      0,
    );
  });

  it('excludes unrated axes from card content capacity and reasons', () => {
    const draft: MusicRatingDraft = {
      mode: 'simple',
      work: {
        title: 'Fixture',
        artistLabel: null,
        artist: '',
        albumLabel: null,
        album: '',
        extraFields: [],
        releaseYear: '',
        coverDataUrl: null,
      },
      axes: [
        { id: 'rated', name: 'Rated', score: 8, importanceLevel: 3, enabled: true, reason: '' },
        {
          id: 'unrated',
          name: 'Unrated',
          score: 0,
          importanceLevel: 3,
          enabled: true,
          reason: 'Must not appear',
        },
      ],
      negativeItems: [],
      overallComment: '',
      personalStory: '',
    };

    expect(profileCardContent(draft, { showReasons: true, showStory: true })).toMatchObject({
      enabledAxisCount: 1,
      axisReasonCount: 0,
    });
  });

  it('accurately profiles sparse reasons when only a subset of axes has reasons', () => {
    const sparseReasonDraft: MusicRatingDraft = {
      mode: 'simple',
      work: {
        title: 'Sparse Fixture',
        artistLabel: null,
        artist: '',
        albumLabel: null,
        album: '',
        extraFields: [],
        releaseYear: '',
        coverDataUrl: null,
      },
      axes: [
        { id: '1', name: 'Quality', score: 5, importanceLevel: 3, enabled: true, reason: '' },
        {
          id: '2',
          name: 'Listening',
          score: 7,
          importanceLevel: 3,
          enabled: true,
          reason: 'Special reason',
        },
        { id: '3', name: 'Preference', score: 8, importanceLevel: 3, enabled: true, reason: '   ' },
      ],
      negativeItems: [],
      overallComment: '',
      personalStory: '',
    };

    const profile = profileCardContent(sparseReasonDraft, { showReasons: true, showStory: true });
    expect(profile.axisReasonCount).toBe(1);
    expect(profile.enabledAxisCount).toBe(3);
    expect(profile.axisReasonUnits).toBeGreaterThan(0);
  });

  it('generates deterministic bounded fallback plans for all 11 ratios and five content fixtures', () => {
    const profiles: CardContentProfile[] = [
      sparseProfile,
      { ...sparseProfile, enabledAxisCount: 3, commentUnits: 12 },
      { ...sparseProfile, enabledAxisCount: 3, axisReasonCount: 3, axisReasonUnits: 120 },
      { ...denseProfile, axisReasonUnits: 850, commentUnits: 320, storyUnits: 260 },
      denseProfile,
    ];

    ALL_CARD_RATIOS.forEach((ratio) => {
      profiles.forEach((profile) => {
        const config = getRatioConfig(ratio);
        const first = resolveCardLayout(config, profile);
        const repeated = resolveCardLayout(config, profile);
        const fallback = resolveCardLayout(config, profile, 2);

        expect(first).toEqual(repeated);
        expect(fallback.fallbackLevel).toBe(2);
        expect(fallback.maxCommentLines).toBeLessThanOrEqual(first.maxCommentLines);
        expect(fallback.maxStoryLines).toBeLessThanOrEqual(first.maxStoryLines);
        expect(fallback.maxReasonLines).toBeLessThanOrEqual(first.maxReasonLines);
      });
    });
  });

  it('determines hasNarrative and adaptive chartSize/legendColumns based on content presence', () => {
    const squareConfig = getRatioConfig('1:1');
    const sparsePlan = resolveCardLayout(squareConfig, sparseProfile);
    expect(sparsePlan.hasNarrative).toBe(false);
    expect(sparsePlan.chartSize).toBe(280);
    expect(sparsePlan.legendColumns).toBe(2);

    const withNarrativeProfile: CardContentProfile = {
      ...sparseProfile,
      commentUnits: 50,
    };
    const narrativePlan = resolveCardLayout(squareConfig, withNarrativeProfile);
    expect(narrativePlan.hasNarrative).toBe(true);
    expect(narrativePlan.chartSize).toBe(240);
    expect(narrativePlan.legendColumns).toBe(1);
  });
});
