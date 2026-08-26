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
];
