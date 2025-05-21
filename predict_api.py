from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import json
import re
import traceback
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

try:
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    print("Gemini initialized with gemini-1.5-flash")
except Exception as e:
    print(f"Failed to initialize gemini-1.5-flash: {e}")
    try:
        gemini_model = genai.GenerativeModel("gemini-pro")
        print("Fallback to gemini-pro")
    except Exception as e2:
        print(f"Fallback failed: {e2}")
        gemini_model = None

def analyze_sentence_with_gemini(sentence, max_retries=2):
    if gemini_model is None:
        print("Gemini model not initialized")
        return []
    for attempt in range(max_retries + 1):
        try:
            print(f"Attempt {attempt + 1}: Sending Gemini request for: {sentence}")
            prompt = (
                f'한국어 문장을 수어 어순으로 분석해. '
                f'수어 어순은 시간, 주어, 장소, 목적어, 동사, 부사, 질문, 이유 순으로 배열됨. '
                f'문장을 단어 단위로 분해하고, 각 단어를 위 어순에 맞게 재배열해 JSON 배열로 반환. '
                f'- 시간: 언제(예: "어제", "오늘") '
                f'- 주어: 누가(예: "민지") '
                f'- 장소: 어디서(예: "도서관") '
                f'- 목적어: 무엇을(예: "책") '
                f'- 동사: 어떤 행동(예: "읽다") '
                f'- 부사: 어떻게(예: "조용히") '
                f'- 질문: 육하원칙 질문(예: "왜") '
                f'- 이유: 왜 그런지(예: "시험 준비 때문") '
                f'불필요한 조사(가, 을 등)는 제외, 동사는 기본형 사용(예: "읽었다" → "읽다"). '
                f'빈 배열이나 잘못된 형식은 반환하지 마. '
                f'예: "민지가 어제 도서관에서 책을 조용히 읽은 이유는 시험 준비 때문이야" '
                f'→ ["어제", "민지", "도서관", "책", "읽다", "조용히", "왜", "시험 준비 때문"] '
                f'문장: {sentence} '
                f'반드시 JSON 배열로 반환.'
            )
            response = gemini_model.generate_content(prompt)
            cleaned_content = re.sub(r'```json\n|```', '', response.text).strip()
            print(f"Attempt {attempt + 1}: Cleaned response: {cleaned_content}")
            result = json.loads(cleaned_content)
            if isinstance(result, list) and result:
                print(f"Attempt {attempt + 1}: Gemini extracted words: {result}")
                return result
            print(f"Attempt {attempt + 1}: Invalid response format")
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries:
                print("Max retries reached")
                return []
    return []

@app.route('/predict', methods=['POST'])
def predict():
    try:
        print("Received request to /predict")
        data = request.get_json()
        if not data:
            print("No JSON data received")
            return jsonify({"error": "No JSON data provided"}), 400
        sentence = data.get('sentence', '').strip()
        print(f"Processing sentence: {sentence}")
        if not sentence:
            print("Empty sentence received")
            return jsonify({"error": "문장을 입력해주세요!"}), 400
        
        words = analyze_sentence_with_gemini(sentence)
        print(f"Gemini predicted words: {words}")
        
        if not words:
            print("No valid words predicted")
            return jsonify({"error": "알 수 없는 문장입니다"}), 400
        
        print(f"Final predicted words: {words}")
        return jsonify({"words": words})
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)
