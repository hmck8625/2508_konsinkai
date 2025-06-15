import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { to, subject, message, threadId } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    const gmailService = new GmailService(session.accessToken);
    
    if (threadId) {
      // 返信として送信
      await gmailService.sendReply(threadId, to, subject, message);
    } else {
      // 新規メールとして送信
      await gmailService.sendNewMessage(to, subject, message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gmail送信API エラー:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}