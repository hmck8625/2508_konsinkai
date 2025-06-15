import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const gmailService = new GmailService(session.accessToken);
    const thread = await gmailService.getThread(params.threadId);

    return NextResponse.json({ thread });
  } catch (error) {
    console.error('Gmail thread詳細API エラー:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email thread' },
      { status: 500 }
    );
  }
}