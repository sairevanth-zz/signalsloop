import { NextRequest, NextResponse } from 'next/server';
import { categorizeFeedback } from '@/lib/ai-categorization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description } = body;
    
    console.log('Testing categorization for:', { title, description });
    
    const result = await categorizeFeedback(title, description);
    
    console.log('Categorization result:', result);
    
    return NextResponse.json({
      success: true,
      result,
      input: { title, description }
    });
  } catch (error) {
    console.error('Categorization test error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
