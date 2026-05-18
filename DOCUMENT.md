# 見やすいWebページを作ろう — 仕様・解説ドキュメント

---

## 目次

1. [ゲーム概要](#1-ゲーム概要)
2. [ゲームの目的と教育的意義](#2-ゲームの目的と教育的意義)
3. [ゲームの流れ](#3-ゲームの流れ)
4. [デザインパラメータ仕様](#4-デザインパラメータ仕様)
5. [AI評価システム](#5-ai評価システム)
6. [プロジェクト構成](#6-プロジェクト構成)
7. [フロントエンド設計](#7-フロントエンド設計)
8. [バックエンド設計](#8-バックエンド設計)
9. [技術スタック](#9-技術スタック)
10. [デプロイ・環境構築](#10-デプロイ環境構築)

---

## 1. ゲーム概要

**タイトル:** 見やすいWebページを作ろう  
**サブタイトル:** Gemma があなたのデザインを分析する体験型ゲーム

このゲームは、**Webデザインの基本原則をインタラクティブに学ぶ教育型ゲーム**です。  
プレイヤーは色・フォント・余白・レイアウトなどのデザインパラメータを自由に操作して「架空のWebページ」を作成し、AIがそのデザインを多角的に評価します。

評価結果とAIのアドバイスを通じて、「なぜ読みやすいデザインが良いのか」をゲーム感覚で体験的に理解できます。

---

## 2. ゲームの目的と教育的意義

### 学習目標

| 学習項目 | 内容 |
|----------|------|
| **視認性** | 色の対比（コントラスト）がテキストの読みやすさに与える影響 |
| **レイアウト** | 余白・文字揃え・情報の階層構造がUXに与える影響 |
| **認知負荷** | デザインの複雑さが読者の理解しやすさに与える影響 |

### なぜゲーム形式か

Webデザインの善し悪しは、テキストで説明されても実感しにくい抽象的な概念です。  
このゲームでは「自分でパラメータを動かして → リアルタイムで変化を確認 → AIに採点してもらう」というサイクルで、読みやすさの原則を**体験として**習得できます。

---

## 3. ゲームの流れ

```
タイトル画面
    ↓ スタート！ボタン
遊び方説明画面
    ↓ ゲームを始めるボタン
ゲーム画面（デザイン編集 + リアルタイムプレビュー）
    ↓ AI診断を開始！ボタン
評価画面（AI採点 + レーダーチャート表示）
    ↓ 用語・技術の解説ボタン
解説画面（デザイン理論・AI技術の説明）
```

### 各画面の詳細

#### タイトル画面 (`page-title`)
- ゲームタイトルとサブタイトルを表示
- APIの接続状態バッジ（接続確認中 → 準備完了）
- スタートボタンでゲームを開始

#### 遊び方説明画面 (`page-how-to`)
- ゲームルールの説明
- 評価基準（視認性・構成・認知負荷）の概要

#### ゲーム画面 (`page-game`)
- 左パネル：デザイン調整コントロール（14種類のパラメータ）
- 右パネル：リアルタイムプレビュー
- ゲーム開始時にデザインはランダム初期化される

#### 評価画面 (`page-evaluation`)
- ゲーム画面のプレビューをミニ表示
- 3カテゴリのAI評価カード（視認性・構成・認知負荷）
- レーダーチャートによるスコア可視化
- 総合スコア表示

#### 解説画面 (`page-explanation`)
- デザイン原則の解説（認知負荷・ゲシュタルト原則など）
- AI技術の解説（Transformer、言語モデルなど）
- プロンプトエンジニアリングの解説
- デザイン改善ヒント集

---

## 4. デザインパラメータ仕様

プレイヤーが操作できるデザイン要素は以下の14種類です。

### カラー設定（6項目）

カラーパレットは10色のソフトカラーから選択します。

| パラメータ名 | 対象 | カラーパレット |
|------------|------|--------------|
| `bgColor` | 背景色 | 白 `#ffffff`、紺 `#1e293b`、灰 `#94a3b8`、緑 `#86efac`、青 `#93c5fd`、紫 `#c4b5fd`、赤 `#fda4af`、橙 `#fdba74`、黄 `#fef08a`、砂 `#f5f5f4` |
| `textColor` | 本文テキスト色 | 同上 |
| `titleColor` | タイトルテキスト色 | 同上 |
| `cardColor` | カード背景色 | 同上 |
| `cardTitleColor` | カードタイトル色 | 同上 |
| `cardTextColor` | カード本文色 | 同上 |

### タイポグラフィ設定（5項目）

5段階スライダーで調整します（表示ラベル: 極小・小・標準・大・最大）。

| パラメータ名 | 対象 | 選択肢（5段階） |
|------------|------|---------------|
| `titleSize` | タイトルサイズ | 24px / 32px / 48px / 64px / 80px |
| `fontSize` | 本文サイズ | 14px / 16px / 20px / 24px / 32px |
| `lineHeight` | 行間 | 1.2 / 1.4 / 1.7 / 2.1 / 2.6 |
| `cardTitleSize` | カードタイトルサイズ | 16px / 20px / 24px / 28px / 36px |
| `cardFontSize` | カード本文サイズ | 14px / 16px / 20px / 24px / 32px |

### レイアウト設定（3項目）

| パラメータ名 | 対象 | 選択肢 |
|------------|------|--------|
| `layout` | テキスト揃え | left（左）/ center（中央）/ right（右） |
| `padding` | 余白 | 15px / 30px / 60px / 100px / 150px |
| `imgWidth` | 画像幅 | 30% / 50% / 70% / 90% / 100% |
| `imgHeight` | 画像高さ | 100px / 200px / 300px / 450px / 600px |

### デフォルト値

```javascript
{
    bgColor: '#ffffff',       // 白背景
    textColor: '#1e293b',     // 濃い紺
    titleColor: '#0f172a',    // より濃い紺
    cardColor: '#f1f5f9',     // 薄灰
    cardTitleColor: '#0f172a',
    cardTextColor: '#475569',
    titleSize: '48px',
    fontSize: '20px',
    lineHeight: '1.7',
    imgWidth: '100%',
    imgHeight: '300px',
    cardTitleSize: '24px',
    cardFontSize: '20px',
    layout: 'center',
    padding: '60px'
}
```

---

## 5. AI評価システム

### 評価カテゴリ

AIは3つの観点からデザインを独立して評価します。

| カテゴリID | 日本語名 | 評価内容 |
|-----------|---------|---------|
| `visibility` | 視認性 | 背景色とテキスト色のコントラスト比、WCAGアクセシビリティ基準 |
| `layout` | 構成 | 情報の階層構造、余白の活用、テキスト揃えのUX効果 |
| `cognitive` | 認知負荷 | デザインの統一感、読者が感じる精神的な負担の大きさ |

### グレード判定基準

評価はスコア（0〜100点）とグレード（S〜D）で表されます。

```python
# grade.py
def get_grade(score):
    if score >= 90: return "S"   # 卓越 — プロレベルの読みやすさ
    elif score >= 80: return "A" # 優秀 — 細かい改善の余地あり
    elif score >= 70: return "B" # 良好 — 一部バランスが崩れている
    elif score >= 60: return "C" # 普通 — 読みにくい箇所がある
    else: return "D"             # 要改善 — 読むのが困難
```

### 評価フロー

```
フロントエンド（app.js）
    ↓ POST /api/evaluate  { category, params }
バックエンド（main.py）
    ↓ prompt_body.txt + prompt_{category}.txt を結合
    ↓ デザインパラメータを日本語に変換してプロンプトに埋め込み
Gemma AIモデル（優先順位: gemma-4-31b-it → gemma-4-26b-a4b-it → gemma-3-27b-it）
    ↓ JSON形式で評価結果を返答
バックエンド（main.py）
    ↓ Markdown記法を除去 → JSONパース → grade.pyでグレード判定
フロントエンド
    ↓ 評価カードにグレード・理由・アドバイスを表示
    ↓ レーダーチャートを更新（Chart.js）
```

3カテゴリの評価は**並列で実行**（`Promise.all`）されるため、評価時間を最小化しています。

### AIレスポンス形式

```json
{
    "grade": "A",
    "score": 82,
    "reasons": ["背景と文字のコントラストが十分", "余白が適切に確保されている"],
    "advice": "カードの背景色をさらに明るくすると視認性が向上します。",
    "model": "gemma-4-31b-it"
}
```

### モデルフォールバック

APIの制限やモデルの一時的な障害に備え、3つのモデルを優先順位順に試みます。  
すべて失敗した場合はエラーメッセージを返します。

---

## 6. プロジェクト構成

```
web-geme/
├── main.py                  # FastAPI サーバー本体・APIエンドポイント
├── grade.py                 # グレード判定ロジック
├── requirements.txt         # Python依存パッケージ
├── .env                     # 環境変数（APIキー等）※非公開
├── vercel.json              # Vercel デプロイ設定
├── prompt_body.txt          # AIプロンプト共通テンプレート
├── prompt_visibility.txt    # 視認性評価プロンプト
├── prompt_layout.txt        # 構成評価プロンプト
├── prompt_cognitive.txt     # 認知負荷評価プロンプト
└── static/
    ├── index.html           # エントリーポイント（最小HTML）
    ├── css/
    │   ├── base.css         # 共通スタイル・CSS変数
    │   ├── title.css        # タイトル画面スタイル
    │   ├── howto.css        # 遊び方画面スタイル
    │   ├── game.css         # ゲーム画面スタイル
    │   ├── preview.css      # プレビューエリアスタイル
    │   ├── evaluation.css   # 評価画面スタイル
    │   └── explanation.css  # 解説画面スタイル
    ├── js/
    │   ├── app.js           # メインアプリケーションロジック（400行）
    │   ├── evaluator.js     # AI評価・レーダーチャート（70行）
    │   └── config.js        # デザインパラメータ定数定義（35行）
    ├── pages/
    │   ├── title.html       # タイトルページHTML断片
    │   ├── how-to.html      # 遊び方ページHTML断片
    │   ├── game.html        # ゲームページHTML断片
    │   ├── evaluation.html  # 評価ページHTML断片
    │   └── explanation.html # 解説ページHTML断片
    └── img/
        └── hero.png         # プレビュー用サンプル画像
```

---

## 7. フロントエンド設計

### アーキテクチャの特徴

フロントエンドは **SPA（Single Page Application）** として動作します。  
`index.html` は最小限のHTMLのみを持ち、`app.js` が起動時に5つのHTMLページ断片を動的にロードして結合します。

```
index.html（シェル）
    ↓ DOMContentLoaded
app.js（エントリーポイント）
    ↓ fetch: static/pages/title.html
    ↓ fetch: static/pages/how-to.html
    ↓ fetch: static/pages/game.html
    ↓ fetch: static/pages/evaluation.html
    ↓ fetch: static/pages/explanation.html
    → #page-container に全ページを結合して挿入
```

### 状態管理

アプリケーションの状態は `state` オブジェクト1つに集約されています。

```javascript
const state = {
    designParams: { ...DEFAULTS },  // 現在のデザイン設定（14パラメータ）
    radarChart: null,               // Chart.jsのインスタンス参照
    scores: {                       // AIスコア（評価後に更新）
        visibility: 0,
        layout: 0,
        cognitive: 0
    }
};
```

### ページ遷移

CSSクラスの付け外しで画面を切り替えます（実際のページ遷移なし）。

```javascript
function navigateTo(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
```

### モジュール構成

ES6モジュール（`import/export`）を使用して責務を分離しています。

| ファイル | 責務 |
|---------|------|
| `config.js` | デザインパラメータの定数・マッピング定義のみ |
| `evaluator.js` | コントラスト計算・レーダーチャート・API通信 |
| `app.js` | ページロード・状態管理・UI制御・評価オーケストレーション |

### リアルタイムプレビュー

スライダーやカラーボタンの操作のたびに `updatePreview()` が呼ばれ、`applyDesignToElement()` がプレビューDOMに直接CSSを適用します。フレームワークなしの純粋なDOM操作です。

### UIデザイン

- **グラスモーフィズム**（`backdrop-filter: blur`）を多用したモダンなUI
- CSS変数によるテーマ管理
- レスポンシブグリッドレイアウト（ゲーム画面のコントロール+プレビュー）
- ローディングスピナーアニメーション

---

## 8. バックエンド設計

### FastAPIサーバー（`main.py`）

```python
app = FastAPI()

# 静的ファイル配信
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# エントリーポイント
@app.get("/")
async def read_index() -> FileResponse

# AI評価エンドポイント
@app.post("/api/evaluate")
async def evaluate(request: Request) -> dict
```

### `/api/evaluate` エンドポイントの処理

1. リクエストから `category`（評価カテゴリ）と `params`（デザインパラメータ）を取得
2. `prompt_body.txt` と `prompt_{category}.txt` を読み込み、プロンプトを組み立て
3. HEXカラーコードを日本語名（白・紺・灰…）に変換してプロンプトに埋め込み
4. Gemma AIモデルを呼び出し（フォールバック付き）
5. AIの返答からJSON部分を正規表現で抽出・パース
6. `grade.py` でスコアをグレードに変換
7. 結果を返却

### プロンプト設計

評価プロンプトは共通部分（`prompt_body.txt`）とカテゴリ別指示（`prompt_{category}.txt`）に分離されています。

```
prompt_body.txt
  ↓ {{CATEGORY_INSTRUCTION}} を置換
prompt_visibility.txt / prompt_layout.txt / prompt_cognitive.txt
  ↓ {bgColor}, {textColor}, {titleSize}... を置換
最終プロンプト
```

AIには以下のJSON形式で回答するよう指示されています。

```json
{
    "score": 0〜100の整数,
    "reasons": ["評価ポイント1", "評価ポイント2"],
    "advice": "改善アドバイスの文章"
}
```

グレード（S/A/B/C/D）はAIには判定させず、`grade.py` がスコアから計算します（AIのグレード出力のばらつきを防ぐため）。

### JSONパース堅牢化

AIが返す文章にMarkdown記法（\`\`\`json ... \`\`\`）が混じる場合があるため、正規表現でJSON部分のみを抽出します。

```python
def clean_json_string(text):
    cleaned = text.strip()
    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    return cleaned
```

---

## 9. 技術スタック

### バックエンド

| 技術 | 役割 |
|------|------|
| **Python 3** | サーバーサイド言語 |
| **FastAPI** | 非同期Webフレームワーク |
| **Uvicorn** | ASGIサーバー |
| **Google GenAI SDK** | Gemma APIクライアント |
| **python-dotenv** | 環境変数管理 |

### フロントエンド

| 技術 | 役割 |
|------|------|
| **HTML5** | セマンティックマークアップ |
| **CSS3** | グラスモーフィズムUI、CSS変数、レスポンシブ |
| **JavaScript (ES6)** | モジュール、非同期処理（async/await）、DOM操作 |
| **Chart.js** | レーダーチャートの描画 |
| **Google Fonts** | Inter / Noto Sans JP フォント |

### インフラ・デプロイ

| 技術 | 役割 |
|------|------|
| **Vercel** | クラウドデプロイ（serverless Python対応） |
| **Google AI** | Gemma モデルのホスティング・API提供 |

---

## 10. デプロイ・環境構築

### ローカル開発環境の起動

```bash
# 依存パッケージのインストール
pip install -r requirements.txt

# 環境変数の設定（.env ファイルを作成）
echo "GEMINI_API_KEY=your_api_key_here" > .env

# サーバー起動
python main.py
# → http://localhost:8001 でアクセス可能
```

### 必要な環境変数

| 変数名 | 内容 | 必須 |
|--------|------|------|
| `GEMINI_API_KEY` | Google AI Studio で取得したAPIキー | 必須 |
| `PORT` | サーバーポート番号（デフォルト: 8001） | 任意 |

### Vercelへのデプロイ

`vercel.json` が設定済みのため、Vercel CLIまたはGitHub連携でデプロイできます。

```json
{
    "builds": [{"src": "main.py", "use": "@vercel/python"}],
    "routes": [{"src": "/(.*)", "dest": "main.py"}]
}
```

### requirements.txt

```
fastapi
uvicorn
google-genai
python-dotenv
pydantic
```
