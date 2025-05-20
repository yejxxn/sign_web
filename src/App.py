from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import glob
import os

app = Flask(__name__)
CORS(app)

# NIKL 데이터 로드
def load_nikl_data(json_dir="/Volumes/T7/yejoon/ksl/NIKL_Sign Language Parallel Corpus 2022_sp_10"):
    json_files = glob.glob(os.path.join(json_dir, "*.json"))
    word_map = {}
    for file in json_files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                korean_text = data.get("krlgg_sntenc", {}).get("koreanText", "")
                sign_text = data.get("sign_lang_sntenc", "")
                if korean_text and sign_text:
                    sign_words = sign_text.split('/')
                    sign_words = [w.strip() for w in sign_words if w.strip()]
                    for w in korean_text.split():
                        for sw in sign_words:
                            if w in sw or sw in w:
                                word_map[w] = sw
        except Exception as e:
            print(f"Error loading {file}: {e}")
    return word_map

word_map = load_nikl_data()

@app.route('/')
def home():
    return "Flask 서버가 정상 실행 중입니다!"

def analyze_pattern(user_order, target_words):
    errors = []
    feedback = ""
    verbs = ["해결", "말해주다", "원하다", "알려주다"]
    time_words = ["지금", "부터", "2시간", "안", "계속", "언제"]
    has_correct_word = any(user_word == target_word for user_word, target_word in zip(user_order, target_words))
    
    if user_order == target_words:
        return "정확해요! 잘했어요!"
    
    user_last = user_order[-1] if user_order else ""
    if target_words[-1] in verbs and user_last not in verbs:
        errors.append("동사 위치 오류")
        feedback += f"동사는 문장 끝에 와야 해요! 마지막에 '{target_words[-1]}'를 넣어보세요.\n"
    elif target_words[-1] not in verbs and user_last != target_words[-1]:
        errors.append("마지막 단어 오류")
        feedback += f"마지막 단어가 틀렸어요. '{target_words[-1]}'를 끝에 넣어보세요!\n"
    
    if any(t in target_words for t in time_words):
        if any(t in user_order[-2:] for t in time_words) and not any(t in user_order[:2] for t in time_words):
            errors.append("시간 단어 오류")
            feedback += "시간 단어(예: '지금', '부터')는 문장 처음에 와야 합니다.\n"
    
    if len(user_order) != len(target_words):
        errors.append("단어 개수 오류")
        feedback += "단어 개수가 맞지 않아요. 다시 확인해보세요!\n"
    
    if errors:
        feedback += "다시 시도해보세요!"
    elif has_correct_word:
        feedback = "몇 개는 맞았어요! 순서를 다시 확인해보세요."
    else:
        feedback = "다시 시도해보세요!"
    return feedback.strip()

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        print("받은 데이터:", data)
        user_order = data.get('userOrder', [])
        target_words = data.get('targetWords', [])
        feedback = analyze_pattern(user_order, target_words)
        return jsonify({"feedback": feedback})
    except Exception as e:
        print("에러:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        sentence = data.get('sentence', '').strip()
        if not sentence:
            return jsonify({"error": "문장을 입력해주세요!"}), 400
        
        words = sentence.split()
        predicted = []
        verbs = ["해결", "말해주다", "원하다", "알려주다"]
        time_words = ["지금", "부터", "2시간", "안", "계속", "언제"]
        verb_found = None
        
        for word in words:
            value = word_map.get(word, None)
            if value in time_words and value not in predicted:
                predicted.append(value)
        
        for word in words:
            value = word_map.get(word, None)
            if value and value not in time_words and value not in verbs and value not in predicted:
                predicted.append(value)
        
        for word in words:
            value = word_map.get(word, None)
            if value in verbs:
                verb_found = value
        if verb_found and verb_found not in predicted:
            predicted.append(verb_found)
        
        return jsonify({"words": predicted if predicted else ["알 수 없는 문장입니다"]})
    except Exception as e:
        print("에러:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=True)