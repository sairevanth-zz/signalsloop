
import OpenAI from 'openai';
import * as XLSX from 'xlsx';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedRoadmap {
    features: {
        name: string;
        description: string | null;
        priority: string | null;
        timeline: string | null;
        status: string | null;
        category: string | null;
        owner: string | null;
    }[];
    metadata: {
        roadmap_type: string;
        tool_detected: string;
        time_horizon: string;
        total_items: number;
        original_input_type: 'text' | 'image' | 'file';
    };
}

export async function parseRoadmapFromText(text: string): Promise<ParsedRoadmap> {
    const prompt = `
Parse this roadmap text and extract structured feature data.
The text might be bullet points, numbered list, or copied from a tool.

ROADMAP TEXT:
${text}

Respond with JSON:
{
  "features": [
    {
      "name": "Feature name",
      "description": "Description or null",
      "priority": "P1 or null",
      "timeline": "Q2 2025 or null",
      "status": "planned or null",
      "category": "Category or null",
      "owner": "Team or null"
    }
  ],
  "metadata": {
    "roadmap_type": "list/kanban/etc",
    "tool_detected": "Notion/Jira/etc",
    "time_horizon": "6 months",
    "total_items": 15
  }
}

PARSING RULES:
- Each bullet point or numbered item is likely a separate feature
- Headers might indicate categories or time periods
- Look for priority indicators (P0, P1, Must Have, etc.)
- Look for timeline indicators (Q1, March, H1, etc.)
- Look for status indicators (Done, In Progress, Planned, etc.)
`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are an expert roadmap parser. Return ONLY valid JSON.' },
            { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Failed to parse roadmap');

    const result = JSON.parse(content);
    return {
        ...result,
        metadata: {
            ...result.metadata,
            original_input_type: 'text'
        }
    };
}

export async function parseRoadmapFromImage(base64Image: string): Promise<ParsedRoadmap> {
    // Ensure the image string is properly formatted (data:image/jpeg;base64,...)
    const imageUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

    const prompt = `
Analyze this roadmap screenshot and extract all features/initiatives.
Pay special attention to VISUAL CUES, LEGENDS, and METRICS (votes, hearts, comments).

For each item visible, extract:
- name: Feature/initiative name
- description: Any description visible (null if none)
- priority: Priority if visible (P0/P1 or visual indicators like 'High', 'Urgent').
- timeline: Quarter/date if visible.
- status: Status if visible (column name like 'In Progress', 'Done', etc.).
- category: Category/theme if visible (look for COLOR TAGS or LEGEND explanations, e.g., 'Blue = Platform').
- owner: Owner/team (look for avatars or names).
- metrics: { "votes": number | null, "comments": number | null, "hearts": number | null } (Extract any numbers next to icons like thumbs up, heart, chat bubbles).

Also identify GLOBAL METADATA:
- roadmap_type: kanban/timeline/list/gantt/table.
- tool_detected: Trello/Jira/Asana/etc.
- legend_definitions: If there is a "Key" or "Legend" or card explaining colors (e.g., "Green is for publishing"), extract it here.

Respond with JSON structure:
{
  "features": [
    {
      "name": "Feature Name",
      "description": "...",
      "priority": "...",
      "timeline": "...",
      "status": "...",
      "category": "...",
      "owner": "...",
      "metrics": { "votes": 12, "comments": 5 }
    }
  ],
  "metadata": {
    "roadmap_type": "...",
    "tool_detected": "...",
    "time_horizon": "...",
    "total_items": 10,
    "legend_definitions": "Blue=Platform, Green=Publishing..."
  }
}
`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Use gpt-4o which has vision capabilities
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageUrl,
                        }
                    }
                ]
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Failed to parse roadmap image');

    const result = JSON.parse(content);
    return {
        ...result,
        metadata: {
            ...result.metadata,
            original_input_type: 'image'
        }
    };
}

export async function parseRoadmapFromFile(fileBuffer: Buffer, fileType: string): Promise<ParsedRoadmap> {
    let rawText = '';

    if (fileType === 'application/json' || fileType.endsWith('json')) {
        rawText = fileBuffer.toString('utf-8');
    } else {
        // Handle CSV/Excel using XLSX
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert to CSV string provided easier structure for LLM to parse
        rawText = XLSX.utils.sheet_to_csv(sheet);
    }

    // Reuse the text parsing logic but with a hint about source
    const prompt = `
Parse this roadmap data (from file import) and extract structured feature data.

RAW DATA:
${rawText.substring(0, 15000)} // Truncate to avoid token limits if massive

Respond with JSON:
{
  "features": [
    {
      "name": "Feature name",
      "description": "Description or null",
      "priority": "P1 or null",
      "timeline": "Q2 2025 or null",
      "status": "planned or null",
      "category": "Category or null",
      "owner": "Team or null"
    }
  ],
  "metadata": {
    "roadmap_type": "list",
    "tool_detected": "File Import",
    "time_horizon": "Unknown",
    "total_items": 15
  }
}
`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are an expert roadmap parser. Return ONLY valid JSON.' },
            { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Failed to parse roadmap file');

    const result = JSON.parse(content);
    return {
        ...result,
        metadata: {
            ...result.metadata,
            original_input_type: 'file'
        }
    };
}
