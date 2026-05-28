import os
import asyncio
import uvicorn
import json
import re
from grade import get_grade
from fastapi import FastAPI, Response, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from google import genai
from google.genai import types
from dotenv import load_dotenv

# .envファイルから設定を読み込む
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

# --- モデル設定 ---
# 優先順位が高い順。もし上位が制限にかかっても、下位の高速モデルがカバーします。
MODELS = [
    "gemma-4-26b-a4b-it",
    "gemma-4-31b-it",
    "gemini-3.1-flash-lite",
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
client = genai.Client(api_key=API_KEY)

def resolve_api_key(key_index=None, custom_key=None):
    """keyIndex / customKey からAPIキーを決定し、対応するClientを返す"""
    if custom_key and isinstance(custom_key, str) and custom_key.strip():
        return genai.Client(api_key=custom_key.strip())
    if key_index and isinstance(key_index, int):
        env_key = os.getenv(f"GEMINI_API_KEY_{key_index}")
        if env_key:
            return genai.Client(api_key=env_key)
    return client  # フォールバック: 既存のGEMINI_API_KEY

app = FastAPI()
STATIC_DIR = os.path.join(SCRIPT_DIR, "static")

def load_text(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

def clean_json_string(text):
    """Markdown記法(```json ... ```)を除去する"""
    cleaned = text.strip()
    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    return cleaned

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"), headers={"Content-Type": "text/html; charset=utf-8"})

@app.get("/api/keys")
async def get_keys():
    """設定済みの環境変数キー一覧を返す（キーの値は返さない）"""
    keys = []
    i = 1
    while i <= 20:
        if os.getenv(f"GEMINI_API_KEY_{i}"):
            keys.append({"index": i, "label": f"APIキー {i}"})
        i += 1
    return {"keys": keys}

@app.get("/static/content/{path:path}")
async def get_content(path: str):
    full_path = os.path.join(STATIC_DIR, "content", path)
    if os.path.exists(full_path):
        return FileResponse(full_path, headers={"Content-Type": "text/plain; charset=utf-8"})
    return Response(status_code=404)

@app.post("/api/test")
async def test_connection(request: Request):
    """選択中のAPIキーで簡単なテスト投稿を行い、モデルの返答を返す"""
    data = await request.json()
    selected_client = resolve_api_key(
        key_index=data.get("keyIndex"),
        custom_key=data.get("customKey")
    )
    prompt = "これはAPIの接続テストです。「接続確認OK」とだけ日本語で返答してください。余計な文章は不要です。"
    model_order = data.get("modelOrder")
    models = model_order if (model_order and isinstance(model_order, list) and len(model_order) > 0) else MODELS
    rate_limited = False
    transient_error = False
    model_errors = []
    for attempt in range(2):
        for model_name in models:
            try:
                response = await asyncio.to_thread(
                    selected_client.models.generate_content,
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.0)
                )
                return {"ok": True, "message": response.text.strip(), "model": model_name, "rate_limited": False}
            except Exception as e:
                err_str = str(e)
                err_lower = err_str.lower()
                code_match = re.search(r'(\d{3})\s+([A-Z_]+)', err_str)
                code = code_match.group(1) if code_match else "???"
                kind = code_match.group(2) if code_match else "UNKNOWN"
                if '429' in err_lower or 'resource_exhausted' in err_lower or 'quota' in err_lower:
                    rate_limited = True
                    transient_error = True
                elif '500' in err_lower or 'internal' in err_lower:
                    transient_error = True
                model_errors.append({"model": model_name, "code": code, "kind": kind})
                print(f"Test model {model_name} failed (attempt {attempt+1}): {e}")
                continue
        if transient_error and attempt == 0:
            print("Transient error, retrying after 5s...")
            await asyncio.sleep(5)
            rate_limited = False
            transient_error = False
            model_errors = []
        else:
            break

    last = model_errors[-1] if model_errors else {"code": "???", "kind": "UNKNOWN"}
    error_causes = {
        "403": "アクセス権なし（Gemma利用規約未同意 または 組織ポリシーによる制限）",
        "429": "レート制限 / クォータ超過",
        "404": "モデルが存在しない（廃止された可能性）",
        "500": "APIサーバー内部エラー（一時的な障害）",
        "401": "APIキーが無効",
    }
    cause = error_causes.get(last["code"], "不明なエラー")
    return {
        "ok": False,
        "message": "全モデルで接続失敗",
        "model": "",
        "rate_limited": rate_limited,
        "error_code": last["code"],
        "error_kind": last["kind"],
        "error_cause": cause,
        "model_errors": model_errors
    }

@app.post("/api/evaluate")
async def evaluate(request: Request):
    data = await request.json()
    category = data.get("category")
    params = data.get("params")
    selected_client = resolve_api_key(
        key_index=data.get("keyIndex"),
        custom_key=data.get("customKey")
    )

    base_template = load_text(os.path.join(SCRIPT_DIR, "prompt_body.txt"))
    category_instruction = load_text(os.path.join(SCRIPT_DIR, f"prompt_{category}.txt"))
    full_template = base_template.replace('{{CATEGORY_INSTRUCTION}}', category_instruction)

    COLOR_NAME_MAP = {
        '#ffffff': '白', '#1e293b': '紺', '#94a3b8': '灰', '#86efac': '緑',
        '#93c5fd': '青', '#c4b5fd': '紫', '#fda4af': '赤', '#fdba74': '橙',
        '#fef08a': '黄', '#f5f5f4': '砂'
    }

    def get_color_name(hex_code):
        return COLOR_NAME_MAP.get(hex_code.lower(), hex_code)

    prompt = full_template\
        .replace('{category}', str(category))\
        .replace('{bgColor}', get_color_name(str(params.get('bgColor'))))\
        .replace('{textColor}', get_color_name(str(params.get('textColor'))))\
        .replace('{titleColor}', get_color_name(str(params.get('titleColor'))))\
        .replace('{cardColor}', get_color_name(str(params.get('cardColor'))))\
        .replace('{titleSize}', str(params.get('titleSize')))\
        .replace('{fontSize}', str(params.get('fontSize')))\
        .replace('{lineHeight}', str(params.get('lineHeight')))\
        .replace('{padding}', str(params.get('padding')))\
        .replace('{layout}', str(params.get('layout')))\
        .replace('{imgWidth}', str(params.get('imgWidth', '100%')))\
        .replace('{imgHeight}', str(params.get('imgHeight', '300px')))

    model_order = data.get("modelOrder")
    models = model_order if (model_order and isinstance(model_order, list) and len(model_order) > 0) else MODELS
    last_error = ""
    rate_limited = False
    transient_error = False
    for attempt in range(2):
        for model_name in models:
            try:
                response = await asyncio.to_thread(
                    selected_client.models.generate_content,
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        top_p=0.95,
                    )
                )

                raw_text = response.text
                clean_text = clean_json_string(raw_text)
                result = json.loads(clean_text)

                score_val = result.get("score", 50)
                if isinstance(score_val, str):
                    score_match = re.search(r'\d+', score_val)
                    score_val = int(score_match.group(0)) if score_match else 50

                final_grade = get_grade(score_val)

                return {
                    "grade": final_grade,
                    "score": score_val,
                    "reasons": result.get("reasons", []),
                    "advice": result.get("advice", ""),
                    "model": model_name,
                    "rate_limited": False
                }
            except Exception as e:
                last_error = str(e)
                err_str = last_error.lower()
                if '429' in err_str or 'resource_exhausted' in err_str or 'quota' in err_str:
                    rate_limited = True
                    transient_error = True
                elif '500' in err_str or 'internal' in err_str:
                    transient_error = True
                print(f"Model {model_name} failed (attempt {attempt+1}): {last_error}")
                continue
        if transient_error and attempt == 0:
            print(f"Transient error on {category}, retrying after 5s...")
            await asyncio.sleep(5)
            rate_limited = False
            transient_error = False
        else:
            break

    return {
        "grade": "Error",
        "score": 0,
        "reasons": ["AI接続エラー"],
        "advice": "APIの利用制限またはモデルの読み込みに失敗しました。時間をおいて再度お試しください。",
        "rate_limited": rate_limited
    }

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
