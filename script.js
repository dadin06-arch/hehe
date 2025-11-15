let model, webcam, labelContainer, maxPredictions;
let currentModel = null; 

// 얼굴형별 추천 데이터 및 이미지 URL 정의 (경로 확인 완료)
const faceTypeData = {
    // ⚠️ 모델의 레이블 이름과 정확히 일치해야 합니다. 
    "Oval": {
        summary: "Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: '<img src="images/oval_short.png" alt="Oval short hair">',
        longImage: '<img src="images/oval_long.png" alt="Oval long hair">'
    },
    "Round": {
        summary: "Best with styles that add vertical length and slim the sides.",
        short: "Asymmetrical cuts, volume on top.",
        long: "Long bob, side-flowing layers.",
        shortImage: '<img src="images/round_short.png" alt="Round short hair">',
        longImage: '<img src="images/round_long.png" alt="Round long hair">'
    },
    "Square": {
        summary: "Softens a strong jawline with gentle curves.",
        short: "Textured cuts, side-swept styles.",
        long: "Waves with face-framing layers.",
        shortImage: '<img src="images/square_short.png" alt="Square short hair">',
        longImage: '<img src="images/square_long.png" alt="Square long hair">'
    },
    "Heart": {
        summary: "Balances a wider forehead and narrower chin.",
        short: "Side bangs, face-hugging layers.",
        long: "Heavier layers below the chin, side parts.",
        shortImage: '<img src="images/heart_short.png" alt="Heart short hair">',
        longImage: '<img src="images/heart_long.png" alt="Heart long hair">'
    },
    "Oblong": {
        summary: "Works best with styles that reduce length and increase width.",
        short: "Jaw-line bobs, forehead-covering bangs.",
        long: "Medium-length layers, styles with side volume.",
        shortImage: '<img src="images/oblong_short.png" alt="Oblong short hair">',
        longImage: '<img src="images/oblong_long.png" alt="Oblong long hair">'
    }
};

const defaultRecommendation = {
    summary: "Please run the analysis first.",
    short: "Select a mode, load a model, and click 'Start Analysis'.",
    long: "",
    shortImage: "",
    longImage: ""
};


// 1. 모델 로드
async function init(modelPath, modelType) {
    const URL = modelPath;
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    currentModel = modelType;

    // 이전 웹캠이 실행 중이면 중지
    if (webcam) {
        await webcam.stop();
        // 컨테이너를 비우고 메시지 출력
        document.getElementById("webcam-container").innerHTML = '<p id="initial-message">Model ready. Click \'Start Analysis\' to begin.</p>';
        webcam = null;
    }
    
    document.getElementById("current-model-info").innerText = `Active Model: Loading ${modelType === 1 ? 'Face Type Analysis' : 'Personal Tone Analysis'}...`;
    
    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        document.getElementById("current-model-info").innerHTML = `Active Model: **${modelType === 1 ? 'Face Type Analysis' : 'Personal Tone Analysis'}** Loaded`;
        
        // 모델 로드 성공 시 버튼 스타일 업데이트
        document.querySelectorAll('.model-select-btn').forEach(btn => btn.classList.remove('active'));
        if (modelType === 1) {
            document.getElementById('model1-btn').classList.add('active');
        } else if (modelType === 2) {
            document.getElementById('model2-btn').classList.add('active');
        }
        
        // 메시지 업데이트: 모델이 준비되었음을 알림
        document.getElementById("initial-message").innerText = `Model ready. Click 'Start Analysis' to begin.`;
        
        // 이미지 업로드 버튼 활성화 (모델 로드 성공 시)
        document.getElementById('process-image-btn').disabled = false;


    } catch (e) {
        console.error("Model loading failed:", e);
        document.getElementById("current-model-info").innerText = "Active Model: Error loading model. Check console for details.";
        document.getElementById('process-image-btn').disabled = true;
    }
}

// 2. 웹캠 설정 (오류 메시지 추가)
async function setupWebcam() {
    if (webcam) {
        await webcam.stop();
    }
    const container = document.getElementById("webcam-container");
    container.innerHTML = ''; 
    
    webcam = new tmImage.Webcam(400, 400, true); 
    
    try {
        await webcam.setup();
        await webcam.play();
        container.appendChild(webcam.canvas);
        return true; // 성공
    } catch (error) {
        container.innerHTML = '<p id="initial-message" style="color:red; margin-top: 15px;">⚠️ Webcam access failed. Check browser permissions and HTTPS connection.</p>';
        console.error("Webcam setup error:", error);
        return false; // 실패
    }
}

// 3. 예측 함수 (웹캠 시작 로직 포함)
async function predict() {
    if (!model) {
        alert("Please load a model first (Face Type or Personal Tone).");
        return;
    }

    let inputElement;
    let isWebcamMode = document.getElementById('mode-webcam').classList.contains('active');

    if (isWebcamMode) {
        // Start Analysis 버튼 클릭 시 웹캠 시작/확인
        if (!webcam) {
            const success = await setupWebcam();
            if (!success) return; // 웹캠 시작 실패 시 분석 중단
        }
        inputElement = webcam.canvas;
        
    } else {
        inputElement = document.getElementById('uploaded-img');
        if (!inputElement) {
            alert("Please upload an image first.");
            return;
        }
    }

    // 예측 실행
    const prediction = await model.predict(inputElement, false);
    
    let labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = ''; 

    // 1. 가장 높은 확률의 예측 결과 찾기
    let maxPrediction = { className: "N/A", probability: 0 };
    for (let i = 0; i < prediction.length; i++) {
        if (prediction[i].probability > maxPrediction.probability) {
            maxPrediction.probability = prediction[i].probability;
            maxPrediction.className = prediction[i].className;
        }
    }

    // A. 예측 결과 목록 출력 
    for (let i = 0; i < prediction.length; i++) {
        const classPrediction =
            `<div class="prediction-item">${prediction[i].className}: <strong>${(prediction[i].probability * 100).toFixed(1)}%</strong></div>`;
        labelContainer.innerHTML += classPrediction;
    }

    // 2. 얼굴형 모델인 경우에만 추천 로직 실행 (currentModel === 1)
    if (currentModel === 1) {
        const highestFaceType = maxPrediction.className;
        const data = faceTypeData[highestFaceType] || defaultRecommendation; 

        // 3. 추천 스타일 텍스트 및 이미지 출력
        const recommendationHTML = `
            <div class="recommendation-box">
                <h3>✨ Recommended Style (Highest Match: ${highestFaceType})</h3>
                
                <div class="recommendation-summary">
                    <strong>${highestFaceType}</strong>: ${data.summary}
                </div>
                
                <div class="hair-style-detail">
                    <div class="short-hair-section">
                        <h4><i class="fas fa-cut"></i> Short Hair: ${data.short}</h4>
                        ${data.shortImage ? `<div class="image-wrapper">${data.shortImage}</div>