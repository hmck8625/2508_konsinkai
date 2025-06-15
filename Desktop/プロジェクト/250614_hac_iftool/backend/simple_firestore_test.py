#!/usr/bin/env python3
"""
シンプルなFirestoreテスト用FastAPIサーバー
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 環境変数設定
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/Users/hamazakidaisuke/Desktop/プロジェクト/250614_hac_iftool/hackathon-462905-fd4f661125e5.json'

app = FastAPI(title="Firestore Test API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Firestore Test API", "status": "running"}

@app.get("/api/v1/influencers")
async def get_firestore_influencers():
    """Firestoreから直接インフルエンサーデータを取得"""
    try:
        from google.cloud import firestore
        
        # Firestoreクライアント初期化
        db = firestore.Client(project="hackathon-462905")
        
        # データ取得
        collection_ref = db.collection('youtube_influencers')
        docs = collection_ref.limit(10).stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            # APIレスポンス形式に変換
            result = {
                "id": data.get('channel_id', doc.id),
                "name": data.get('channel_title', 'Unknown Channel'),
                "channelId": data.get('channel_id', ''),
                "subscriberCount": data.get('subscriber_count', 0),
                "viewCount": data.get('view_count', 0),
                "videoCount": data.get('video_count', 0),
                "category": data.get('primary_category', 'その他'),
                "description": data.get('description', ''),
                "thumbnailUrl": data.get('thumbnail_url', 'https://via.placeholder.com/120x120'),
                "engagementRate": data.get('engagement_rate', 0.0),
                "email": data.get('business_email'),
            }
            results.append(result)
        
        print(f"✅ Firestore: {len(results)} influencers found")
        return results
        
    except Exception as e:
        print(f"❌ Firestore error: {e}")
        # フォールバック：モックデータ
        return [
            {
                "id": "UC1234567890",
                "name": "Firestore接続エラー - モックデータ",
                "channelId": "UC1234567890",
                "subscriberCount": 8500,
                "viewCount": 1250000,
                "videoCount": 156,
                "category": "テクノロジー",
                "description": f"Firestoreに接続できませんでした: {str(e)}",
                "thumbnailUrl": "https://via.placeholder.com/120x120",
                "engagementRate": 4.5,
                "email": "error@example.com"
            }
        ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)