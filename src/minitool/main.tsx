import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { calculateRating, isRatedAxis } from '../domain/rating/calculateRating';
import { createDefaultAxes, createNegativeItem, createRatingAxis } from '../domain/rating/presets';
import type { MusicRatingDraft, NegativeItem, RatingAxis } from '../domain/rating/types';
import { ALL_CARD_RATIOS, getRatioConfig } from '../features/card-export/ratioConfig';
import type { CardRatio } from '../features/card-export/types';
import { createMiniToolPlatformServices } from '../platform/minitoolPlatform';
import { initializeMiniTool, type InitialTemplateNotice } from './bootstrap';
import {
  cloneRatingWithoutCover,
  createContentTemplate,
  createContentTemplateId,
  findContentTemplateByName,
  MINI_TOOL_CONTENT_TEMPLATE_LIMIT,
  normalizeContentTemplateName,
  putContentTemplate,
  removeContentTemplate,
  saveContentTemplateCatalog,
  type ContentTemplateCatalogSaveResult,
  type MiniToolContentTemplate,
  type MiniToolContentTemplateCatalog,
} from './contentTemplates';
import { compressCoverImage, type CompressedCover } from './coverImage';
import {
  buildPostNotePayload,
  countPostNoteCharacters,
  limitPostNoteText,
  POST_NOTE_LIMITS,
  type PostNoteDraft,
  type PostNoteTruncation,
} from './postNotePayload';
import { loadPendingPostDraft, savePendingPostDraft } from './postNoteStorage';
import { saveMiniToolWorkspace, type MiniToolLocale } from './storage';
import { calculateViewportMetrics } from './viewport';

type SaveState = 'restored' | 'saving' | 'saved' | 'failed' | 'invalid' | 'unavailable';
type TemplateNotice =
  | InitialTemplateNotice
  | 'saved'
  | 'renamed'
  | 'deleted'
  | 'applied'
  | 'invalid-name'
  | 'duplicate'
  | 'limit'
  | 'too-large';
type AlbumState = 'idle' | 'preview-ready' | 'saving' | 'saved' | 'cancelled' | 'failed';
type PostState =
  | 'idle'
  | 'confirming'
  | 'restored'
  | 'persisting'
  | 'submitting'
  | 'accepted'
  | 'cancelled'
  | 'failed'
  | 'storage-failed'
  | 'invalid';
type CoverState =
  | 'idle'
  | 'processing'
  | 'ready'
  | 'invalid-type'
  | 'too-large'
  | 'decode-failed'
  | 'encode-failed';

interface InitialState {
  locale: MiniToolLocale;
  rating: MusicRatingDraft;
  saveState: SaveState;
  templateCatalog: MiniToolContentTemplateCatalog;
  templateNotice: TemplateNotice;
  pendingPost: PostNoteDraft | null;
  pendingPostState: Extract<PostState, 'idle' | 'restored' | 'invalid'>;
}

const copy = {
  'zh-CN': {
    product: '多维音乐评价',
    subtitle: '离线填写并自动保存；正式评分卡支持 11 种图片比例。',
    language: '界面语言',
    ratio: '图片比例',
    saved: '草稿已自动保存',
    saving: '正在保存草稿…',
    restored: '已恢复上次草稿',
    failed: '草稿未保存；当前内容仍保留在本页',
    invalid: '旧草稿已隔离，已新建安全草稿',
    unavailable: '当前容器不允许本地存储',
    score: '综合分',
    unrated: '至少完成一个加分项后计算',
    work: '作品信息',
    title: '作品名',
    artist: '艺术家',
    album: '专辑',
    year: '发行年份',
    cover: '本地封面（离线压缩预览，不写入草稿）',
    coverProcessing: '正在离线压缩封面…',
    coverReady: '封面已压缩',
    coverInvalid: '请选择 PNG、JPEG 或 WebP 图片',
    coverTooLarge: '原图超过 20 MiB，未加载以保护内存',
    coverFailed: '无法解码或压缩这张图片，请换一张重试',
    clearCover: '移除封面',
    mode: '评分模式',
    simple: '简易模式',
    professional: '专业模式',
    custom: '自定义模式',
    dimensions: '加分项',
    addPositive: '添加加分项',
    newPositive: '新增加分项',
    removePositive: '移除加分项',
    scoreAction: '评分',
    deductAction: '扣',
    points: '分',
    reason: '理由（可选）',
    unratedAxis: '未评分，不计入综合分',
    negative: '扣分项',
    addNegative: '添加扣分项',
    remove: '移除',
    negativeName: '扣分项名称',
    overall: '总体评价',
    story: '个人故事',
    exportTitle: '评分卡预览、相册与发布',
    exportHelp:
      '预览、相册保存和发布确认使用同一张正式评分卡 PNG。当前比例可切换，提交前请确认文字和图片。',
    generate: '生成评分卡 PNG',
    saveAlbum: '保存评分卡到系统相册',
    bridgeReady: 'JSBridge 已检测到',
    bridgeMissing: '未检测到 JSBridge；仍可离线编辑和预览',
    previewReady: '评分卡 PNG 已生成',
    albumSaving: '正在请求保存…',
    albumSaved: '已保存到系统相册',
    albumCancelled: '用户取消了保存',
    albumFailed: '保存失败；草稿仍保留，可重试',
    preview: '评分卡 PNG 预览',
    preparePost: '发布到小红书',
    postRequiresPreview: '请先生成评分卡 PNG，再进入发布确认。',
    postBridgeMissing: '当前客户端未提供帖子发布能力；仍可生成 PNG 并保存到相册。',
    postConfirmation: '发布确认',
    postHelp: '请确认将要提交的文字和图片。最终公开发布仍由你在小红书原生页面完成。',
    postTitle: '帖子标题',
    postContent: '帖子正文',
    postTags: '标签（可选）',
    postTitleCount: '标题字符数：',
    postContentCount: '正文字数：',
    postImage: '待提交的评分卡',
    postPrivacyTitle: '提交范围与隐私',
    postPrivacy:
      '确认页仍在本地编辑。只有点击“去小红书发布”后，下方显示的标题、正文、标签和评分卡图片才会交给小红书；本工具不会代替你完成最终公开发布。',
    postBack: '返回编辑（保留本次确认）',
    postSubmit: '去小红书发布',
    postConfirming: '请核对内容后再继续',
    postRestored: '已恢复上次未完成的发布确认',
    postPersisting: '正在保存草稿和待发布内容…',
    postSubmitting: '正在进入小红书发布流程…',
    postAccepted: '已进入小红书发布流程；最终是否公开发布由你确认',
    postCancelled: '已取消；确认内容和评分卡仍完整保留',
    postFailed: '未能进入发布流程；确认内容仍保留，可重试',
    postStorageFailed: '无法安全保存草稿或待发布内容，未打开发布流程',
    postInvalid: '待发布内容无效，请重新生成评分卡',
    postTruncated: '预填文字已按平台上限缩短，请在继续前确认。',
    footer:
      '编辑数据仅保存在当前容器缓存，可能被系统清理；不会联网。保存相册只提交 PNG；只有最终确认发布时，所示文字和 PNG 才交给小红书。',
    templates: '内容模板',
    templateHelp:
      '模板保存在当前小工具本地缓存中，可改名或删除；系统清理数据后无法恢复。封面不会写入模板。',
    templateName: '新模板名称',
    templatePlaceholder: '输入 1–40 个字符',
    saveTemplate: '将当前内容存为模板',
    applyTemplate: '套用',
    renameTemplate: '改名',
    deleteTemplate: '删除',
    emptyTemplates: '暂无内容模板。',
    templateSeeded: '首次开局模板已创建；《海棠仙》可像普通模板一样改名或删除。',
    templateSaved: '内容模板已保存',
    templateRenamed: '模板已改名',
    templateDeleted: '模板已删除；之后不会自动恢复',
    templateApplied: '模板已套用，当前编辑内容已替换',
    templateInvalidName: '模板名需为 1–40 个字符',
    templateDuplicate: '已有同名模板',
    templateLimit: '最多保存 20 个内容模板',
    templateTooLarge: '模板目录超过 512 KiB，未保存',
    templateFailed: '模板未保存；原目录和当前内容保持不变',
    templateCatalogInvalid: '模板目录损坏，已隔离且不会自动重建',
    templateStorageUnavailable: '当前容器不允许保存模板',
    confirmApply: '套用模板会替换当前编辑内容，是否继续？',
    confirmReplace: '已有同名模板，是否用当前内容覆盖？',
    confirmDelete: '删除后无法从本地模板目录恢复，是否继续？',
  },
  en: {
    product: 'Multidimensional Music Rating',
    subtitle: 'Rate offline with auto-save. The production rating card supports 11 image ratios.',
    language: 'Language',
    ratio: 'Image ratio',
    saved: 'Draft auto-saved',
    saving: 'Saving draft…',
    restored: 'Previous draft restored',
    failed: 'Draft not saved; current content remains on this page',
    invalid: 'Unsafe draft isolated; a clean draft was created',
    unavailable: 'Local storage is unavailable in this container',
    score: 'Overall score',
    unrated: 'Rate at least one positive item to calculate',
    work: 'Work details',
    title: 'Title',
    artist: 'Artist',
    album: 'Album',
    year: 'Release year',
    cover: 'Local cover (offline compressed preview; not stored in draft)',
    coverProcessing: 'Compressing the cover offline…',
    coverReady: 'Cover compressed',
    coverInvalid: 'Choose a PNG, JPEG, or WebP image',
    coverTooLarge: 'Source exceeds 20 MiB and was not loaded to protect memory',
    coverFailed: 'This image could not be decoded or compressed; choose another image',
    clearCover: 'Remove cover',
    mode: 'Rating mode',
    simple: 'Simple',
    professional: 'Professional',
    custom: 'Custom',
    dimensions: 'Positive items',
    addPositive: 'Add positive item',
    newPositive: 'New positive item',
    removePositive: 'Remove positive item',
    scoreAction: 'Rate',
    deductAction: 'Deduct',
    points: 'points',
    reason: 'Reason (optional)',
    unratedAxis: 'Unrated; excluded from the overall score',
    negative: 'Deductions',
    addNegative: 'Add deduction',
    remove: 'Remove',
    negativeName: 'Deduction name',
    overall: 'Overall comment',
    story: 'Personal story',
    exportTitle: 'Rating-card preview, album, and posting',
    exportHelp:
      'Preview, album save, and posting confirmation use the same production PNG. Switch ratios before confirming the exact text and image.',
    generate: 'Generate rating-card PNG',
    saveAlbum: 'Save rating card to album',
    bridgeReady: 'JSBridge available',
    bridgeMissing: 'JSBridge unavailable; offline editing and preview still work',
    previewReady: 'Rating-card PNG generated',
    albumSaving: 'Requesting save…',
    albumSaved: 'Saved to system album',
    albumCancelled: 'Save cancelled',
    albumFailed: 'Save failed; draft retained for retry',
    preview: 'Rating-card PNG preview',
    preparePost: 'Post to Xiaohongshu',
    postRequiresPreview: 'Generate the rating-card PNG before opening posting confirmation.',
    postBridgeMissing:
      'Post publishing is unavailable in this client; PNG generation and album save still work.',
    postConfirmation: 'Posting confirmation',
    postHelp:
      'Confirm the exact text and image to submit. You still make the final public-post decision in Xiaohongshu’s native screen.',
    postTitle: 'Post title',
    postContent: 'Post body',
    postTags: 'Tags (optional)',
    postTitleCount: 'Title character count: ',
    postContentCount: 'Body character count: ',
    postImage: 'Rating card to submit',
    postPrivacyTitle: 'Submission scope and privacy',
    postPrivacy:
      'Editing on this screen remains local. Only after “Continue to Xiaohongshu” will the title, body, tags, and rating-card image shown below be handed to Xiaohongshu. This tool does not complete the final public post for you.',
    postBack: 'Back to editing (keep confirmation)',
    postSubmit: 'Continue to Xiaohongshu',
    postConfirming: 'Review the content before continuing',
    postRestored: 'Previous unfinished posting confirmation restored',
    postPersisting: 'Saving the draft and pending post…',
    postSubmitting: 'Entering Xiaohongshu’s posting flow…',
    postAccepted: 'Entered Xiaohongshu’s posting flow; you still decide whether to publish',
    postCancelled: 'Cancelled; confirmation text and rating card remain intact',
    postFailed: 'Could not enter posting; confirmation content remains available for retry',
    postStorageFailed: 'Draft or pending post could not be saved; posting was not opened',
    postInvalid: 'Pending post is invalid; regenerate the rating card',
    postTruncated: 'Prefilled text was shortened to platform limits. Review it before continuing.',
    footer:
      'Edits stay in this container cache and may be cleared. The tool makes no network requests. Album save submits only the PNG; final posting confirmation hands the shown text and PNG to Xiaohongshu.',
    templates: 'Content templates',
    templateHelp:
      'Templates stay in this MiniTool cache and may be renamed or deleted. System cleanup can remove them. Covers are never stored.',
    templateName: 'New template name',
    templatePlaceholder: 'Enter 1–40 characters',
    saveTemplate: 'Save current content as template',
    applyTemplate: 'Apply',
    renameTemplate: 'Rename',
    deleteTemplate: 'Delete',
    emptyTemplates: 'No content templates.',
    templateSeeded:
      'The startup template was created. 海棠仙 can be renamed or deleted like any template.',
    templateSaved: 'Content template saved',
    templateRenamed: 'Template renamed',
    templateDeleted: 'Template deleted and will not be restored automatically',
    templateApplied: 'Template applied; current editor content replaced',
    templateInvalidName: 'Template names must contain 1–40 characters',
    templateDuplicate: 'A template with this name already exists',
    templateLimit: 'Up to 20 content templates may be saved',
    templateTooLarge: 'Template catalog exceeds 512 KiB and was not saved',
    templateFailed: 'Template not saved; the previous catalog and current content are unchanged',
    templateCatalogInvalid:
      'Damaged template catalog isolated; it will not be rebuilt automatically',
    templateStorageUnavailable: 'Template storage is unavailable in this container',
    confirmApply: 'Applying this template replaces the current editor content. Continue?',
    confirmReplace: 'A template with this name exists. Replace it with the current content?',
    confirmDelete:
      'This template cannot be restored from the local catalog after deletion. Continue?',
  },
} as const;

let cachedInitialState: InitialState | null = null;

function initialState(): InitialState {
  if (cachedInitialState) return cachedInitialState;
  try {
    const initialized = initializeMiniTool(window.localStorage);
    const pendingPost = loadPendingPostDraft(window.localStorage);
    cachedInitialState = {
      ...initialized,
      pendingPost: pendingPost.status === 'restored' ? pendingPost.draft : null,
      pendingPostState:
        pendingPost.status === 'restored'
          ? 'restored'
          : pendingPost.status === 'invalid'
            ? 'invalid'
            : 'idle',
    };
  } catch {
    cachedInitialState = {
      locale: 'zh-CN',
      rating: initializeMiniTool({ getItem: () => null, setItem: () => undefined }).rating,
      saveState: 'unavailable',
      templateCatalog: { version: 1, templates: [] },
      templateNotice: 'unavailable',
      pendingPost: null,
      pendingPostState: 'idle',
    };
  }
  return cachedInitialState;
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const text = value.trim();
  if (!text) return y;
  let line = '';
  let lineCount = 0;
  for (const character of text) {
    const candidate = line + character;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y);
      y += lineHeight;
      lineCount += 1;
      line = character;
      if (lineCount >= maxLines) return y;
    } else {
      line = candidate;
    }
  }
  if (line && lineCount < maxLines) {
    context.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function roundedPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const radius = Math.min(24, Math.max(8, Math.min(width, height) * 0.04));
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  context.fill();
  context.stroke();
}

function fitCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let fitted = text;
  while (fitted && context.measureText(`${fitted}…`).width > maxWidth) {
    fitted = fitted.slice(0, -1);
  }
  return fitted ? `${fitted}…` : '…';
}

async function createRatingCardPng(
  rating: MusicRatingDraft,
  score: number | null,
  ratio: CardRatio,
  coverUrl: string | null,
): Promise<string> {
  const config = getRatioConfig(ratio);
  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  const margin = Math.round(Math.min(config.width * 0.06, config.height * 0.07));
  const gap = Math.round(Math.min(config.width * 0.035, config.height * 0.04));
  const isLandscape = config.family === 'landscape';
  const gradient = context.createLinearGradient(0, 0, config.width, config.height);
  gradient.addColorStop(0, '#eef2ff');
  gradient.addColorStop(0.58, '#ffffff');
  gradient.addColorStop(1, '#ccfbf1');
  context.fillStyle = gradient;
  context.fillRect(0, 0, config.width, config.height);

  context.fillStyle = '#4f46e5';
  context.font = `700 ${Math.max(18, Math.round(config.width * 0.028))}px Segoe UI, Microsoft YaHei, sans-serif`;
  context.fillText('XDRATE MUSIC · RATING CARD', margin, margin + 8);
  context.fillStyle = '#0f172a';
  context.font = `700 ${Math.max(30, Math.round(config.width * 0.065))}px Microsoft YaHei, sans-serif`;
  wrapCanvasText(
    context,
    rating.work.title.trim() || '未命名作品',
    margin,
    margin + 82,
    config.width - margin * 2,
    Math.round(config.width * 0.08),
    2,
  );
  context.fillStyle = '#475569';
  context.font = `500 ${Math.max(16, Math.round(config.width * 0.024))}px Microsoft YaHei, sans-serif`;
  const formatMetadata = (label: string | null, value: string, defaults: string[]) => {
    const normalizedLabel = label?.trim() ?? '';
    const normalizedValue = value.trim();
    return normalizedLabel && !defaults.includes(normalizedLabel)
      ? `${normalizedLabel}：${normalizedValue}`
      : normalizedValue;
  };
  const metadata = [
    rating.work.artist.trim()
      ? formatMetadata(rating.work.artistLabel, rating.work.artist, ['艺术家', 'Artist'])
      : '',
    rating.work.album.trim()
      ? formatMetadata(rating.work.albumLabel, rating.work.album, ['专辑', 'Album'])
      : '',
    ...rating.work.extraFields
      .filter((field) => field.value.trim())
      .map((field) => formatMetadata(field.label, field.value, [])),
    rating.work.releaseYear.trim(),
  ]
    .filter(Boolean)
    .join(' · ');
  context.fillText(
    fitCanvasText(context, metadata, config.width - margin * 2),
    margin,
    margin + 122,
  );

  const bodyTop = margin + 145;
  const bodyWidth = config.width - margin * 2;
  const leftWidth = Math.round((bodyWidth - gap) * 0.39);
  const rightWidth = bodyWidth - leftWidth - gap;
  const scoreHeight = Math.min(230, Math.max(210, Math.round(config.height * 0.26)));
  const chartHeight = Math.round(
    config.height *
      (config.family === 'landscape' ? 0.35 : config.family === 'portrait' ? 0.32 : 0.38),
  );
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#dbe4f0';
  context.lineWidth = Math.max(1, Math.round(config.width * 0.002));
  roundedPanel(context, margin, bodyTop, leftWidth, scoreHeight);
  context.fillStyle = '#475569';
  context.font = `700 ${Math.max(16, Math.round(config.width * 0.022))}px Microsoft YaHei, sans-serif`;
  context.fillText('综合分', margin + 24, bodyTop + 42);
  const scoreText = score === null ? '—' : score.toFixed(1);
  const scoreX = margin + 24;
  const scoreBaseline = bodyTop + 130;
  const suffixFontSize = Math.max(16, Math.round(config.width * 0.024));
  let scoreFontSize = Math.max(52, Math.round(config.width * 0.105));
  context.font = `600 ${suffixFontSize}px Segoe UI, sans-serif`;
  const suffixWidth = context.measureText('/ 100').width;
  context.font = `700 ${scoreFontSize}px Segoe UI, sans-serif`;
  while (
    scoreFontSize > 38 &&
    context.measureText(scoreText).width + suffixWidth + 10 > leftWidth - 48
  ) {
    scoreFontSize -= 2;
    context.font = `700 ${scoreFontSize}px Segoe UI, sans-serif`;
  }
  const scoreWidth = context.measureText(scoreText).width;
  context.fillStyle = '#0f172a';
  context.fillText(scoreText, scoreX, scoreBaseline);
  context.fillStyle = '#475569';
  context.font = `600 ${suffixFontSize}px Segoe UI, sans-serif`;
  context.fillText('/ 100', scoreX + scoreWidth + 10, scoreBaseline);
  context.strokeStyle = '#e2e8f0';
  context.beginPath();
  context.moveTo(margin + 24, bodyTop + 150);
  context.lineTo(margin + leftWidth - 24, bodyTop + 150);
  context.stroke();
  context.fillStyle = '#64748b';
  context.font = `500 ${Math.max(14, Math.round(config.width * 0.019))}px Microsoft YaHei, sans-serif`;
  context.fillText(
    `模式：${rating.mode === 'simple' ? '简易模式' : rating.mode === 'professional' ? '专业模式' : '自定义模式'}`,
    margin + 24,
    bodyTop + 184,
  );

  const chartX = margin + leftWidth + gap;
  const chartY = bodyTop;
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#dbe4f0';
  roundedPanel(context, chartX, chartY, rightWidth, chartHeight);
  context.fillStyle = '#0f172a';
  context.font = `700 ${Math.max(16, Math.round(config.width * 0.022))}px Microsoft YaHei, sans-serif`;
  context.fillText('多维评分雷达图', chartX + 24, chartY + 42);
  const axes = rating.axes.filter(isRatedAxis).slice(0, 12);
  const legendColumns = isLandscape
    ? Math.min(3, Math.max(1, axes.length))
    : axes.length > 6
      ? 2
      : 1;
  const legendRows = Math.max(1, Math.ceil(axes.length / legendColumns));
  const legendRowHeight = Math.max(24, Math.round(config.width * 0.025));
  const legendHeight = legendRows * legendRowHeight + 18;
  const chartPlotTop = chartY + 54;
  const chartPlotHeight = Math.max(100, chartHeight - legendHeight - 62);
  const centerX = chartX + rightWidth / 2;
  const centerY = chartPlotTop + chartPlotHeight / 2;
  const radius = Math.max(42, Math.min(rightWidth * 0.34, chartPlotHeight * 0.44));
  const count = Math.max(3, axes.length);
  const points = (scale: number) =>
    axes.map((_, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
      return {
        x: centerX + Math.cos(angle) * radius * scale,
        y: centerY + Math.sin(angle) * radius * scale,
      };
    });
  context.strokeStyle = '#cbd5e1';
  context.lineWidth = 2;
  for (const scale of [1, 0.66, 0.33]) {
    const ring = points(scale);
    context.beginPath();
    ring.forEach((point, index) =>
      index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y),
    );
    context.closePath();
    context.stroke();
  }
  axes.forEach((_, index) => {
    const spoke = points(1)[index];
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(spoke.x, spoke.y);
    context.stroke();
  });
  if (axes.length >= 3) {
    const polygon = axes.map((axis, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
      const scale = Math.max(0, Math.min(1, axis.score / 10));
      return {
        x: centerX + Math.cos(angle) * radius * scale,
        y: centerY + Math.sin(angle) * radius * scale,
      };
    });
    context.fillStyle = 'rgba(99, 102, 241, 0.35)';
    context.strokeStyle = '#6366f1';
    context.lineWidth = Math.max(2, Math.round(config.width * 0.003));
    context.beginPath();
    polygon.forEach((point, index) =>
      index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y),
    );
    context.closePath();
    context.fill();
    context.stroke();
  }
  const legendTop = chartY + chartHeight - legendHeight + 10;
  const legendColumnWidth = (rightWidth - 48) / legendColumns;
  context.font = `500 ${Math.max(13, Math.round(config.width * 0.018))}px Microsoft YaHei, sans-serif`;
  axes.forEach((axis, index) => {
    const column = Math.floor(index / legendRows);
    const row = index % legendRows;
    const x = chartX + 24 + column * legendColumnWidth;
    const y = legendTop + row * legendRowHeight;
    context.fillStyle = '#eef2f7';
    context.fillRect(x, y - 18, legendColumnWidth - 8, legendRowHeight - 4);
    context.fillStyle = '#4f46e5';
    context.beginPath();
    context.arc(x + 10, y - 7, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#475569';
    const scoreText = `${axis.score.toFixed(1)}/10`;
    const scoreWidth = context.measureText(scoreText).width;
    context.fillText(
      fitCanvasText(context, axis.name, legendColumnWidth - scoreWidth - 38),
      x + 22,
      y,
    );
    context.fillStyle = '#4f46e5';
    context.fillText(scoreText, x + legendColumnWidth - scoreWidth - 8, y);
  });

  const hasNarrative = Boolean(rating.overallComment.trim() || rating.personalStory.trim());
  const reasonsX = margin;
  const reasonsTop = bodyTop + Math.max(scoreHeight, chartHeight) + gap;
  const reasonsWidth = bodyWidth;
  const narrativeReserve = !isLandscape && hasNarrative ? 100 : 0;
  const maxReasonsHeight = Math.max(96, config.height - reasonsTop - margin - narrativeReserve);
  const reasonFont = Math.max(14, Math.round(config.width * 0.018));
  const landscapeNarrativeHeight = isLandscape && hasNarrative ? 44 : 0;
  const reasonRowTarget = axes.some((axis) => axis.reason.trim())
    ? Math.max(48, reasonFont * 2 + 14)
    : Math.max(30, reasonFont + 12);
  const reasonFixedHeight = 66 + landscapeNarrativeHeight;
  const maxReasonColumns = reasonsWidth >= 900 ? 3 : reasonsWidth >= 560 ? 2 : 1;
  let reasonColumns = Math.min(maxReasonColumns, Math.max(1, axes.length));
  for (let columns = 1; columns <= reasonColumns; columns += 1) {
    const rows = Math.max(1, Math.ceil(axes.length / columns));
    if (reasonFixedHeight + rows * reasonRowTarget <= maxReasonsHeight) {
      reasonColumns = columns;
      break;
    }
  }
  const reasonRows = Math.max(1, Math.ceil(axes.length / reasonColumns));
  const reasonsHeight = Math.min(
    maxReasonsHeight,
    Math.max(96, reasonFixedHeight + reasonRows * reasonRowTarget),
  );
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#dbe4f0';
  roundedPanel(context, reasonsX, reasonsTop, reasonsWidth, reasonsHeight);
  context.fillStyle = '#0f172a';
  context.font = `700 ${Math.max(16, Math.round(config.width * 0.022))}px Microsoft YaHei, sans-serif`;
  context.fillText('分项理由', reasonsX + 24, reasonsTop + 38);
  context.font = `700 ${reasonFont}px Microsoft YaHei, sans-serif`;
  let reasonY = reasonsTop + 68;
  const reasonColumnWidth = (reasonsWidth - 48) / reasonColumns;
  const reasonRowHeight = Math.max(
    28,
    Math.floor((reasonsHeight - reasonFixedHeight) / reasonRows),
  );
  axes.forEach((axis, index) => {
    const column = Math.floor(index / reasonRows);
    const row = index % reasonRows;
    const reasonX = reasonsX + 24 + column * reasonColumnWidth;
    reasonY = reasonsTop + 68 + row * reasonRowHeight;
    context.fillStyle = '#0f172a';
    context.fillText(fitCanvasText(context, axis.name, reasonColumnWidth - 82), reasonX, reasonY);
    context.fillStyle = '#475569';
    context.font = `500 ${reasonFont}px Microsoft YaHei, sans-serif`;
    const reasonScore = `${axis.score.toFixed(1)}/10`;
    const reasonScoreWidth = context.measureText(reasonScore).width;
    context.fillText(reasonScore, reasonX + reasonColumnWidth - reasonScoreWidth - 8, reasonY);
    if (axis.reason.trim() && reasonRowHeight >= reasonFont * 2 + 8) {
      wrapCanvasText(
        context,
        axis.reason,
        reasonX,
        reasonY + 24,
        reasonColumnWidth - 12,
        reasonFont + 8,
        1,
      );
    }
    context.font = `700 ${reasonFont}px Microsoft YaHei, sans-serif`;
  });
  const narrative = [rating.overallComment.trim(), rating.personalStory.trim()]
    .filter(Boolean)
    .join(' · ');
  if (narrative && isLandscape) {
    context.strokeStyle = '#e2e8f0';
    context.beginPath();
    context.moveTo(reasonsX + 24, reasonsTop + reasonsHeight - 48);
    context.lineTo(reasonsX + reasonsWidth - 24, reasonsTop + reasonsHeight - 48);
    context.stroke();
    context.fillStyle = '#475569';
    context.font = `500 ${reasonFont}px Microsoft YaHei, sans-serif`;
    context.fillText(
      fitCanvasText(context, narrative, reasonsWidth - 48),
      reasonsX + 24,
      reasonsTop + reasonsHeight - 18,
    );
  }
  if (narrative && !isLandscape) {
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#dbe4f0';
    const storyX = margin;
    const storyWidth = bodyWidth;
    const storyY = reasonsTop + reasonsHeight + gap;
    const storyHeight = Math.min(92, config.height - storyY - margin);
    if (storyHeight > 40) {
      roundedPanel(context, storyX, storyY, storyWidth, storyHeight);
      context.fillStyle = '#475569';
      context.font = `500 ${reasonFont}px Microsoft YaHei, sans-serif`;
      const narrativeLineHeight = reasonFont + 8;
      wrapCanvasText(
        context,
        narrative,
        storyX + 24,
        storyY + 30,
        storyWidth - 48,
        narrativeLineHeight,
        Math.max(1, Math.floor((storyHeight - 24) / narrativeLineHeight)),
      );
    }
  }
  context.fillStyle = '#64748b';
  context.font = `500 ${Math.max(12, Math.round(config.width * 0.016))}px Segoe UI, sans-serif`;
  context.fillText(
    'XDRATE MUSIC · music-linear-100-v4 · local Canvas',
    margin,
    config.height - margin / 2,
  );
  if (coverUrl) {
    await new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const size = Math.min(140, Math.round(config.width * 0.14));
        context.save();
        context.beginPath();
        context.arc(config.width - margin - size / 2, margin + size / 2, size / 2, 0, Math.PI * 2);
        context.clip();
        context.drawImage(image, config.width - margin - size, margin, size, size);
        context.restore();
        resolve();
      };
      image.onerror = () => resolve();
      image.src = coverUrl;
    });
  }
  return canvas.toDataURL('image/png');
}

function StarButtons({
  axis,
  onChange,
  label,
  scoreAction,
}: {
  axis: RatingAxis;
  onChange: (score: number) => void;
  label: string;
  scoreAction: string;
}) {
  return (
    <div className="rating-buttons" role="group" aria-label={`${axis.name}: ${label}`}>
      {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
        <button
          key={score}
          type="button"
          className={score <= axis.score ? 'rating-button selected' : 'rating-button'}
          aria-label={`${axis.name} ${scoreAction} ${score}`}
          aria-pressed={score === axis.score}
          onClick={() => onChange(score)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function BananaButtons({
  item,
  onChange,
  deductAction,
  points,
}: {
  item: NegativeItem;
  onChange: (score: number) => void;
  deductAction: string;
  points: string;
}) {
  const selected = Math.abs(item.score);
  return (
    <div className="rating-buttons banana-buttons" role="group" aria-label={item.name}>
      {Array.from({ length: 5 }, (_, index) => index + 1).map((score) => (
        <button
          key={score}
          type="button"
          className={score <= selected ? 'rating-button banana selected' : 'rating-button banana'}
          aria-label={`${item.name} ${deductAction} ${score} ${points}`}
          aria-pressed={score === selected}
          onClick={() => onChange(-score)}
        >
          🍌
        </button>
      ))}
    </div>
  );
}

function TemplateRow({
  template,
  inputLabel,
  applyLabel,
  renameLabel,
  deleteLabel,
  onApply,
  onRename,
  onDelete,
}: {
  template: MiniToolContentTemplate;
  inputLabel: string;
  applyLabel: string;
  renameLabel: string;
  deleteLabel: string;
  onApply: (template: MiniToolContentTemplate) => void;
  onRename: (template: MiniToolContentTemplate, name: string) => void;
  onDelete: (template: MiniToolContentTemplate) => void;
}) {
  const [name, setName] = useState(template.name);

  return (
    <article className="template-row" data-template-id={template.id}>
      <input
        aria-label={`${inputLabel}: ${template.name}`}
        value={name}
        maxLength={40}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="template-actions">
        <button type="button" className="primary" onClick={() => onApply(template)}>
          {applyLabel}
        </button>
        <button type="button" onClick={() => onRename(template, name)}>
          {renameLabel}
        </button>
        <button type="button" className="danger" onClick={() => onDelete(template)}>
          {deleteLabel}
        </button>
      </div>
    </article>
  );
}

export function MiniToolApp() {
  const [initial] = useState(initialState);
  const [locale, setLocale] = useState<MiniToolLocale>(initial.locale);
  const [rating, setRating] = useState<MusicRatingDraft>(initial.rating);
  const [saveState, setSaveState] = useState<SaveState>(initial.saveState);
  const [templateCatalog, setTemplateCatalog] = useState(initial.templateCatalog);
  const [templateNotice, setTemplateNotice] = useState<TemplateNotice>(initial.templateNotice);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [albumState, setAlbumState] = useState<AlbumState>('idle');
  const [postDraft, setPostDraft] = useState<PostNoteDraft | null>(initial.pendingPost);
  const [postState, setPostState] = useState<PostState>(initial.pendingPostState);
  const [postTruncation, setPostTruncation] = useState<PostNoteTruncation>({
    title: false,
    content: false,
  });
  const [preview, setPreview] = useState<string | null>(
    initial.pendingPost?.imageDataUris[0] ?? null,
  );
  const [ratio, setRatio] = useState<CardRatio>('4:5');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverState, setCoverState] = useState<CoverState>('idle');
  const [coverInfo, setCoverInfo] = useState<CompressedCover | null>(null);
  const coverRequest = useRef(0);
  const postPanel = useRef<HTMLElement | null>(null);
  const postTitleInput = useRef<HTMLInputElement | null>(null);
  const postSubmitButton = useRef<HTMLButtonElement | null>(null);
  const viewportBaseline = useRef({ width: window.innerWidth, height: window.innerHeight });
  const t = copy[locale];
  const result = useMemo(() => calculateRating(rating), [rating]);
  const score = result.status === 'ready' ? result.score100 : null;
  const platform = useMemo(() => createMiniToolPlatformServices(window), []);
  const postBridgeAvailable = platform.isPostNoteBridgeAvailable();

  useEffect(() => {
    const savingTimer = window.setTimeout(() => setSaveState('saving'), 0);
    const saveTimer = window.setTimeout(() => {
      const saved = saveMiniToolWorkspace(window.localStorage, {
        locale,
        rating: { ...rating, work: { ...rating.work, coverDataUrl: null } },
      });
      setSaveState(saved ? 'saved' : 'failed');
    }, 300);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(saveTimer);
    };
  }, [locale, rating]);

  useEffect(() => {
    const flushDraft = () => {
      saveMiniToolWorkspace(window.localStorage, {
        locale,
        rating: cloneRatingWithoutCover(rating),
      });
    };
    const flushHiddenDraft = () => {
      if (document.visibilityState === 'hidden') flushDraft();
    };
    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', flushHiddenDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', flushHiddenDraft);
    };
  }, [locale, rating]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateHeight = () => {
      const width = window.innerWidth;
      if (Math.abs(width - viewportBaseline.current.width) >= 80) {
        viewportBaseline.current = { width, height: window.innerHeight };
      } else {
        viewportBaseline.current.height = Math.max(
          viewportBaseline.current.height,
          window.innerHeight,
        );
      }
      const metrics = calculateViewportMetrics(
        viewportBaseline.current.height,
        viewport ? viewport.height : window.innerHeight,
      );
      document.documentElement.style.setProperty('--app-height', `${metrics.visibleHeight}px`);
      document.documentElement.style.setProperty(
        '--keyboard-offset',
        `${metrics.keyboardOffset}px`,
      );
      document.documentElement.classList.toggle('keyboard-open', metrics.keyboardOpen);
    };
    let focusTimer = 0;
    const keepFocusedControlVisible = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('input, textarea, select')) return;
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        try {
          target.scrollIntoView({ block: 'center', behavior: 'auto' });
        } catch {
          target.scrollIntoView(false);
        }
      }, 180);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    document.addEventListener('focusin', keepFocusedControlVisible);
    if (viewport) viewport.addEventListener('resize', updateHeight);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('resize', updateHeight);
      document.removeEventListener('focusin', keepFocusedControlVisible);
      if (viewport) viewport.removeEventListener('resize', updateHeight);
      document.documentElement.classList.remove('keyboard-open');
    };
  }, []);
  useEffect(
    () => () => {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    },
    [coverUrl],
  );

  const updateWork = (key: 'title' | 'artist' | 'album' | 'releaseYear', value: string) =>
    setRating((current) => ({ ...current, work: { ...current.work, [key]: value } }));
  const updateAxis = (id: string, patch: Partial<RatingAxis>) =>
    setRating((current) => ({
      ...current,
      axes: current.axes.map((axis) => (axis.id === id ? { ...axis, ...patch } : axis)),
    }));
  const updateNegative = (id: string, patch: Partial<NegativeItem>) =>
    setRating((current) => ({
      ...current,
      negativeItems: current.negativeItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  const changeMode = (mode: 'simple' | 'professional' | 'custom') =>
    setRating((current) =>
      mode === 'custom'
        ? { ...current, mode }
        : { ...current, mode, axes: createDefaultAxes(mode) },
    );
  const addPositive = () =>
    setRating((current) =>
      current.axes.length >= 12
        ? current
        : {
            ...current,
            mode: 'custom',
            axes: [...current.axes, createRatingAxis(t.newPositive)],
          },
    );
  const removePositive = (id: string) =>
    setRating((current) =>
      current.axes.length <= 1
        ? current
        : {
            ...current,
            mode: 'custom',
            axes: current.axes.filter((axis) => axis.id !== id),
          },
    );
  const selectCover = async (file: File | undefined) => {
    const request = coverRequest.current + 1;
    coverRequest.current = request;
    setCoverUrl(null);
    setCoverInfo(null);
    if (!file) {
      setCoverState('idle');
      return;
    }
    setCoverState('processing');
    const result = await compressCoverImage(file);
    if (request !== coverRequest.current) return;
    if (result.status !== 'ready') {
      setCoverState(result.status);
      return;
    }
    setCoverInfo(result.cover);
    setCoverUrl(URL.createObjectURL(result.cover.blob));
    setCoverState('ready');
  };
  const clearCover = () => {
    coverRequest.current += 1;
    setCoverUrl(null);
    setCoverInfo(null);
    setCoverState('idle');
  };
  const setCatalogSaveFailure = (result: ContentTemplateCatalogSaveResult) => {
    setTemplateNotice(
      result === 'too-large' ? 'too-large' : result === 'unavailable' ? 'unavailable' : 'failed',
    );
  };
  const persistTemplateCatalog = (
    nextCatalog: MiniToolContentTemplateCatalog,
    successNotice: TemplateNotice,
  ): boolean => {
    const saved = saveContentTemplateCatalog(window.localStorage, nextCatalog);
    if (saved !== 'saved') {
      setCatalogSaveFailure(saved);
      return false;
    }
    setTemplateCatalog(nextCatalog);
    setTemplateNotice(successNotice);
    return true;
  };
  const saveCurrentTemplate = () => {
    const name = normalizeContentTemplateName(newTemplateName);
    if (name.length < 1 || name.length > 40) {
      setTemplateNotice('invalid-name');
      return;
    }
    const existing = findContentTemplateByName(templateCatalog, name);
    if (existing && !window.confirm(t.confirmReplace)) return;
    if (!existing && templateCatalog.templates.length >= MINI_TOOL_CONTENT_TEMPLATE_LIMIT) {
      setTemplateNotice('limit');
      return;
    }
    const now = new Date().toISOString();
    const template = createContentTemplate(
      existing ? existing.id : createContentTemplateId(),
      name,
      rating,
      now,
      existing ? existing.createdAt : now,
    );
    if (!template) {
      setTemplateNotice('invalid-name');
      return;
    }
    if (persistTemplateCatalog(putContentTemplate(templateCatalog, template), 'saved')) {
      setNewTemplateName('');
    }
  };
  const applyTemplate = (template: MiniToolContentTemplate) => {
    if (!window.confirm(t.confirmApply)) return;
    clearCover();
    setRating(cloneRatingWithoutCover(template.rating));
    setTemplateNotice('applied');
  };
  const renameTemplate = (template: MiniToolContentTemplate, rawName: string) => {
    const name = normalizeContentTemplateName(rawName);
    if (name.length < 1 || name.length > 40) {
      setTemplateNotice('invalid-name');
      return;
    }
    if (findContentTemplateByName(templateCatalog, name, template.id)) {
      setTemplateNotice('duplicate');
      return;
    }
    const renamed = createContentTemplate(
      template.id,
      name,
      template.rating,
      new Date().toISOString(),
      template.createdAt,
    );
    if (!renamed) {
      setTemplateNotice('invalid-name');
      return;
    }
    persistTemplateCatalog(putContentTemplate(templateCatalog, renamed), 'renamed');
  };
  const deleteTemplate = (template: MiniToolContentTemplate) => {
    if (!window.confirm(t.confirmDelete)) return;
    persistTemplateCatalog(removeContentTemplate(templateCatalog, template.id), 'deleted');
  };
  const generatePreview = async () => {
    try {
      setPreview(await createRatingCardPng(rating, score, ratio, coverUrl));
      setAlbumState('preview-ready');
    } catch {
      setAlbumState('failed');
    }
  };
  const changeRatio = (nextRatio: CardRatio) => {
    setRatio(nextRatio);
    setPreview(null);
    setAlbumState('idle');
  };
  const saveAlbum = async () => {
    setAlbumState('saving');
    try {
      const image = preview || (await createRatingCardPng(rating, score, ratio, coverUrl));
      if (!preview) setPreview(image);
      const saved = await platform.savePngToAlbum(image);
      setAlbumState(
        saved.status === 'success'
          ? 'saved'
          : saved.status === 'cancelled'
            ? 'cancelled'
            : 'failed',
      );
    } catch {
      setAlbumState('failed');
    }
  };
  const openPostConfirmation = () => {
    if (!preview || !postBridgeAvailable) return;
    const content = [rating.overallComment.trim(), rating.personalStory.trim()]
      .filter((value) => value.length > 0)
      .join('\n\n');
    const built = buildPostNotePayload({
      title: rating.work.title,
      content,
      imageDataUris: [preview],
    });
    if (!built.ok) {
      setPostState('invalid');
      return;
    }

    setPostDraft({
      ...(built.payload.title === undefined ? {} : { title: built.payload.title }),
      ...(built.payload.content === undefined ? {} : { content: built.payload.content }),
      ...(built.payload.tags === undefined ? {} : { tags: built.payload.tags }),
      imageDataUris: built.payload.mediaInfo.image_resources.map((resource) => resource.url),
    });
    setPostTruncation(built.truncation);
    setPostState('confirming');
    window.setTimeout(() => {
      postPanel.current?.scrollIntoView(false);
      postTitleInput.current?.focus();
    }, 0);
  };
  const updatePostText = (field: 'title' | 'content' | 'tags', value: string) => {
    if (!postDraft) return;
    const limit =
      field === 'title'
        ? POST_NOTE_LIMITS.titleCharacters
        : field === 'content'
          ? POST_NOTE_LIMITS.contentCharacters
          : null;
    const limited = limit === null ? value : limitPostNoteText(value, limit);
    if (field === 'title' || field === 'content') {
      setPostTruncation((current) => ({
        ...current,
        [field]: limit !== null && countPostNoteCharacters(value) > limit,
      }));
    }
    setPostDraft((current) => (current ? { ...current, [field]: limited } : current));
    if (postState !== 'submitting' && postState !== 'persisting') setPostState('confirming');
  };
  const submitPost = async () => {
    if (!postDraft || !postBridgeAvailable) return;
    const built = buildPostNotePayload(postDraft);
    if (!built.ok) {
      setPostState('invalid');
      return;
    }

    setPostState('persisting');
    const workspaceSaved = saveMiniToolWorkspace(window.localStorage, {
      locale,
      rating: cloneRatingWithoutCover(rating),
    });
    const pendingSaved = savePendingPostDraft(window.localStorage, postDraft);
    setSaveState(workspaceSaved ? 'saved' : 'failed');
    if (!workspaceSaved || pendingSaved !== 'saved') {
      setPostState('storage-failed');
      return;
    }

    setPostState('submitting');
    const submitted = await platform.submitPostNote(built.payload);
    const nextState =
      submitted.status === 'accepted'
        ? 'accepted'
        : submitted.status === 'cancelled'
          ? 'cancelled'
          : 'failed';
    setPostState(nextState);
    if (nextState === 'cancelled' || nextState === 'failed') {
      window.setTimeout(() => postSubmitButton.current?.focus(), 0);
    }
  };
  const albumText =
    albumState === 'idle'
      ? platform.isAlbumBridgeAvailable()
        ? t.bridgeReady
        : t.bridgeMissing
      : albumState === 'preview-ready'
        ? t.previewReady
        : albumState === 'saving'
          ? t.albumSaving
          : albumState === 'saved'
            ? t.albumSaved
            : albumState === 'cancelled'
              ? t.albumCancelled
              : t.albumFailed;
  const postText =
    postState === 'restored'
      ? t.postRestored
      : postState === 'persisting'
        ? t.postPersisting
        : postState === 'submitting'
          ? t.postSubmitting
          : postState === 'accepted'
            ? t.postAccepted
            : postState === 'cancelled'
              ? t.postCancelled
              : postState === 'failed'
                ? t.postFailed
                : postState === 'storage-failed'
                  ? t.postStorageFailed
                  : postState === 'invalid'
                    ? t.postInvalid
                    : t.postConfirming;
  const templateText =
    templateNotice === 'seeded'
      ? t.templateSeeded
      : templateNotice === 'saved'
        ? t.templateSaved
        : templateNotice === 'renamed'
          ? t.templateRenamed
          : templateNotice === 'deleted'
            ? t.templateDeleted
            : templateNotice === 'applied'
              ? t.templateApplied
              : templateNotice === 'invalid-name'
                ? t.templateInvalidName
                : templateNotice === 'duplicate'
                  ? t.templateDuplicate
                  : templateNotice === 'limit'
                    ? t.templateLimit
                    : templateNotice === 'too-large'
                      ? t.templateTooLarge
                      : templateNotice === 'invalid-catalog'
                        ? t.templateCatalogInvalid
                        : templateNotice === 'unavailable'
                          ? t.templateStorageUnavailable
                          : templateNotice === 'failed'
                            ? t.templateFailed
                            : '';

  return (
    <main className="app-shell" data-testid="minitool-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">XDRATE MUSIC · MINI TOOL v0.3.1</p>
          <h1>{t.product}</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>
        <label className="language-field">
          <span>{t.language}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as MiniToolLocale)}
          >
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </label>
      </header>
      <div className="save-status" role="status" aria-live="polite">
        {t[saveState]}
      </div>
      <section className="score-panel" aria-label={t.score}>
        <div>
          <span>{t.score}</span>
          <strong data-testid="overall-score">{score === null ? '—' : score.toFixed(1)}</strong>
          <b>/ 100</b>
        </div>
        {score === null ? <p>{t.unrated}</p> : null}
      </section>
      <section className="panel" aria-labelledby="templates-title">
        <h2 id="templates-title">{t.templates}</h2>
        <p className="panel-help">{t.templateHelp}</p>
        <label className="field">
          <span>{t.templateName}</span>
          <input
            value={newTemplateName}
            maxLength={40}
            placeholder={t.templatePlaceholder}
            onChange={(event) => setNewTemplateName(event.target.value)}
          />
        </label>
        <button type="button" className="template-save-button" onClick={saveCurrentTemplate}>
          {t.saveTemplate}
        </button>
        {templateText ? (
          <div className="template-status" role="status" aria-live="polite">
            {templateText}
          </div>
        ) : null}
        <div className="template-list" data-testid="template-list">
          {templateCatalog.templates.length === 0 ? (
            <p className="empty-state">{t.emptyTemplates}</p>
          ) : (
            templateCatalog.templates.map((template) => (
              <TemplateRow
                key={`${template.id}-${template.updatedAt}`}
                template={template}
                inputLabel={t.templateName}
                applyLabel={t.applyTemplate}
                renameLabel={t.renameTemplate}
                deleteLabel={t.deleteTemplate}
                onApply={applyTemplate}
                onRename={renameTemplate}
                onDelete={deleteTemplate}
              />
            ))
          )}
        </div>
      </section>
      <section className="panel" aria-labelledby="work-title">
        <h2 id="work-title">{t.work}</h2>
        <div className="field-grid">
          <label className="field">
            <span>{t.title}</span>
            <input
              value={rating.work.title}
              maxLength={120}
              onChange={(event) => updateWork('title', event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t.artist}</span>
            <input
              value={rating.work.artist}
              maxLength={120}
              onChange={(event) => updateWork('artist', event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t.album}</span>
            <input
              value={rating.work.album}
              maxLength={120}
              onChange={(event) => updateWork('album', event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t.year}</span>
            <input
              inputMode="numeric"
              value={rating.work.releaseYear}
              maxLength={16}
              onChange={(event) => updateWork('releaseYear', event.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>{t.cover}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void selectCover(event.target.files?.[0])}
          />
        </label>
        {coverState !== 'idle' ? (
          <div className="cover-status" role="status" aria-live="polite" data-testid="cover-status">
            {coverState === 'processing'
              ? t.coverProcessing
              : coverState === 'ready' && coverInfo
                ? `${t.coverReady}：${coverInfo.width}×${coverInfo.height} · ${Math.ceil(coverInfo.outputBytes / 1024)} KiB · ${coverInfo.mimeType}`
                : coverState === 'invalid-type'
                  ? t.coverInvalid
                  : coverState === 'too-large'
                    ? t.coverTooLarge
                    : t.coverFailed}
          </div>
        ) : null}
        {coverUrl ? (
          <div className="cover-result">
            <img className="cover-preview" src={coverUrl} alt={t.cover} />
            <button type="button" className="text-button" onClick={clearCover}>
              {t.clearCover}
            </button>
          </div>
        ) : null}
      </section>
      <section className="panel" aria-labelledby="ratings-title">
        <div className="section-heading">
          <h2 id="ratings-title">{t.dimensions}</h2>
          <label className="mode-field">
            <span>{t.mode}</span>
            <select
              value={rating.mode}
              onChange={(event) =>
                changeMode(event.target.value as 'simple' | 'professional' | 'custom')
              }
            >
              <option value="simple">{t.simple}</option>
              <option value="professional">{t.professional}</option>
              <option value="custom">{t.custom}</option>
            </select>
          </label>
          <button type="button" disabled={rating.axes.length >= 12} onClick={addPositive}>
            {t.addPositive}
          </button>
        </div>
        <div className="axis-list">
          {rating.axes.map((axis) => (
            <article className="axis-card" key={axis.id}>
              <div className="axis-heading">
                <input
                  aria-label={`${t.dimensions} ${axis.name}`}
                  value={axis.name}
                  maxLength={24}
                  onChange={(event) => updateAxis(axis.id, { name: event.target.value })}
                />
                <span>{axis.score === 0 ? t.unratedAxis : `${axis.score}/10`}</span>
                <button
                  type="button"
                  className="text-button"
                  disabled={rating.axes.length <= 1}
                  aria-label={`${t.removePositive}: ${axis.name}`}
                  onClick={() => removePositive(axis.id)}
                >
                  {t.remove}
                </button>
              </div>
              <StarButtons
                axis={axis}
                label={t.dimensions}
                scoreAction={t.scoreAction}
                onChange={(value) => updateAxis(axis.id, { score: value })}
              />
              <label className="field compact">
                <span>{t.reason}</span>
                <textarea
                  value={axis.reason}
                  maxLength={500}
                  rows={2}
                  onChange={(event) => updateAxis(axis.id, { reason: event.target.value })}
                />
              </label>
            </article>
          ))}
        </div>
      </section>
      <section className="panel" aria-labelledby="negative-title">
        <div className="section-heading">
          <h2 id="negative-title">{t.negative}</h2>
          <button
            type="button"
            disabled={rating.negativeItems.length >= 5}
            onClick={() =>
              setRating((current) => ({
                ...current,
                negativeItems: [...current.negativeItems, createNegativeItem()],
              }))
            }
          >
            {t.addNegative}
          </button>
        </div>
        {rating.negativeItems.map((item) => (
          <article className="axis-card" key={item.id}>
            <div className="axis-heading">
              <input
                aria-label={t.negativeName}
                value={item.name}
                maxLength={24}
                onChange={(event) => updateNegative(item.id, { name: event.target.value })}
              />
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setRating((current) => ({
                    ...current,
                    negativeItems: current.negativeItems.filter(
                      (candidate) => candidate.id !== item.id,
                    ),
                  }))
                }
              >
                {t.remove}
              </button>
            </div>
            <BananaButtons
              item={item}
              deductAction={t.deductAction}
              points={t.points}
              onChange={(value) => updateNegative(item.id, { score: value })}
            />
          </article>
        ))}
      </section>
      <section className="panel" aria-label={t.overall}>
        <label className="field">
          <span>{t.overall}</span>
          <textarea
            rows={4}
            maxLength={2000}
            value={rating.overallComment}
            onChange={(event) =>
              setRating((current) => ({ ...current, overallComment: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>{t.story}</span>
          <textarea
            rows={4}
            maxLength={3000}
            value={rating.personalStory}
            onChange={(event) =>
              setRating((current) => ({ ...current, personalStory: event.target.value }))
            }
          />
        </label>
      </section>
      <section className="panel" aria-labelledby="export-title">
        <h2 id="export-title">{t.exportTitle}</h2>
        <p className="panel-help">{t.exportHelp}</p>
        <label className="field compact">
          <span>{t.ratio}</span>
          <select
            data-testid="card-ratio"
            aria-label={t.ratio}
            value={ratio}
            onChange={(event) => changeRatio(event.target.value as CardRatio)}
          >
            {ALL_CARD_RATIOS.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button type="button" onClick={generatePreview}>
            {t.generate}
          </button>
          <button type="button" className="primary" onClick={() => void saveAlbum()}>
            {t.saveAlbum}
          </button>
          <button
            type="button"
            disabled={!preview || !postBridgeAvailable}
            onClick={openPostConfirmation}
          >
            {t.preparePost}
          </button>
        </div>
        <div className="album-status" role="status" aria-live="polite">
          {albumText}
        </div>
        {preview ? (
          <div className="preview-block">
            <h3>{t.preview}</h3>
            <img className="png-preview" src={preview} alt={t.preview} />
          </div>
        ) : null}
      </section>
      {!postBridgeAvailable || !preview ? (
        <div className="post-availability" role="status">
          {!postBridgeAvailable ? t.postBridgeMissing : t.postRequiresPreview}
        </div>
      ) : null}
      {postDraft && postState !== 'idle' ? (
        <section
          ref={postPanel}
          className="panel post-panel"
          aria-labelledby="post-confirmation-title"
          data-testid="post-confirmation"
        >
          <h2 id="post-confirmation-title">{t.postConfirmation}</h2>
          <p className="panel-help">{t.postHelp}</p>
          <label className="field">
            <span>{t.postTitle}</span>
            <input
              ref={postTitleInput}
              value={postDraft.title ?? ''}
              aria-describedby="post-title-count"
              onChange={(event) => updatePostText('title', event.target.value)}
            />
          </label>
          <p id="post-title-count" className="character-count">
            {t.postTitleCount}
            {countPostNoteCharacters(postDraft.title ?? '')} / {POST_NOTE_LIMITS.titleCharacters}
          </p>
          <label className="field">
            <span>{t.postContent}</span>
            <textarea
              rows={6}
              value={postDraft.content ?? ''}
              aria-describedby="post-content-count"
              onChange={(event) => updatePostText('content', event.target.value)}
            />
          </label>
          <p id="post-content-count" className="character-count">
            {t.postContentCount}
            {countPostNoteCharacters(postDraft.content ?? '')} /{' '}
            {POST_NOTE_LIMITS.contentCharacters}
          </p>
          <label className="field">
            <span>{t.postTags}</span>
            <input
              value={postDraft.tags ?? ''}
              onChange={(event) => updatePostText('tags', event.target.value)}
            />
          </label>
          {postTruncation.title || postTruncation.content ? (
            <div className="post-warning" role="status">
              {t.postTruncated}
            </div>
          ) : null}
          <div className="post-image-block">
            <h3>{t.postImage}</h3>
            <img className="png-preview" src={postDraft.imageDataUris[0]} alt={t.postImage} />
          </div>
          <aside className="privacy-notice" aria-labelledby="post-privacy-title">
            <h3 id="post-privacy-title">{t.postPrivacyTitle}</h3>
            <p>{t.postPrivacy}</p>
          </aside>
          <div className="post-status" role="status" aria-live="polite">
            {postText}
          </div>
          <div className="actions post-actions">
            <button type="button" onClick={() => setPostState('idle')}>
              {t.postBack}
            </button>
            <button
              ref={postSubmitButton}
              type="button"
              className="post-primary"
              disabled={
                postState === 'persisting' ||
                postState === 'submitting' ||
                postState === 'accepted' ||
                !postBridgeAvailable
              }
              onClick={() => void submitPost()}
            >
              {t.postSubmit}
            </button>
          </div>
        </section>
      ) : null}
      <footer>
        <p>{t.footer}</p>
        <p>music-linear-100-v4 · MiniTool content template v1</p>
      </footer>
    </main>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('MiniTool root element is missing.');
createRoot(rootElement).render(
  <StrictMode>
    <MiniToolApp />
  </StrictMode>,
);
