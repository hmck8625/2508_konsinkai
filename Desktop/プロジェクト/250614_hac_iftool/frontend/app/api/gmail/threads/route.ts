import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const influencerEmail = searchParams.get('email');

    const gmailService = new GmailService(session.accessToken);
    const threads = await gmailService.getInfluencerThreads(influencerEmail || undefined);

    return NextResponse.json({ threads });
  } catch (error) {
    console.error('Gmail threads API エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email threads' },
      { status: 500 }
    );
  }
}