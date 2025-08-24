import { NextRequest, NextResponse } from 'next/server';
import { mockStorage } from '@/lib/mockStorage';

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

    // Get mock participants for this event
    const participants = mockStorage.participants[eventId] || [];
    
    // ストレージの状態をデバッグ
    console.log(`🔍 STORAGE DEBUG: mockStorage.participants keys:`, Object.keys(mockStorage.participants));
    console.log(`🔍 STORAGE DEBUG: eventId '${eventId}' exists:`, eventId in mockStorage.participants);
    console.log(`📊 DEBUG Participants for event ${eventId}:`, participants.length, 'participants');
    
    if (participants.length === 0) {
      console.log(`⚠️  WARNING: No participants found for event ${eventId} - storage may have been reset`);
    }

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

    // Initialize event participants array if it doesn't exist
    if (!mockStorage.participants[eventId]) {
      mockStorage.participants[eventId] = [];
    }

    // Check if participant already exists
    const existingIndex = mockStorage.participants[eventId].findIndex(p => p.playerId === playerId);
    
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
      mockStorage.participants[eventId][existingIndex] = participantData;
    } else {
      // Add new participant
      mockStorage.participants[eventId].push(participantData);
    }

    console.log(`Added/Updated participant for event ${eventId}:`, participantData);

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

    // Find participant and update life
    if (mockStorage.participants[eventId]) {
      const participantIndex = mockStorage.participants[eventId].findIndex(p => p.playerId === playerId);
      
      if (participantIndex >= 0) {
        const participant = mockStorage.participants[eventId][participantIndex];
        participant.lastDamage = damage;
        participant.totalDamage = (participant.totalDamage || 0) + damage;
        participant.life = Math.max(0, (participant.life || 100) - damage);
        
        if (participant.life <= 0) {
          participant.status = 'eliminated';
        }

        console.log(`Updated participant ${playerId} life:`, participant);

        return NextResponse.json({
          success: true,
          participant
        });
      }
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