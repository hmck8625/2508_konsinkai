import { NextRequest, NextResponse } from 'next/server';
import { kvStorage } from '@/lib/kvStorage';

// Node.js Runtimeを強制してKVとメモリ共有を有効に
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('e');

    if (!eventId) {
      return NextResponse.json(
        { error: 'イベントIDが必要です' },
        { status: 400 }
      );
    }

    // Get participants for this event from KV
    const participants = await kvStorage.getParticipants(eventId);
    
    console.log(`📊 GET participants for event ${eventId}:`, participants.length, 'participants');

    return NextResponse.json({
      participants,
      count: participants.length,
    });

  } catch (error) {
    console.error('Participants API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, playerId, nickname, deviceId } = body;

    if (!eventId || !playerId || !nickname) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // Get current participants from KV
    const currentParticipants = await kvStorage.getParticipants(eventId);

    // Check if participant already exists
    const existingIndex = currentParticipants.findIndex(p => p.playerId === playerId);
    
    const participantData = {
      playerId,
      nickname,
      deviceId,
      joinedAt: new Date().toISOString(),
      life: 100, // Starting life
      totalDamage: 0,
      status: 'active',
      lastDamage: 0 // For animation purposes
    };

    if (existingIndex >= 0) {
      // Update existing participant
      currentParticipants[existingIndex] = participantData;
    } else {
      // Add new participant
      currentParticipants.push(participantData);
    }

    // Save to KV
    await kvStorage.setParticipants(eventId, currentParticipants);
    console.log(`💾 SET participant for event ${eventId}:`, participantData.playerId);

    return NextResponse.json({
      success: true,
      participant: participantData
    });

  } catch (error) {
    console.error('Participants POST API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update participant life/damage
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, playerId, damage } = body;

    if (!eventId || !playerId || damage === undefined) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // Get current participants and find the one to update
    const currentParticipants = await kvStorage.getParticipants(eventId);
    const participantIndex = currentParticipants.findIndex(p => p.playerId === playerId);
    
    if (participantIndex >= 0) {
      const participant = currentParticipants[participantIndex];
      participant.lastDamage = damage;
      participant.totalDamage = (participant.totalDamage || 0) + damage;
      participant.life = Math.max(0, (participant.life || 100) - damage);
      
      if (participant.life <= 0) {
        participant.status = 'eliminated';
      }

      // Save updated participants to KV
      await kvStorage.setParticipants(eventId, currentParticipants);
      console.log(`🔄 DAMAGE ${playerId}:`, damage, 'life:', participant.life);

      return NextResponse.json({
        success: true,
        participant
      });
    }

    return NextResponse.json(
      { error: '参加者が見つかりません' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Participants PUT API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}