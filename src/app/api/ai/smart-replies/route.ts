import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { postId, title, description } = await request.json();
    
    if (!postId || !title) {
      return NextResponse.json({ error: 'Post ID and title are required' }, { status: 400 });
    }

    // Return mock smart replies for testing
    const mockReplies = [
      {
        text: "Could you provide more specific examples of how this would work in your use case?",
        type: "clarification"
      },
      {
        text: "What would be the expected outcome or benefit if this feature was implemented?",
        type: "follow_up"
      },
      {
        text: "Are there any specific requirements or constraints we should consider?",
        type: "details"
      }
    ];

    return NextResponse.json({ 
      success: true, 
      replies: mockReplies,
      message: 'Smart replies generated successfully' 
    });

  } catch (error) {
    console.error('Smart replies generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Return empty array for now
    return NextResponse.json({ replies: [] });

  } catch (error) {
    console.error('Fetch smart replies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}