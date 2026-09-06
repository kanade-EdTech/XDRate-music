import type { MusicRatingDraft } from '../../domain/rating/types';

export const HAITANGXIAN_TEMPLATE_ID = 'template-haitangxian-v1';
export const HAITANGXIAN_TEMPLATE_NAME = '海棠仙';

export function createHaitangxianRating(): MusicRatingDraft {
  return {
    mode: 'simple',
    work: {
      title: '海棠仙',
      artistLabel: null,
      artist: '纯白；星尘',
      albumLabel: null,
      album: '中华少女',
      extraFields: [],
      releaseYear: '2004',
      coverDataUrl: null,
    },
    axes: [
      {
        id: 'axis-haitangxian-artistic-quality',
        name: '艺术品质',
        score: 8,
        importanceLevel: 3,
        enabled: true,
        reason: '采用了高几个八度的离调',
      },
      {
        id: 'axis-haitangxian-listening',
        name: '听感',
        score: 7,
        importanceLevel: 3,
        enabled: true,
        reason: '当时全新出炉的星尘V4',
      },
      {
        id: 'axis-haitangxian-personal',
        name: '个人喜好',
        score: 9,
        importanceLevel: 3,
        enabled: true,
        reason: '禁忌组99',
      },
    ],
    negativeItems: [],
    overallComment: '',
    personalStory: '17年网易云从甲铁城的配乐心动到了《白·棠·彩》，注意到了这三首歌',
  };
}
