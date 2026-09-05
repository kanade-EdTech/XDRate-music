import { describe, expect, it } from 'vitest';

import { calculateRating } from '../rating/calculateRating';

import {
  algorithmVersion,
  applyTemplate,
  createArchive,
  createTemplate,
  migrateArchive,
  parseArchive,
  parseTemplate,
  schemaVersion,
  type Workspace,
} from './archive';

const testAppVersion = '0.2.0';

const workspace: Workspace = {
  rating: {
    mode: 'simple',
    work: {
      title: 'Song',
      artistLabel: null,
      artist: 'Artist',
      albumLabel: null,
      album: 'Album',
      extraFields: [],
      releaseYear: '2026',
      coverDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    },
    axes: [
      { id: 'axis', name: 'Art', score: 8, importanceLevel: 4, enabled: true, reason: 'Good' },
    ],
    negativeItems: [
      { id: 'negative', name: 'Noise', score: -1, enabled: true, reason: 'Too loud' },
    ],
    overallComment: 'Great',
    personalStory: 'Story',
  },
  cardOptions: { theme: 'light', ratio: '4:5', showReasons: true, showStory: true },
};

function legacyArchive(ratio: 'wide' | 'square' | 'portrait') {
  return {
    format: 'xdrate-music-archive',
    schemaVersion: 1,
    exportedAt: '2026-08-22T08:00:00.000Z',
    appVersion: '0.1.0',
    workspace: {
      ...workspace,
      cardOptions: { ...workspace.cardOptions, ratio },
    },
  };
}

describe('archive schemas', () => {
  it('round-trips a valid archive and rejects a malformed one', () => {
    const archive = createArchive(workspace, testAppVersion);
    expect(archive).toMatchObject({ schemaVersion, algorithmVersion });
    expect(parseArchive(archive)).toEqual(workspace);
    expect(() => parseArchive({ schemaVersion })).toThrow('invalid-archive');
  });

  it('rejects unsupported schema versions before importing', () => {
    expect(() => migrateArchive({ schemaVersion: schemaVersion + 1 })).toThrow(
      'unsupported-archive-version',
    );
  });

  it.each([
    'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'https://example.invalid/cover.png',
    'data:image/png;base64,AAAA',
  ])('rejects unsafe or signature-mismatched cover data: %s', (coverDataUrl) => {
    const archive = createArchive(
      {
        ...workspace,
        rating: {
          ...workspace.rating,
          work: { ...workspace.rating.work, coverDataUrl },
        },
      },
      testAppVersion,
    );
    expect(() => parseArchive(archive)).toThrow('invalid-archive');
  });

  it.each([
    ['wide', '16:9'],
    ['square', '1:1'],
    ['portrait', '4:5'],
  ] as const)('migrates the legacy %s ratio to %s without losing content', (legacy, current) => {
    const source = legacyArchive(legacy);
    const migrated = migrateArchive(source);

    expect(migrated).toMatchObject({ schemaVersion, algorithmVersion });
    expect(parseArchive(source)).toEqual({
      ...workspace,
      cardOptions: { ...workspace.cardOptions, ratio: current },
    });
    expect(source.workspace.cardOptions.ratio).toBe(legacy);
  });

  it('round-trips a Web v0.1 archive through Desktop v0.2 without desktop metadata', () => {
    const webV01 = legacyArchive('portrait');
    const desktopWorkspace = parseArchive(webV01);
    const desktopV02 = createArchive(desktopWorkspace, '0.2.0');
    const reopenedInWeb = parseArchive(JSON.parse(JSON.stringify(desktopV02)));
    const serialized = JSON.stringify(desktopV02);

    expect(reopenedInWeb).toEqual(desktopWorkspace);
    expect(calculateRating(reopenedInWeb.rating)).toEqual(calculateRating(desktopWorkspace.rating));
    expect(desktopV02).toMatchObject({ schemaVersion, algorithmVersion });
    expect(serialized).not.toMatch(/currentFilePath|currentFileHandle|opaque-handle/);
  });

  it('creates templates without scores or text and applies clean values', () => {
    const template = createTemplate('My template', workspace);
    expect(parseTemplate(template).name).toBe('My template');
    expect(applyTemplate(template, workspace).rating.axes[0]).toMatchObject({
      score: 0,
      reason: '',
    });
    expect(applyTemplate(template, workspace).rating.overallComment).toBe('Great');
  });

  it('migrates a v1 template and its legacy ratio', () => {
    const current = createTemplate('Legacy template', workspace);
    const legacy = {
      ...current,
      schemaVersion: 1,
      algorithmVersion: undefined,
      cardOptions: { ...current.cardOptions, ratio: 'wide' },
    };

    expect(parseTemplate(legacy)).toMatchObject({
      schemaVersion,
      algorithmVersion,
      cardOptions: { ratio: '16:9' },
    });
  });

  it('migrates v3 zero to unrated and sub-one scores to the new one-star minimum', () => {
    const legacy = {
      ...createArchive(workspace, testAppVersion),
      algorithmVersion: 'music-linear-100-v3',
      workspace: {
        ...workspace,
        rating: {
          ...workspace.rating,
          axes: [
            { ...workspace.rating.axes[0], id: 'zero', score: 0 },
            { ...workspace.rating.axes[0], id: 'fraction', score: 0.5 },
          ],
        },
      },
    };

    expect(parseArchive(legacy).rating.axes.map((axis) => axis.score)).toEqual([0, 1]);
    expect(migrateArchive(legacy)).toMatchObject({ algorithmVersion });
  });

  it('rounds legacy fractional positive scores to the nearest whole star', () => {
    const legacy = {
      ...createArchive(workspace, testAppVersion),
      workspace: {
        ...workspace,
        rating: {
          ...workspace.rating,
          axes: [
            { ...workspace.rating.axes[0], id: 'down', score: 7.4 },
            { ...workspace.rating.axes[0], id: 'up', score: 7.5 },
          ],
        },
      },
    };

    expect(parseArchive(legacy).rating.axes.map((axis) => axis.score)).toEqual([7, 8]);
  });

  it('adds default labels and an empty custom-entry list when importing an older v2 archive', () => {
    const legacyWork = {
      title: workspace.rating.work.title,
      artist: workspace.rating.work.artist,
      albumLabel: '',
      album: workspace.rating.work.album,
      releaseYear: workspace.rating.work.releaseYear,
      coverDataUrl: workspace.rating.work.coverDataUrl,
    };
    const legacy = {
      ...createArchive(workspace, testAppVersion),
      workspace: {
        ...workspace,
        rating: {
          ...workspace.rating,
          work: legacyWork,
        },
      },
    };

    expect(parseArchive(legacy).rating.work).toMatchObject({
      artistLabel: null,
      albumLabel: null,
      album: 'Album',
      extraFields: [],
    });
  });

  it('preserves explicitly cleared labels and custom work-metadata entries', () => {
    const customized: Workspace = {
      ...workspace,
      rating: {
        ...workspace.rating,
        work: {
          ...workspace.rating.work,
          artistLabel: '',
          albumLabel: '',
          extraFields: [{ id: 'metadata-1', label: '系列', value: '第一部' }],
        },
      },
    };

    expect(parseArchive(createArchive(customized, testAppVersion))).toEqual(customized);
  });
});
