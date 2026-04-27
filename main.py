import os
import uvicorn
import json
import re
import time
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
MODELS = ["gemma-4-31b-it", "gemma-4-26b-a4b-it","gemma-3-27b-it",]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
client = genai.Client(api_key=API_KEY)

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
    # JSON以外のテキストが混じっている場合の抽出
    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    return cleaned

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"), headers={"Content-Type": "text/html; charset=utf-8"})

@app.get("/static/content/{path:path}")
async def get_content(path: str):
    full_path = os.path.join(STATIC_DIR, "content", path)
    if os.path.exists(full_path):
        return FileResponse(full_path, headers={"Content-Type": "text/plain; charset=utf-8"})
    return Response(status_code=404)

@app.post("/api/evaluate")
async def evaluate(request: Request):
    data = await request.json()
    category = data.get("category")
    params = data.get("params")

    base_template = load_text(os.path.join(SCRIPT_DIR, "prompt_body.txt"))
    category_instruction = load_text(os.path.join(SCRIPT_DIR, f"prompt_{category}.txt"))
    full_template = base_template.replace('{{CATEGORY_INSTRUCTION}}', category_instruction)
    
    prompt = full_template\
        .replace('{category}', str(category))\
        .replace('{bgColor}', str(params.get('bgColor')))\
        .replace('{textColor}', str(params.get('textColor')))\
        .replace('{titleColor}', str(params.get('titleColor')))\
        .replace('{cardColor}', str(params.get('cardColor')))\
        .replace('{titleSize}', str(params.get('titleSize')))\
        .replace('{fontSize}', str(params.get('fontSize')))\
        .replace('{lineHeight}', str(params.get('lineHeight')))\
        .replace('{padding}', str(params.get('padding')))\
        .replace('{layout}', str(params.get('layout')))\
        .replace('{imgSize}', str(params.get('imgSize')))

    last_error = ""
    for model_name in MODELS:
        try:
            response = client.models.generate_content(
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
            
            # 数値であることの保証
            score_val = result.get("score", 50)
            if isinstance(score_val, str):
                # "95点" や "score: 95" などのノイズを除去して数値化
                score_match = re.search(r'\d+', score_val)
                score_val = int(score_match.group(0)) if score_match else 50

            # プログラム側でグレードを判定
            final_grade = get_grade(score_val)

            return {
                "grade": final_grade,
                "score": score_val,
                "reasons": result.get("reasons", []),
                "advice": result.get("advice", ""),
                "model": model_name
            }
        except Exception as e:
            last_error = str(e)
            print(f"Model {model_name} failed: {last_error}")
            continue # 次のモデルへ
            
    return {
        "grade": "Error",
        "score": 0,
        "reasons": ["AI接続エラー"],
        "advice": "APIの利用制限またはモデルの読み込みに失敗しました。時間をおいて再度お試しください。"
    }

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
