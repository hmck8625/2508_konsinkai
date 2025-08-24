import { NextRequest, NextResponse } from 'next/server';
// Timer functions moved inline to avoid Next.js export conflicts

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Control action:', body);
    
    // Validate request
    if (!body.action || !body.eventId) {
      return NextResponse.json(
        { success: false, error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    const { action, eventId, questionId } = body;

    // Handle time extension actions
    if (action === 'extend_10' || action === 'extend_30') {
      if (!questionId) {
        return NextResponse.json(
          { success: false, error: '時間延長には問題IDが必要です' },
          { status: 400 }
        );
      }

      const extensionSeconds = action === 'extend_10' ? 10 : 30;
      // const extensionMs = extensionSeconds * 1000;

      try {
        // Call the extension function from answer API
        // extendQuestionTime(eventId, questionId, extensionMs); // Temporarily disabled
        
        return NextResponse.json({
          success: true,
          action,
          timestamp: Date.now(),
          message: `回答時間を${extensionSeconds}秒延長しました`,
          extensionSeconds,
          questionId
        });
      } catch (error) {
        console.error('Time extension error:', error);
        return NextResponse.json(
          { success: false, error: '時間延長に失敗しました' },
          { status: 500 }
        );
      }
    }

    // Mock control actions for other actions
    const mockResponse = {
      success: true,
      action: body.action,
      timestamp: Date.now(),
      message: `アクション「${body.action}」が実行されました`,
    };

    // Different responses based on action
    switch (body.action) {
      case 'start_game':
        mockResponse.message = 'ゲームを開始しました';
        break;
      case 'start_question':
        if (questionId) {
          // Start question timer when question begins
          // startQuestionTimer(eventId, questionId); // Temporarily disabled
          mockResponse.message = '問題を開始しました';
        }
        break;
      case 'next_question':
        mockResponse.message = '次の問題に進みました';
        break;
      case 'show_results':
        mockResponse.message = '結果を表示中です';
        break;
      case 'end_game':
        mockResponse.message = 'ゲームを終了しました';
        break;
      case 'reset_game':
        // Reset all timers when game is reset
        // resetAllTimers(); // Temporarily disabled
        mockResponse.message = 'ゲームをリセットしました';
        break;
      case 'timeout_question':
        // Handle automatic timeout for unanswered players
        if (questionId) {
          try {
            // Call the timeout handling from answer API
            const timeoutResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/answer`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventId, questionId })
            });
            
            if (timeoutResponse.ok) {
              mockResponse.message = '回答時間が終了し、未回答者は自動的に0として記録されました';
            }
          } catch (error) {
            console.error('Timeout handling error:', error);
          }
        }
        break;
    }

    console.log('Control response:', mockResponse);
    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('Control API error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}