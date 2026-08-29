export interface LilaToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export const LILA_AVAILABLE_TOOLS: LilaToolDefinition[] = [
  {
    name: 'openWebsite',
    description: 'Opens a website or URL in a new browser tab. Use when the user wants to visit a site.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: {
          type: 'STRING',
          description: 'The full URL to open, must include https:// or http://',
        },
        reason: {
          type: 'STRING',
          description: 'Brief description of why you are opening this URL',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'searchWeb',
    description: 'Searches Google for a query. Use when the user wants to look something up.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'The search query to look up',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getDateTime',
    description: 'Gets the current date, time, and timezone. Use when the user asks what time or date it is.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: [],
    },
  },
  {
    name: 'app_control',
    description:
      'Controls external apps and device features: place phone calls (e.g. "Call Mom", "Call 9876543210"), evaluate and operate Calculator (e.g. "45 times 12", "500 plus 250"), pause/resume/play/skip YouTube/Spotify/music players, type notes into Notepad/Keep, open apps, set alarms, or adjust settings.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: {
          type: 'STRING',
          description:
            "The action to execute: 'call', 'hang_up', 'calculate', 'play', 'pause', 'resume', 'next', 'previous', 'volume_up', 'volume_down', 'open', 'search', 'play_media', 'type_text', 'set_alarm', 'set_timer', or 'toggle_setting'",
          enum: [
            'call',
            'hang_up',
            'calculate',
            'play',
            'pause',
            'resume',
            'next',
            'previous',
            'volume_up',
            'volume_down',
            'open',
            'search',
            'play_media',
            'type_text',
            'set_alarm',
            'set_timer',
            'toggle_setting',
          ],
        },
        target_app: {
          type: 'STRING',
          description:
            "The target application or feature name: 'phone', 'calculator', 'notepad', 'keep', 'samsung_notes', 'youtube', 'spotify', 'whatsapp', 'chrome', 'camera', 'clock', 'settings', 'maps', 'music'",
        },
        phone_number: {
          type: 'STRING',
          description: 'The phone number to dial for call action (e.g. "9876543210")',
        },
        contact_name: {
          type: 'STRING',
          description: 'The contact name to call (e.g. "Mom", "Dad", "Papa", "Rahul", "Home")',
        },
        math_expression: {
          type: 'STRING',
          description: 'The mathematical expression to calculate or press into Calculator (e.g. "45 * 12", "500 + 250", "15% of 1200")',
        },
        query: {
          type: 'STRING',
          description: 'Search query, video/song title, or alarm time (e.g. "Arijit Singh songs", "7:00 AM")',
        },
        text_to_type: {
          type: 'STRING',
          description: 'The note text or dictation content to type into the editable text field in the app',
        },
        note_app: {
          type: 'STRING',
          description: 'Preferred notes application: google_keep, samsung_notes, notepad, or stock_notes',
        },
        setting_name: {
          type: 'STRING',
          description: 'Device setting to toggle: wifi, bluetooth, flashlight, volume',
        },
      },
      required: ['action', 'target_app'],
    },
  },
];
