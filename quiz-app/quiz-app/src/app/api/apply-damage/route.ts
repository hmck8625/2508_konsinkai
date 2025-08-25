import { NextRequest, NextResponse } from 'next/server';
import { mockStorage } from '@/lib/mockStorage';

// Node.js Runtimeを強制してメモリ共有を有効に
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, questionId, playerId } = body;

    if (!eventId || !questionId || !playerId) {
      return NextResponse.json(
        { error: 'イベントID、問題ID、プレイヤーIDが必要です' },
        { status: 400 }
      );
    }

    const answerKey = `${eventId}-${questionId}`;
    const answers = (mockStorage.answers[answerKey] || []) as Record<string, unknown>[];
    const answer = answers.find(a => a.playerId === playerId);

    if (!answer) {
      return NextResponse.json(
        { error: '該当する回答が見つかりません' },
        { status: 404 }
      );
    }

    console.log(`Applying damage for ${playerId}: ${answer.damage}`);

    // Apply damage to specific participant
    if (mockStorage.participants[eventId]) {
      const participantIndex = mockStorage.participants[eventId].findIndex(
        p => (p as Record<string, unknown>).playerId === playerId
      );
      
      if (participantIndex >= 0) {
        const participant = mockStorage.participants[eventId][participantIndex] as Record<string, unknown>;
        participant.lastDamage = answer.damage;
        participant.totalDamage = (Number(participant.totalDamage) || 0) + (answer.damage as number);
        participant.life = Math.max(0, (Number(participant.life) || 100) - (answer.damage as number));
        
        if (Number(participant.life) <= 0) {
          participant.status = 'eliminated';
        }

        console.log(`Applied ${answer.damage} damage to ${participant.nickname}, life now: ${participant.life}`);

        return NextResponse.json({
          success: true,
          participant,
          damage: answer.damage,
          message: 'ダメージを適用しました'
        });
      }
    }

    return NextResponse.json(
      { error: '参加者が見つかりません' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Apply damage API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}