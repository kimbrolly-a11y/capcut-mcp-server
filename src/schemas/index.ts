// Zod validation schemas for CapCut MCP tools
//
// Exports:
//   *Shape — raw ZodRawShape for passing to McpServer.registerTool's inputSchema
//   *Schema — assembled ZodObject (strict, with cross-field refinements where needed)

import { z } from 'zod';
import { ResponseFormat } from '../types.js';
import {
  TRANSITIONS,
  TEXT_ANIMATIONS,
  AVAILABLE_EFFECTS
} from '../constants.js';

// Common pieces
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

const UrlSchema = z.string()
  .url('Must be a valid URL')
  .describe('URL to the media file');

const DraftIdField = z.string().min(1, 'Draft ID is required');

// A positive-duration time window used by several tools.
const endAfterStart = <T extends { start: number; end: number }>(d: T) => d.end > d.start;
const endAfterStartMsg = { message: 'end must be greater than start', path: ['end'] };

// Create draft
export const CreateDraftShape = {
  width: z.number().int().min(360).max(4096).default(1920).describe('Video width in pixels'),
  height: z.number().int().min(360).max(4096).default(1080).describe('Video height in pixels'),
  fps: z.number().int().min(24).max(120).default(30).describe('Frames per second'),
  response_format: ResponseFormatSchema
};
export const CreateDraftSchema = z.object(CreateDraftShape).strict();

// Add video
export const AddVideoShape = {
  draft_id: DraftIdField.describe('The ID of the draft to add video to'),
  video_url: UrlSchema,
  start: z.number().min(0).describe('Start time in seconds'),
  end: z.number().positive().describe('End time in seconds'),
  volume: z.number().min(0).max(1).default(1.0).describe('Audio volume (0.0 to 1.0)'),
  transition: z.enum(TRANSITIONS as [string, ...string[]]).optional().describe('Transition effect to apply'),
  speed: z.number().min(0.1).max(10).default(1.0).describe('Playback speed multiplier'),
  response_format: ResponseFormatSchema
};
export const AddVideoSchema = z.object(AddVideoShape).strict().refine(endAfterStart, endAfterStartMsg);

// Add audio
export const AddAudioShape = {
  draft_id: DraftIdField.describe('The ID of the draft to add audio to'),
  audio_url: UrlSchema,
  start: z.number().min(0).describe('Start time in seconds'),
  end: z.number().positive().describe('End time in seconds'),
  volume: z.number().min(0).max(1).default(1.0).describe('Audio volume (0.0 to 1.0)'),
  fade_in: z.number().min(0).default(0).describe('Fade in duration in seconds'),
  fade_out: z.number().min(0).default(0).describe('Fade out duration in seconds'),
  response_format: ResponseFormatSchema
};
export const AddAudioSchema = z.object(AddAudioShape).strict().refine(endAfterStart, endAfterStartMsg);

// Add text
export const AddTextShape = {
  draft_id: DraftIdField.describe('The ID of the draft to add text to'),
  text: z.string().min(1).max(500).describe('The text content to display'),
  start: z.number().min(0).describe('Start time in seconds'),
  end: z.number().positive().describe('End time in seconds'),
  font: z.string().optional().describe('Font family name'),
  font_size: z.number().int().min(12).max(200).default(48).describe('Font size in points'),
  font_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF').describe('Font color in hex format'),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('Background color in hex format'),
  background_alpha: z.number().min(0).max(1).default(0.8).describe('Background opacity (0.0 to 1.0)'),
  shadow_enabled: z.boolean().default(false).describe('Enable text shadow'),
  shadow_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000').describe('Shadow color in hex format'),
  position_x: z.number().min(0).max(1).default(0.5).describe('Horizontal position (0.0 to 1.0)'),
  position_y: z.number().min(0).max(1).default(0.5).describe('Vertical position (0.0 to 1.0)'),
  animation: z.enum(TEXT_ANIMATIONS as [string, ...string[]]).optional().describe('Animation effect to apply'),
  response_format: ResponseFormatSchema
};
export const AddTextSchema = z.object(AddTextShape).strict().refine(endAfterStart, endAfterStartMsg);

// Add image
export const AddImageShape = {
  draft_id: DraftIdField.describe('The ID of the draft to add image to'),
  image_url: UrlSchema,
  start: z.number().min(0).describe('Start time in seconds'),
  end: z.number().positive().describe('End time in seconds'),
  position_x: z.number().min(0).max(1).default(0.5).describe('Horizontal position (0.0 to 1.0)'),
  position_y: z.number().min(0).max(1).default(0.5).describe('Vertical position (0.0 to 1.0)'),
  scale: z.number().min(0.1).max(5).default(1.0).describe('Scale multiplier'),
  rotation: z.number().min(-360).max(360).default(0).describe('Rotation angle in degrees'),
  animation: z.string().optional().describe('Animation effect to apply'),
  response_format: ResponseFormatSchema
};
export const AddImageSchema = z.object(AddImageShape).strict().refine(endAfterStart, endAfterStartMsg);

// Add subtitle
export const AddSubtitleShape = {
  draft_id: DraftIdField.describe('The ID of the draft to add subtitles to'),
  srt_content: z.string().min(1).describe('SRT formatted subtitle content'),
  font: z.string().optional().describe('Font family name'),
  font_size: z.number().int().min(12).max(100).default(36).describe('Font size in points'),
  font_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF').describe('Font color in hex format'),
  background_enabled: z.boolean().default(true).describe('Enable background behind text'),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000').describe('Background color in hex format'),
  response_format: ResponseFormatSchema
};
export const AddSubtitleSchema = z.object(AddSubtitleShape).strict();

// Add keyframe (times and values must be same length)
export const AddKeyframeShape = {
  draft_id: DraftIdField.describe('The ID of the draft to add keyframes to'),
  track_name: z.string().min(1).describe('Name of the track to animate'),
  property_types: z.array(z.string()).min(1).describe('Properties to animate'),
  times: z.array(z.number()).min(2).describe('Keyframe times in seconds'),
  values: z.array(z.string()).min(2).describe('Values for each keyframe'),
  response_format: ResponseFormatSchema
};
export const AddKeyframeSchema = z.object(AddKeyframeShape).strict().refine(
  d => d.times.length === d.values.length,
  { message: 'times and values must have the same length', path: ['values'] }
);

// Add effect
export const AddEffectShape = {
  draft_id: DraftIdField.describe('The ID of the draft to add effect to'),
  effect_name: z.enum(AVAILABLE_EFFECTS as [string, ...string[]]).describe('Name of the effect to apply'),
  start: z.number().min(0).describe('Start time in seconds'),
  end: z.number().positive().describe('End time in seconds'),
  intensity: z.number().min(0).max(1).default(0.5).describe('Effect intensity (0.0 to 1.0)'),
  response_format: ResponseFormatSchema
};
export const AddEffectSchema = z.object(AddEffectShape).strict().refine(endAfterStart, endAfterStartMsg);

// Add sticker
export const AddStickerShape = {
  draft_id: DraftIdField.describe('The ID of the draft to add sticker to'),
  sticker_url: UrlSchema,
  start: z.number().min(0).describe('Start time in seconds'),
  end: z.number().positive().describe('End time in seconds'),
  position_x: z.number().min(0).max(1).default(0.5).describe('Horizontal position (0.0 to 1.0)'),
  position_y: z.number().min(0).max(1).default(0.5).describe('Vertical position (0.0 to 1.0)'),
  scale: z.number().min(0.1).max(5).default(1.0).describe('Scale multiplier'),
  rotation: z.number().min(-360).max(360).default(0).describe('Rotation angle in degrees'),
  response_format: ResponseFormatSchema
};
export const AddStickerSchema = z.object(AddStickerShape).strict().refine(endAfterStart, endAfterStartMsg);

// Save draft
export const SaveDraftShape = {
  draft_id: DraftIdField.describe('The ID of the draft to save'),
  response_format: ResponseFormatSchema
};
export const SaveDraftSchema = z.object(SaveDraftShape).strict();

// Get duration
export const GetDurationShape = {
  url: UrlSchema.describe('URL to the media file to analyze'),
  response_format: ResponseFormatSchema
};
export const GetDurationSchema = z.object(GetDurationShape).strict();

// Type inference helpers
export type CreateDraftInput = z.infer<typeof CreateDraftSchema>;
export type AddVideoInput = z.infer<typeof AddVideoSchema>;
export type AddAudioInput = z.infer<typeof AddAudioSchema>;
export type AddTextInput = z.infer<typeof AddTextSchema>;
export type AddImageInput = z.infer<typeof AddImageSchema>;
export type AddSubtitleInput = z.infer<typeof AddSubtitleSchema>;
export type AddKeyframeInput = z.infer<typeof AddKeyframeSchema>;
export type AddEffectInput = z.infer<typeof AddEffectSchema>;
export type AddStickerInput = z.infer<typeof AddStickerSchema>;
export type SaveDraftInput = z.infer<typeof SaveDraftSchema>;
export type GetDurationInput = z.infer<typeof GetDurationSchema>;
