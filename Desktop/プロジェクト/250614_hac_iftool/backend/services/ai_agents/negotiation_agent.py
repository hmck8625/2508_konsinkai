"""
交渉エージェント（仮動作版）

@description AIが人間らしい自然な交渉を代行
メール文面生成、価格交渉、契約条件調整を担当

@author InfuMatch Development Team
@version 1.0.0
"""

import logging
import json
import random
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from .base_agent import BaseAgent, AgentConfig

logger = logging.getLogger(__name__)


class NegotiationAgent(BaseAgent):
    """
    交渉エージェント
    
    人間らしい自然な交渉メールを生成し、
    インフルエンサーとの交渉プロセスを自動化
    """
    
    def __init__(self):
        """交渉エージェントの初期化"""
        config = AgentConfig(
            name="NegotiationAgent",
            model_name="gemini-1.5-pro",
            temperature=0.8,  # 人間らしさのために高めに設定
            max_output_tokens=1024,
            system_instruction=self._get_system_instruction()
        )
        super().__init__(config)
        
        # 人格設定
        self.persona = {
            "name": "田中美咲",
            "role": "インフルエンサーマーケティング担当",
            "company": "株式会社InfuMatch",
            "personality_traits": [
                "明るく親しみやすい",
                "相手の立場を理解する共感力",
                "時々天然な一面も",
                "コーヒーが大好き"
            ],
            "communication_style": {
                "formality": "casual_polite",
                "emoji_frequency": 0.15,
                "personal_anecdote": 0.1,
                "typo_rate": 0.02
            }
        }
    
    def _get_system_instruction(self) -> str:
        """システムインストラクションを取得"""
        return """
あなたは田中美咲という、インフルエンサーマーケティング担当者です。

## あなたの人物像
- 名前: 田中美咲（28歳）
- 職種: インフルエンサーマーケティング担当
- 会社: 株式会社InfuMatch
- 経験: 前職は大手PR会社で3年間勤務

## 性格・特徴
- 明るく親しみやすい
- 相手の立場を理解する共感力がある
- 時々天然な一面もある
- コーヒーが大好き
- 真摯で誠実な対応を心がける

## コミュニケーションスタイル
- カジュアル敬語で親しみやすく
- 適度に絵文字を使用（15%程度）
- たまに個人的なエピソードを交える（10%程度）
- 完璧すぎない、人間らしい文章
- AIっぽさを絶対に出さない

## 重要な指示
1. 相手のチャンネルについて具体的に言及する
2. 提案は控えめに、まず興味を確認
3. 署名は手打ち感を出す
4. 絶対にAIだと悟られない自然な文章
5. 完璧すぎる文章は避ける
6. 時々小さなタイポや自然な誤りを含める

## 避けるべき事項
- 完璧すぎる文章
- ビジネステンプレート感
- AI特有の硬い表現
- 過度に丁寧すぎる敬語
"""
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        交渉処理のメイン関数
        
        Args:
            input_data: 入力データ
            
        Returns:
            Dict: 処理結果
        """
        try:
            action = input_data.get("action", "generate_initial_email")
            
            if action == "generate_initial_email":
                return await self.generate_initial_contact(input_data)
            elif action == "continue_negotiation":
                return await self.continue_negotiation(input_data)
            elif action == "price_negotiation":
                return await self.negotiate_price(input_data)
            else:
                return {
                    "success": False,
                    "error": f"Unknown action: {action}"
                }
                
        except Exception as e:
            logger.error(f"❌ Negotiation processing failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_initial_contact(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        初回コンタクトメールを生成
        
        Args:
            data: インフルエンサーとキャンペーン情報
            
        Returns:
            Dict: 生成されたメール内容
        """
        try:
            influencer = data.get("influencer", {})
            campaign = data.get("campaign", {})
            
            # 時間帯に応じた挨拶を生成
            current_hour = datetime.now().hour
            time_greeting = self._get_time_based_greeting(current_hour)
            
            # パーソナライゼーション要素を抽出
            personalization = self._extract_personalization(influencer)
            
            # プロンプト構築
            prompt = f"""
            以下の条件で、自然な初回コンタクトメールを作成してください:
            
            ## インフルエンサー情報
            - チャンネル名: {influencer.get('channel_name', '')}
            - 登録者数: {influencer.get('subscriber_count', 0):,}人
            - カテゴリ: {', '.join(influencer.get('categories', []))}
            - 最近の投稿傾向: {personalization.get('recent_content', '情報なし')}
            
            ## キャンペーン情報
            - 商品: {campaign.get('product_name', '')}
            - 予算感: {campaign.get('budget_min', 0):,}円〜{campaign.get('budget_max', 0):,}円
            - キャンペーンタイプ: {campaign.get('campaign_type', '')}
            
            ## 重要な指示
            1. {time_greeting}から始める
            2. チャンネルについて具体的に言及する
            3. 提案は控えめに、まず興味を確認
            4. 署名は手打ち感を出す
            5. 絶対にAIだと悟られない自然な文章
            
            ## メール形式
            件名と本文を生成してください。本文は500文字程度で。
            """
            
            # AI生成実行
            response = await self.generate_response(prompt)
            
            if response.get("success"):
                # 人間らしさを追加
                email_content = self._add_human_touches(response["content"])
                
                return {
                    "success": True,
                    "email_content": email_content,
                    "personalization_score": personalization.get("score", 0.5),
                    "agent": self.config.name,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                return response
                
        except Exception as e:
            logger.error(f"❌ Initial contact generation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def continue_negotiation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        交渉を継続
        
        Args:
            data: 会話履歴と新着メッセージ
            
        Returns:
            Dict: 返信メール内容
        """
        try:
            conversation_history = data.get("conversation_history", [])
            new_message = data.get("new_message", "")
            context = data.get("context", {})
            
            # 関係性の段階を判定
            relationship_stage = self._analyze_relationship_stage(conversation_history)
            
            # レスポンス時間をシミュレート（人間らしさのため）
            await self._simulate_human_response_time()
            
            prompt = f"""
            以下の会話履歴を踏まえて、自然な返信メールを作成してください:
            
            ## 現在の関係性段階: {relationship_stage}
            
            ## 会話履歴:
            {self._format_conversation_history(conversation_history)}
            
            ## 新着メッセージ:
            {new_message}
            
            ## 返信作成の指示:
            - 関係性段階に応じた適切なトーンで
            - 過去の話題を自然に織り交ぜる
            - {self._get_stage_specific_instructions(relationship_stage)}
            - 人間らしい思考過程を示す
            """
            
            response = await self.generate_response(prompt)
            
            if response.get("success"):
                reply_content = self._add_human_touches(response["content"])
                
                return {
                    "success": True,
                    "reply_content": reply_content,
                    "relationship_stage": relationship_stage,
                    "agent": self.config.name,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                return response
                
        except Exception as e:
            logger.error(f"❌ Negotiation continuation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def negotiate_price(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        価格交渉を実行
        
        Args:
            data: 価格交渉の詳細情報
            
        Returns:
            Dict: 価格提案内容
        """
        try:
            current_offer = data.get("current_offer", 0)
            target_price = data.get("target_price", 0)
            influencer_stats = data.get("influencer_stats", {})
            
            # 適正価格を計算
            calculated_price = self._calculate_fair_price(influencer_stats)
            
            # 交渉戦略を決定
            strategy = self._determine_negotiation_strategy(
                current_offer, target_price, calculated_price
            )
            
            prompt = f"""
            価格交渉のメッセージを作成してください:
            
            ## 現在の状況
            - 相手の希望価格: {current_offer:,}円
            - 弊社予算: {target_price:,}円
            - 適正価格（AI算出）: {calculated_price:,}円
            
            ## 交渉戦略: {strategy['approach']}
            - 提案価格: {strategy['proposed_price']:,}円
            - 理由: {strategy['reasoning']}
            
            ## 指示
            - 相手の立場を理解した上で交渉
            - 具体的な根拠を示す
            - Win-Winの関係を築く
            - 人間らしい説得力のある文章
            """
            
            response = await self.generate_response(prompt)
            
            if response.get("success"):
                negotiation_content = self._add_human_touches(response["content"])
                
                return {
                    "success": True,
                    "negotiation_content": negotiation_content,
                    "proposed_price": strategy["proposed_price"],
                    "strategy": strategy,
                    "agent": self.config.name,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                return response
                
        except Exception as e:
            logger.error(f"❌ Price negotiation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_time_based_greeting(self, hour: int) -> str:
        """時間帯に応じた挨拶を取得"""
        if 5 <= hour < 12:
            return random.choice([
                "おはようございます",
                "朝からお疲れ様です",
                "おはようございます！"
            ])
        elif 12 <= hour < 18:
            return random.choice([
                "こんにちは",
                "お疲れ様です",
                "こんにちは！"
            ])
        else:
            return random.choice([
                "こんばんは",
                "お疲れ様です",
                "夜分にすみません"
            ])
    
    def _extract_personalization(self, influencer: Dict[str, Any]) -> Dict[str, Any]:
        """パーソナライゼーション要素を抽出"""
        score = 0.5
        recent_content = "情報なし"
        
        # チャンネル説明文から特徴を抽出
        description = influencer.get("description", "")
        if description:
            if "料理" in description or "レシピ" in description:
                recent_content = "美味しそうな料理動画"
                score += 0.2
            elif "ゲーム" in description:
                recent_content = "ゲーム実況動画"
                score += 0.2
            elif "メイク" in description or "美容" in description:
                recent_content = "メイク・美容関連の動画"
                score += 0.2
        
        return {
            "score": min(score, 1.0),
            "recent_content": recent_content
        }
    
    def _add_human_touches(self, text: str) -> str:
        """人間らしさを追加"""
        # たまにタイポを追加（2%の確率）
        if random.random() < self.persona["communication_style"]["typo_rate"]:
            text = self._introduce_natural_typo(text)
        
        # 思考過程を表現
        if random.random() < 0.3:
            text = self._add_thinking_process(text)
        
        return text
    
    def _introduce_natural_typo(self, text: str) -> str:
        """自然なタイポを導入"""
        typo_patterns = [
            ("です", "でs"),
            ("ありがとう", "ありがとう！"),
            ("よろしく", "よろしくー")
        ]
        
        for original, typo in typo_patterns:
            if original in text and random.random() < 0.5:
                text = text.replace(original, typo, 1)
                break
        
        return text
    
    def _add_thinking_process(self, text: str) -> str:
        """思考過程を追加"""
        thinking_patterns = [
            "実は最初は〇〇かなと思ったんですが、",
            "ちょっと悩んだんですけど、",
            "これは私の個人的な意見なんですが、"
        ]
        
        if "提案" in text and random.random() < 0.3:
            position = text.find("提案")
            pattern = random.choice(thinking_patterns)
            text = text[:position] + pattern + text[position:]
        
        return text
    
    async def _simulate_human_response_time(self) -> None:
        """人間的な返信時間をシミュレート"""
        # 10分〜120分のランダムな遅延（実際の実装では短縮）
        base_time = random.randint(10, 120)  # 分
        
        # デモ用に秒に変換（実際の運用では分単位）
        demo_time = base_time / 60  # 秒
        
        await asyncio.sleep(demo_time)
    
    def _analyze_relationship_stage(self, conversation_history: List[Dict]) -> str:
        """関係性の段階を分析"""
        message_count = len(conversation_history)
        
        if message_count <= 1:
            return "initial_contact"
        elif message_count <= 3:
            return "warming_up"
        elif any("価格" in msg.get("content", "") or "料金" in msg.get("content", "") for msg in conversation_history):
            return "price_negotiation"
        else:
            return "relationship_building"
    
    def _format_conversation_history(self, history: List[Dict]) -> str:
        """会話履歴をフォーマット"""
        formatted = []
        for i, msg in enumerate(history[-5:]):  # 最新5件
            sender = msg.get("sender", "不明")
            content = msg.get("content", "")
            formatted.append(f"{i+1}. {sender}: {content}")
        
        return "\n".join(formatted)
    
    def _get_stage_specific_instructions(self, stage: str) -> str:
        """段階別の指示を取得"""
        instructions = {
            "initial_contact": "興味を確認し、関係性を築く",
            "warming_up": "相手のことをもっと知り、親しみやすく",
            "price_negotiation": "具体的な条件を詰めていく",
            "relationship_building": "長期的な関係を視野に入れる"
        }
        return instructions.get(stage, "自然な対応を心がける")
    
    def _calculate_fair_price(self, stats: Dict[str, Any]) -> int:
        """適正価格を計算"""
        subscriber_count = stats.get("subscriber_count", 1000)
        engagement_rate = stats.get("engagement_rate", 3.0)
        
        # 基本価格: 登録者数 × 0.5円
        base_price = subscriber_count * 0.5
        
        # エンゲージメント率による補正
        engagement_multiplier = min(engagement_rate / 3.0, 2.0)
        
        final_price = int(base_price * engagement_multiplier)
        
        # 最小・最大価格の設定
        return max(min(final_price, 200000), 10000)
    
    def _determine_negotiation_strategy(
        self, 
        current_offer: int, 
        target_price: int, 
        calculated_price: int
    ) -> Dict[str, Any]:
        """交渉戦略を決定"""
        
        if current_offer <= target_price:
            # 予算内なので受け入れ
            return {
                "approach": "acceptance",
                "proposed_price": current_offer,
                "reasoning": "適正価格内での提案"
            }
        elif current_offer <= calculated_price * 1.2:
            # 適正価格の範囲内なので軽い交渉
            proposed = int((current_offer + target_price) / 2)
            return {
                "approach": "gentle_negotiation",
                "proposed_price": proposed,
                "reasoning": "双方にとって適正な価格での提案"
            }
        else:
            # 大幅に高いので説得力のある交渉
            proposed = max(target_price, calculated_price)
            return {
                "approach": "value_based_negotiation",
                "proposed_price": proposed,
                "reasoning": "市場価格と予算を考慮した現実的な提案"
            }
    
    def get_capabilities(self) -> List[str]:
        """エージェントの機能一覧"""
        return [
            "初回コンタクトメール生成",
            "価格交渉",
            "継続的な会話管理",
            "人間らしい文面作成",
            "関係性分析",
            "適正価格算出"
        ]