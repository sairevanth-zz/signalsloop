/**
 * Discord Slash Commands Registration
 * 
 * POST /api/integrations/discord/register-commands
 * 
 * Registers all slash commands with Discord's API.
 * Should be called once when setting up the bot or when commands change.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Slash command definitions
const COMMANDS = [
    {
        name: 'briefing',
        description: "Get today's product briefing with critical items and health overview",
    },
    {
        name: 'health',
        description: 'Get current product health score and metrics',
    },
    {
        name: 'insights',
        description: 'Get top themes and trends from user feedback',
    },
    {
        name: 'feedback',
        description: 'Create, search, or vote on feedback',
        options: [
            {
                name: 'action',
                description: 'What to do with feedback',
                type: 3, // STRING
                required: true,
                choices: [
                    { name: 'Create new feedback', value: 'create' },
                    { name: 'Search for feedback', value: 'search' },
                    { name: 'Vote on feedback', value: 'vote' },
                ],
            },
            {
                name: 'text',
                description: 'Feedback title (for create) or search query (for search/vote)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'priority',
                description: 'Vote priority (only for vote action)',
                type: 3, // STRING
                required: false,
                choices: [
                    { name: 'Must Have', value: 'must_have' },
                    { name: 'Important', value: 'important' },
                    { name: 'Nice to Have', value: 'nice_to_have' },
                ],
            },
        ],
    },
    {
        name: 'ask',
        description: 'Ask anything using natural language - AI will understand and respond',
        options: [
            {
                name: 'query',
                description: 'Your question or command in plain English',
                type: 3, // STRING
                required: true,
            },
        ],
    },
];

export async function POST(request: NextRequest) {
    try {
        const applicationId = process.env.DISCORD_APPLICATION_ID;
        const botToken = process.env.DISCORD_BOT_TOKEN;

        if (!applicationId || !botToken) {
            return NextResponse.json(
                { error: 'Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN' },
                { status: 500 }
            );
        }

        // Register commands globally (works in all servers the bot is in)
        const response = await fetch(
            `https://discord.com/api/v10/applications/${applicationId}/commands`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(COMMANDS),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('[Discord] Command registration failed:', error);
            return NextResponse.json(
                { error: 'Failed to register commands', details: error },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('[Discord] Commands registered successfully:', data.length);

        return NextResponse.json({
            success: true,
            message: `Registered ${data.length} slash commands`,
            commands: data.map((c: any) => c.name),
        });
    } catch (error) {
        console.error('[Discord] Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'POST to this endpoint to register Discord slash commands',
        commands: COMMANDS.map(c => ({
            name: c.name,
            description: c.description,
        })),
    });
}
