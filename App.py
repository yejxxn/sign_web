from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
# CORS 설정: 프론트엔드 도메인(예: CloudFront URL) 추가 예정
CORS(app, resources={r"/*": {"origins": "*"}})  # 임시로 모든 도메인 허용

# 수어 어순 분석 로직
def analyze_pattern(user_order, target_words):
    feedback = ""
    verbs = ["해결", "말해주다", "원하다", "알려주다"]
    time_words = ["지금", "부터", "2시간", "안", "계속", "언제"]
    
    if user_order == target_words:
        return "정확해요! 잘했어요!"
    
    user_last = user_order[-1] if user_order else ""
    if target_words[-1] in verbs and user_last not in verbs:
        feedback += f"동사는 문장 끝에 와야 해요! 마지막에 '{target_words[-1]}'를 넣어보세요.\n"
    elif target_words[-1] not in verbs and user_last != target_words[-1]:
        feedback += f"마지막 단어가 틀렸어요. '{target_words[-1]}'를 끝에 넣어보세요!\n"
    
    if any(t in target_words for t in time_words):
        if any(t in user_order[-2:] for t in time_words) and not any(t in user_order[:2] for t in time_words):
            feedback += "시간 단어(예: '지금', '부터')는 문장 처음에 와야 합니다.\n"
    
    if len(user_order) != len(target_words):
        feedback += "단어 개수가 맞지 않아요. 다시 확인해보세요!\n"
    
    if feedback:
        feedback += "다시 시도해보세요!"
    else:
        feedback = "몇 개는 맞았어요! 순서를 다시 확인해보세요."
    return feedback.strip()

@app.route('/')
def home():
    return "Flask 서버가 정상 실행 중입니다!"

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        user_order = data.get('userOrder', [])
        target_words = data.get('targetWords', [])
        if not user_order or not target_words:
            return jsonify({"error": "userOrder or targetWords missing"}), 400
        feedback = analyze_pattern(user_order, target_words)
        return jsonify({"feedback": feedback})
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        sentence = data.get('sentence', '').strip()
        if not sentence:
            return jsonify({"error": "문장을 입력해주세요!"}), 400
        
        # 간단한 규칙 기반 예측 (시간 → 기타 → 동사)
        words = sentence.split()
        predicted = []
        verbs = ["해결", "말해주다", "원하다", "알려주다"]
        time_words = ["지금", "부터", "2시간", "안", "계속", "언제"]
        
        # 시간 단어 먼저
        for word in words:
            if word in time_words and word not in predicted:
                predicted.append(word)
        
        # 기타 단어
        for word in words:
            if word not in time_words and word not in verbs and word not in predicted:
                predicted.append(word)
        
        # 동사 마지막
        for word in words:
            if word in verbs and word not in predicted:
                predicted.append(word)
        
        return jsonify({"words": predicted if predicted else ["알 수 없는 문장입니다"]})
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5001))  # AWS에서 포트 동적 설정 가능
    app.run(host='0.0.0.0', port=port, debug=True)