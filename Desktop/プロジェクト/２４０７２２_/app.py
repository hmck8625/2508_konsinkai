import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from io import BytesIO

st.title('データ分析アプリ')

# データ型の説明を追加
st.info("""
データ形式の説明:
- エクセルファイル (.xlsx) をアップロードしてください。
- ファイルには以下の列が必要です：
  1. 媒体 (文字列): 広告媒体名
  2. 日 (日付): YYYY-MM-DD 形式
  3. 表示回数 (整数): 広告の表示回数
  4. クリック数 (整数): 広告のクリック数
  5. 費用 (数値): 広告費用
  6. コンバージョン数 (整数): コンバージョン数
""")

# ファイルアップロード
uploaded_file = st.file_uploader("エクセルファイルをアップロードしてください", type="xlsx")

if uploaded_file is not None:
    try:
        # データ読み込み
        df = pd.read_excel(uploaded_file)
        
        # データの前処理
        df['日付'] = pd.to_datetime(df['日'])
        df['週'] = df['日付'].dt.to_period('W').astype(str)

        # 日別データの集計
        df_daily = df.groupby(['媒体', '日付']).agg({
            '表示回数': 'sum',
            'クリック数': 'sum',
            '費用': 'sum',
            'コンバージョン数': 'sum'
        }).reset_index()
        df_daily['CPA'] = df_daily['費用'] / df_daily['コンバージョン数'].replace(0, 1)  # 0で割るのを防ぐ

        # 週別データの集計
        df_weekly = df.groupby(['媒体', '週']).agg({
            '表示回数': 'sum',
            'クリック数': 'sum',
            '費用': 'sum',
            'コンバージョン数': 'sum'
        }).reset_index()
        df_weekly['CPA'] = df_weekly['費用'] / df_weekly['コンバージョン数'].replace(0, 1)  # 0で割るのを防ぐ

        # 分析期間の選択
        start_date = df['日付'].min()
        end_date = df['日付'].max()
        date_range = st.date_input(
            "分析期間を選択してください",
            [start_date, end_date],
            min_value=start_date,
            max_value=end_date
        )

        if len(date_range) == 2:
            df_daily_filtered = df_daily[(df_daily['日付'] >= pd.Timestamp(date_range[0])) & 
                                         (df_daily['日付'] <= pd.Timestamp(date_range[1]))]
            df_weekly_filtered = df_weekly[df_weekly['週'].isin(df['週'][(df['日付'] >= pd.Timestamp(date_range[0])) & 
                                                                        (df['日付'] <= pd.Timestamp(date_range[1]))])]

            # 分析タイプの選択
            analysis_type = st.radio(
                "分析タイプを選択してください",
                ('日別', '週別')
            )

            if analysis_type == '日別':
                df_filtered = df_daily_filtered
                x_axis = '日付'
            else:
                df_filtered = df_weekly_filtered
                x_axis = '週'

            # グラフ作成関数
            def create_stacked_bar(df, x, y, title):
                fig = go.Figure()
                for medium in df['媒体'].unique():
                    df_medium = df[df['媒体'] == medium]
                    fig.add_trace(go.Bar(x=df_medium[x], y=df_medium[y], name=medium))
                fig.update_layout(barmode='stack', title=title, xaxis_title=x, yaxis_title=y)
                return fig

            def create_line_chart(df, x, y, title):
                fig = go.Figure()
                for medium in df['媒体'].unique():
                    df_medium = df[df['媒体'] == medium]
                    fig.add_trace(go.Scatter(x=df_medium[x], y=df_medium[y], mode='lines+markers', name=medium))
                fig.update_layout(title=title, xaxis_title=x, yaxis_title=y)
                return fig

            # グラフ表示
            st.subheader(f"{analysis_type}分析結果")

            # Cost推移
            fig_cost = create_stacked_bar(df_filtered, x_axis, '費用', f'媒体別の{analysis_type}Cost推移')
            st.plotly_chart(fig_cost)

            # Install推移
            fig_install = create_stacked_bar(df_filtered, x_axis, 'コンバージョン数', f'媒体別の{analysis_type}Install推移')
            st.plotly_chart(fig_install)

            # CPA推移
            fig_cpa = create_line_chart(df_filtered, x_axis, 'CPA', f'媒体別の{analysis_type}CPA推移')
            st.plotly_chart(fig_cpa)

    except Exception as e:
        st.error(f"エラーが発生しました: {str(e)}")
        st.error("正しい形式のエクセルファイルをアップロードしてください。")

else:
    st.info("エクセルファイルをアップロードしてください。")