import { NextRequest, NextResponse } from 'next/server';
import { mockStorage } from '@/lib/mockStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Join request:', body);
    
    // Validate request
    if (!body.eventCode || !body.nickname || !body.deviceId) {
      return NextResponse.json(
        { success: false, error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // Generate player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventId = body.eventCode;

    // Initialize event participants array if it doesn't exist
    if (!mockStorage.participants[eventId]) {
      mockStorage.participants[eventId] = [];
    }

    // Check if participant already exists with same deviceId AND nickname
    const existingIndex = mockStorage.participants[eventId].findIndex(p => 
      p.deviceId === body.deviceId && p.nickname === body.nickname.trim()
    );
    
    // If same device but different nickname, allow as new participant (different browser/session)
    let finalNickname = body.nickname.trim();
    const nicknameExists = mockStorage.participants[eventId].some(p => p.nickname === finalNickname);
    
    // If nickname exists but not same device, modify nickname
    if (nicknameExists && existingIndex === -1) {
      let counter = 2;
      while (mockStorage.participants[eventId].some(p => p.nickname === `${finalNickname}_${counter}`)) {
        counter++;
      }
      finalNickname = `${finalNickname}_${counter}`;
    }
    
    const participantData = {
      playerId,
      nickname: finalNickname,
      deviceId: body.deviceId,
      joinedAt: new Date().toISOString(),
      life: 100, // Starting life
      totalDamage: 0,
      status: 'active',
      lastDamage: 0 // For animation purposes
    };

    if (existingIndex >= 0) {
      // Update existing participant (same device, same nickname)
      mockStorage.participants[eventId][existingIndex] = {
        ...mockStorage.participants[eventId][existingIndex],
        playerId, // Generate new playerId for rejoining
        joinedAt: new Date().toISOString(),
        status: 'active'
      };
    } else {
      // Add new participant
      mockStorage.participants[eventId].push(participantData);
    }

    console.log(`Participant registered directly to mockStorage for event ${eventId}:`, participantData);

    const mockResponse = {
      success: true,
      playerId: playerId,
      nickname: finalNickname,
    };

    console.log('Join response:', mockResponse);
    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('Join API error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}