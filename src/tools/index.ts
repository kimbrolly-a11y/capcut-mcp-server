// Tool registration for CapCut MCP server
//
// Each tool passes the raw ZodRawShape (`*Shape`) to McpServer.registerTool's
// `inputSchema`, which is what the SDK expects. Cross-field invariants
// (end > start, times.length === values.length) are enforced by re-parsing
// the args through the matching `*Schema` (which carries the .refine()).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiClient } from '../services/api-client.js';
import { ResponseFormat } from '../types.js';
import {
  CreateDraftShape,
  CreateDraftSchema,
  AddVideoShape,
  AddVideoSchema,
  AddAudioShape,
  AddAudioSchema,
  AddTextShape,
  AddTextSchema,
  AddImageShape,
  AddImageSchema,
  AddSubtitleShape,
  AddSubtitleSchema,
  AddKeyframeShape,
  AddKeyframeSchema,
  AddEffectShape,
  AddEffectSchema,
  AddStickerShape,
  AddStickerSchema,
  SaveDraftShape,
  SaveDraftSchema,
  GetDurationShape,
  GetDurationSchema,
  type CreateDraftInput,
  type AddVideoInput,
  type AddAudioInput,
  type AddTextInput,
  type AddImageInput,
  type AddSubtitleInput,
  type AddKeyframeInput,
  type AddEffectInput,
  type AddStickerInput,
  type SaveDraftInput,
  type GetDurationInput
} from '../schemas/index.js';
import type { ZodTypeAny } from 'zod';

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
};

function formatResponse(data: any, format: ResponseFormat): ToolResult {
  if (format === ResponseFormat.JSON) {
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: data
    };
  }
  let markdown = '';
  if (data?.draft_id) {
    markdown += `## Draft Created\n\n`;
    markdown += `- **Draft ID**: \`${data.draft_id}\`\n`;
    markdown += `- **Dimensions**: ${data.width}x${data.height}\n`;
    markdown += `- **FPS**: ${data.fps}\n`;
  } else if (data?.duration !== undefined) {
    markdown += `## Media Duration\n\n`;
    markdown += `- **Duration**: ${Number(data.duration).toFixed(2)}s\n`;
    if (data.format) markdown += `- **Format**: ${data.format}\n`;
    if (data.width) markdown += `- **Resolution**: ${data.width}x${data.height}\n`;
  } else if (data?.draft_url) {
    markdown += `## Draft Saved\n\n`;
    markdown += `Draft saved successfully at:\n\`${data.draft_url}\`\n\n`;
    markdown += `Copy this folder to your CapCut drafts directory to open it in the application.\n`;
  } else {
    markdown += `## Operation Successful\n\n`;
    markdown += '```json\n' + JSON.stringify(data, null, 2) + '\n```\n';
  }
  return {
    content: [{ type: 'text', text: markdown }],
    structuredContent: data
  };
}

function handleError(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return {
    content: [{
      type: 'text',
      text: `Error: ${message}\n\nPlease check that:\n- The CapCut API server is running\n- All required parameters are valid\n- Media URLs are accessible`
    }]
  };
}

function validate<T extends ZodTypeAny>(schema: T, args: unknown):
  | { ok: true; data: ReturnType<T['parse']> }
  | { ok: false; result: ToolResult } {
  const parsed = schema.safeParse(args);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const message = parsed.error.issues
    .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return { ok: false, result: handleError(new Error(`Invalid arguments: ${message}`)) };
}

export function registerTools(server: McpServer): void {
  // 1. Create Draft
  server.registerTool(
    'capcut_create_draft',
    {
      title: 'Create CapCut Draft',
      description: 'Create a new video editing draft with specified dimensions and frame rate.',
      inputSchema: CreateDraftShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async (args) => {
      const v = validate(CreateDraftSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as CreateDraftInput;
      try {
        const response = await apiClient.createDraft({ width: params.width, height: params.height, fps: params.fps });
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to create draft');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 2. Add Video
  server.registerTool(
    'capcut_add_video',
    {
      title: 'Add Video to Draft',
      description: 'Add a video clip to an existing draft with timing, volume, and effects.',
      inputSchema: AddVideoShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      const v = validate(AddVideoSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as AddVideoInput;
      try {
        const response = await apiClient.addVideo(params);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to add video');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 3. Add Audio
  server.registerTool(
    'capcut_add_audio',
    {
      title: 'Add Audio to Draft',
      description: 'Add audio track to draft with volume and fade effects.',
      inputSchema: AddAudioShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      const v = validate(AddAudioSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as AddAudioInput;
      try {
        const response = await apiClient.addAudio(params);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to add audio');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 4. Add Text
  server.registerTool(
    'capcut_add_text',
    {
      title: 'Add Text to Draft',
      description: 'Add styled text overlay to video with positioning, colors, shadows, and animations.',
      inputSchema: AddTextShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async (args) => {
      const v = validate(AddTextSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as AddTextInput;
      try {
        const response = await apiClient.addText(params);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to add text');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 5. Add Image
  server.registerTool(
    'capcut_add_image',
    {
      title: 'Add Image to Draft',
      description: 'Add image overlay to video with positioning, scaling, rotation, and animation.',
      inputSchema: AddImageShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      const v = validate(AddImageSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as AddImageInput;
      try {
        const response = await apiClient.addImage(params);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to add image');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 6. Add Subtitle
  server.registerTool(
    'capcut_add_subtitle',
    {
      title: 'Add Subtitles to Draft',
      description: 'Add subtitles from SRT file content with styling options.',
      inputSchema: AddSubtitleShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async (args) => {
      const v = validate(AddSubtitleSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as AddSubtitleInput;
      try {
        const response = await apiClient.addSubtitle(params);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to add subtitle');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 7. Add Keyframe
  server.registerTool(
    'capcut_add_keyframe',
    {
      title: 'Add Keyframe Animation',
      description: 'Add keyframe-based property animation to tracks. times and values must have the same length.',
      inputSchema: AddKeyframeShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async (args) => {
      const v = validate(AddKeyframeSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as AddKeyframeInput;
      try {
        const response = await apiClient.addKeyframe(params);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to add keyframe');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 8. Add Effect
  server.registerTool(
    'capcut_add_effect',
    {
      title: 'Add Visual Effect',
      description: 'Apply visual effects to video segments.',
      inputSchema: AddEffectShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async (args) => {
      const v = validate(AddEffectSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as AddEffectInput;
      try {
        const response = await apiClient.addEffect(params);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to add effect');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 9. Add Sticker
  server.registerTool(
    'capcut_add_sticker',
    {
      title: 'Add Sticker to Draft',
      description: 'Add sticker/emoji overlay with positioning and transformation.',
      inputSchema: AddStickerShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args) => {
      const v = validate(AddStickerSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as AddStickerInput;
      try {
        const response = await apiClient.addSticker(params);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to add sticker');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 10. Save Draft
  server.registerTool(
    'capcut_save_draft',
    {
      title: 'Save Draft',
      description: 'Save the draft to a file that can be imported into CapCut.',
      inputSchema: SaveDraftShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (args) => {
      const v = validate(SaveDraftSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as SaveDraftInput;
      try {
        const response = await apiClient.saveDraft(params.draft_id);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to save draft');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );

  // 11. Get Media Duration
  server.registerTool(
    'capcut_get_duration',
    {
      title: 'Get Media Duration',
      description: 'Get duration and metadata of video or audio file.',
      inputSchema: GetDurationShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (args) => {
      const v = validate(GetDurationSchema, args);
      if (!v.ok) return v.result;
      const params = v.data as GetDurationInput;
      try {
        const response = await apiClient.getDuration(params.url);
        if (!response.success || !response.result) throw new Error(response.error || 'Failed to get duration');
        return formatResponse(response.result, params.response_format);
      } catch (error) { return handleError(error); }
    }
  );
}
