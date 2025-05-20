import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// 단어별 영상 매핑 객체
const videoMapping = {
  "지금": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/now.mp4",
  "부터": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/from.mp4",
  "2시간": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/two-hours.mp4",
  "안": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/within.mp4",
  "해결": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/solve.mp4",
  "꼭": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/must.mp4",
  "핸드폰": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/phone.mp4",
  "번호": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/number.mp4",
  "말해주다": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/tell.mp4",
  "원하다": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/want.mp4",
  "언제": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/when.mp4",
  "안돼": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/not-working.mp4",
  "계속": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/continuously.mp4",
  "불편": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/inconvenient.mp4",
  "크다": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/big.mp4",
  "이름": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/name.mp4",
  "전화번호": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/phone-number.mp4",
  "알려주다": "https://my-signlanguage-videos-2025.s3.ap-northeast-2.amazonaws.com/videos/inform.mp4",
};

function App() {
  const [screen, setScreen] = useState("홈");
  const [category, setCategory] = useState(null);
  const [targetWords, setTargetWords] = useState([]);
  const [targetSentence, setTargetSentence] = useState("");
  const [shuffledWords, setShuffledWords] = useState([]);
  const [userOrder, setUserOrder] = useState([]);
  const [timer, setTimer] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const [hintWord, setHintWord] = useState(null);
  const [wrongAttempts, setWrongAttempts] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [acquiredSentence, setAcquiredSentence] = useState("");
  const [inputSentence, setInputSentence] = useState("");
  const [predictedWords, setPredictedWords] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    preferredTime: "",
    schedule: "",
    complaintScore: ""
  });
  const [customerInfoError, setCustomerInfoError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);

  const storyData = {
    "SXPAKOKS220760950": { "question": "작업 완료까지 얼마나 걸릴까요?", "sentence": "지금부터 두 시간 안에 했으면 좋겠어요", "words": ["지금", "부터", "2시간", "안", "해결", "꼭"] },
    "SXPAKOKS220761050": { "question": "연락처 좀 남겨주시겠어요?", "sentence": "네 제 번호 말씀드리겠습니다", "words": ["핸드폰", "번호", "말해주다"] },
    "SXPAKOKS220761350": { "question": "방문 일정 잡을 수 있을까요?", "sentence": "언제가 편하신가요", "words": ["원하다", "언제"] },
    "SXPAKOKS220761650": { "question": "얼마나 오래 이런 문제가 있었나요?", "sentence": "네 계속 안돼서 많이 불편했어요", "words": ["안돼", "계속", "불편", "크다"] },
    "SXPAKOKS220761750": { "question": "고객님 성함과 번호 확인 부탁드립니다.", "sentence": "예 제 이름과 전화번호를 말씀드리겠습니다", "words": ["이름", "전화번호", "말해주다"] }
  };

  const categories = {
    "명사": ["핸드폰", "번호", "전화번호", "이름"],
    "감정": ["불편"],
    "시간": ["지금", "부터", "2시간", "언제"],
    "행동": ["해결", "말해주다", "원하다"],
    "형용사/부사": ["크다", "안", "꼭", "계속"]
  };

  const excludeKeys = [];
  const pages = Object.entries(storyData)
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([, value]) => value);

  const clueMessages = [
    "작업 2시간 내로 해결할 것",
    "010-1234-5678",
    "4월 16일",
    "불만 점수: 9/10",
    "Annie"
  ];

  useEffect(() => {
    if ((screen === "게임" || screen === "customer-info") && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && (screen === "게임" || screen === "customer-info")) {
      setFeedback("시간 초과! 처음으로 돌아갑니다");
      setTimeout(() => {
        resetGame();
        setScreen("홈");
      }, 3000);
    }
  }, [screen, timer]);

  useEffect(() => {
    if (acquiredSentence) {
      const timeout = setTimeout(() => {
        setAcquiredSentence("");
        nextPage();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [acquiredSentence]);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const resetGame = () => {
    setTargetWords([]);
    setTargetSentence("");
    setShuffledWords([]);
    setUserOrder([]);
    setTimer(0);
    setPageIdx(0);
    setHintWord(null);
    setWrongAttempts([]);
    setFeedback("");
    setAcquiredSentence("");
    setCustomerInfo({
      name: "",
      phone: "",
      preferredTime: "",
      schedule: "",
      complaintScore: ""
    });
    setCustomerInfoError("");
    setFailedAttempts(0);
  };

  const startLearning = (cat) => {
    console.log("선택된 카테고리:", cat);
    setCategory(cat);
    setScreen("학습");
  };

  const startGame = () => {
    setScreen("게임");
    setTimer(180);
    setTargetWords(pages[0].words);
    setTargetSentence(pages[0].sentence);
    setShuffledWords(shuffleArray(pages[0].words));
    setUserOrder(Array(pages[0].words.length).fill(null));
    setPageIdx(0);
    setFeedback("");
    setAcquiredSentence("");
    setFailedAttempts(0);
  };

  const handleDragStart = (e, word) => {
    e.dataTransfer.setData("text", word);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const word = e.dataTransfer.getData("text");
    const newOrder = [...userOrder];
    newOrder[index] = word;
    setUserOrder(newOrder);
  };

  const handleReset = () => {
    setUserOrder(Array(targetWords.length).fill(null));
    setFeedback("");
    setAcquiredSentence("");
  };

  const checkAnswer = async () => {
    const filteredUserOrder = userOrder.filter(word => word !== null);
    const userSentence = filteredUserOrder.join(" ");
    const correctSentence = targetWords.join(" ");
    if (userSentence === correctSentence) {
      setFeedback("");
      setAcquiredSentence(clueMessages[pageIdx]);
    } else {
      const attempt = { userOrder: filteredUserOrder, targetWords, timestamp: Date.now() };
      setWrongAttempts([...wrongAttempts, attempt]);
      setAcquiredSentence("");
      await analyzePattern(attempt);
    }
  };

  const analyzePattern = async (attempt) => {
    try {
      const response = await axios.post('http://localhost:5001/analyze', {
        userOrder: attempt.userOrder,
        targetWords: attempt.targetWords
      });
      setFeedback(response.data.feedback);
    } catch (error) {
      console.error("피드백 오류:", error);
      setFeedback("문제가 발생했어요. 다시 시도해주세요!");
    }
  };

  const nextPage = () => {
    if (pageIdx < pages.length - 1) {
      setPageIdx(pageIdx + 1);
      setTargetWords(pages[pageIdx + 1].words);
      setTargetSentence(pages[pageIdx + 1].sentence);
      setShuffledWords(shuffleArray(pages[pageIdx + 1].words));
      setUserOrder(Array(pages[pageIdx + 1].words.length).fill(null));
      setFeedback("");
      setAcquiredSentence("");
    } else {
      setScreen("customer-info");
    }
  };

  const predictSignOrder = async () => {
    if (!inputSentence.trim()) {
      setFeedback("문장을 입력해주세요!");
      return;
    }
    try {
      console.log("Sending request to /predict with sentence:", inputSentence);
      const response = await axios.post('http://localhost:5002/predict', {
        sentence: inputSentence
      }, {
        timeout: 10000
      });
      console.log("Received response:", response.data);
      setPredictedWords(response.data.words || []);
      setFeedback("");
    } catch (error) {
      console.error("Prediction error:", error);
      if (error.response) {
        setFeedback(error.response.data?.error || "서버 오류 발생");
      } else if (error.request) {
        setFeedback("서버에 연결할 수 없습니다");
      } else {
        setFeedback("알 수 없는 오류");
      }
      setPredictedWords([]);
    }
  };

  const resetPrediction = () => {
    setInputSentence("");
    setPredictedWords([]);
    setFeedback("");
  };

  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  const submitCustomerInfo = () => {
    const { name, phone, preferredTime, schedule, complaintScore } = customerInfo;
    const normalizedName = name.trim().toLowerCase();
    const normalizedSchedule = schedule.trim().replace(/\s+/g, '');
    if (
      (normalizedName === "annie") &&
      phone.trim() === "010-1234-5678" &&
      preferredTime.trim() === "2시간" &&
      (normalizedSchedule === "4월16일" || normalizedSchedule === "4월16일") &&
      complaintScore.trim() === "9"
    ) {
      setCustomerInfoError("");
      setScreen("congratulations");
      setTimeout(() => {
        setScreen("predict");
      }, 5000);
    } else {
      setFailedAttempts(failedAttempts + 1);
      if (failedAttempts + 1 >= 3) {
        setCustomerInfoError("입력 실패! 처음으로 돌아갑니다");
        setTimeout(() => {
          resetGame();
          setScreen("홈");
        }, 3000);
      } else {
        setCustomerInfoError("틀렸습니다, 다시 시도하세요!");
      }
    }
  };

  return (
    <div className="App">
      {screen === "홈" && (
        <div className="home">
          <h1 className="title">수어 단서 수집 게임</h1>
          <p className="intro">수어를 배우고 단서를 맞춰보세요!</p>
          <div className="categories">
            {Object.keys(categories).map(cat => (
              <button key={cat} className="category-btn" onClick={() => startLearning(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <button className="start-btn" onClick={startGame}>시작</button>
        </div>
      )}
      {screen === "학습" && (
        <div className="learning">
          <h1 className="title">{category} 학습</h1>
          <div className="clues">
            {categories[category].map((word, idx) => (
              <div key={idx} className="word-card">
                <video
                  className="word-video"
                  src={videoMapping[word] || "/videos/placeholder.mp4"}
                  autoPlay
                  loop
                  muted
                  preload="metadata"
                  onError={() => console.error(`영상 로드 실패: ${word}`)}
                >
                  영상을 로드할 수 없습니다: {word}
                </video>
                <p>{word}</p>
              </div>
            ))}
          </div>
          <button className="back-btn" onClick={() => setScreen("홈")}>뒤로 가기</button>
        </div>
      )}
      {screen === "게임" && (
        <div className={`game ${pageIdx === 2 ? 'question-3' : ''}`}>
          <h1 className="title">질문 #{pageIdx + 1}</h1>
          <p className="question">{pages[pageIdx].question}</p>
          <div className="clues">
            {shuffledWords.map((word, idx) => (
              <div
                key={idx}
                className="word-card draggable"
                draggable
                onDragStart={(e) => handleDragStart(e, word)}
                onClick={() => setHintWord(word)}
              >
                <video
                  className="word-video"
                  src={videoMapping[word] || "/videos/placeholder.mp4"}
                  autoPlay
                  loop
                  muted
                  preload="metadata"
                  onError={() => console.error(`영상 로드 실패: ${word}`)}
                >
                  영상을 로드할 수 없습니다: {word}
                </video>
              </div>
            ))}
          </div>
          <div className="drop-zone">
            {targetWords.map((_, idx) => (
              <div
                key={idx}
                className="drop-slot"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, idx)}
              >
                {userOrder[idx] || "여기에 드롭"}
              </div>
            ))}
          </div>
          <div className="sentence-container">
            <div className="sentence-wrapper">
              <span className="hint-text">HINT</span>
              <p className="reference-sentence">{targetSentence}</p>
            </div>
            <div className="mapping-display">
              <h3>수어문</h3>
              <p>
                {userOrder
                  .filter(word => word !== null)
                  .map((word, idx) => (
                    <span key={idx} className="word-span">
                      {word}
                    </span>
                  ))
                  .reduce((prev, curr) => [prev, " ", curr], "") || "아직 순서를 만들지 않았어요"}
              </p>
            </div>
          </div>
          <div className="button-group">
            <button className="submit-btn" onClick={checkAnswer}>제출</button>
            <button className="reset-btn" onClick={handleReset}>초기화</button>
          </div>
          <div className="stats">
            <p className="timer">남은 시간: {timer}초</p>
          </div>
          {hintWord && (
            <div className="hint-book">
              <p>{hintWord}</p>
              <button onClick={() => setHintWord(null)}>닫기</button>
            </div>
          )}
          {feedback && (
            <div className="feedback-box">
              <p>{feedback}</p>
              <button onClick={() => setFeedback("")}>닫기</button>
            </div>
          )}
          {acquiredSentence && (
            <div className="feedback-box success">
              <p>정답입니다! 단서를 획득했어요 - {acquiredSentence}</p>
            </div>
          )}
        </div>
      )}
      {screen === "customer-info" && (
        <div className="customer-info">
          <h1 className="title">고객 정보 입력</h1>
          <p className="intro">단서를 바탕으로 고객 정보를 입력하세요!</p>
          <div className="stats">
            <p className="timer">남은 시간: {timer}초</p>
          </div>
          <div className="customer-form">
            <input
              type="text"
              name="name"
              value={customerInfo.name}
              onChange={handleCustomerInfoChange}
              placeholder="이름"
              className="customer-input"
            />
            <input
              type="text"
              name="phone"
              value={customerInfo.phone}
              onChange={handleCustomerInfoChange}
              placeholder="전화번호"
              className="customer-input"
            />
            <input
              type="text"
              name="preferredTime"
              value={customerInfo.preferredTime}
              onChange={handleCustomerInfoChange}
              placeholder="작업시간 선호"
              className="customer-input"
            />
            <input
              type="text"
              name="schedule"
              value={customerInfo.schedule}
              onChange={handleCustomerInfoChange}
              placeholder="수리 방문일정"
              className="customer-input"
            />
            <input
              type="text"
              name="complaintScore"
              value={customerInfo.complaintScore}
              onChange={handleCustomerInfoChange}
              placeholder="불만 점수"
              className="customer-input"
            />
            <button className="submit-btn" onClick={submitCustomerInfo}>제출</button>
          </div>
          {customerInfoError && (
            <div className="feedback-box error">
              <p>{customerInfoError}</p>
              <button onClick={() => setCustomerInfoError("")}>닫기</button>
            </div>
          )}
        </div>
      )}
      {screen === "congratulations" && (
        <div className="congratulations">
          <h1 className="title">축하합니다!</h1>
          <p className="intro">이제 한국어 문장을 자유롭게 입력해 수어 어순을 예측해보세요!</p>
        </div>
      )}
      {screen === "predict" && (
        <div className="predict">
          <h1 className="title">수어 어순 예측</h1>
          <p className="intro">
            한국어 문장을 입력하면 수어 단어 순서를 예측해드립니다! 
            <span className="highlight">(누가, 무엇을, 언제, 어디서, 왜, 어떻게와 같은 정보를 포함해주세요)</span>
          </p>
          <p className="sign-dict-link">
            수어를 알아보려면: 
            <a href="https://sldict.korean.go.kr/front/main/main.do#" target="_blank" rel="noopener noreferrer">
              국립국어원 수어사전
            </a>
          </p>
          <input
            type="text"
            className="sentence-input"
            value={inputSentence}
            onChange={(e) => setInputSentence(e.target.value)}
            placeholder="한국어 문장을 입력하세요"
          />
          <div className="button-group">
            <button className="submit-btn" onClick={predictSignOrder}>예측</button>
            <button className="reset-btn" onClick={resetPrediction}>초기화</button>
            <button className="back-btn" onClick={() => setScreen("홈")}>홈으로 돌아가기</button>
          </div>
          {feedback && (
            <div className="feedback-box">
              <p>{feedback}</p>
              <button onClick={() => setFeedback("")}>닫기</button>
            </div>
          )}
          {predictedWords.length > 0 && (
            <div className="predicted-words">
              <h3>예측된 수어문</h3>
              <ul className="horizontal-list">
                {predictedWords.map((word, idx) => (
                  <li key={idx} className="word-item">{word}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;