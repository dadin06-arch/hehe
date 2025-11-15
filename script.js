let model, webcam;
let currentModel = 0; 
let isRunning = false; 
let currentSource = 'webcam';

// ----------------------------------------------------
// 1. MODEL PATHS & RECOMMENDATION DATA (경로 및 데이터 복구)
// ----------------------------------------------------
const URL_MODEL_1 = "./models/model_1/"; 
const URL_MODEL_2 = "./models/model_2/"; 

// 얼굴형별 추천 데이터 및 이미지 URL 정의 (이전에 사용했던 데이터 복구)
const faceTypeData = {
    "Oval": {
        summary: "Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: 'images/oval_short.png',
        longImage: 'images/oval_long.png'
    },
    "Round": {
        summary: "Best with styles that add vertical length and slim the sides.",
        short: "Asymmetrical cuts, volume on top.",
        long: "Long bob, side-flowing layers.",
        shortImage: 'images/round_short.png',
        longImage: 'images/round_long.png'
    },
    "Square": {
        summary: "Softens a strong jawline with gentle curves.",
        short: "Textured cuts, side-swept styles.",
        long: "Waves with face-framing layers.",
        shortImage: 'images/square_short.png',
        longImage: 'images/square_long.png'
    },
    "Heart": {
        summary: "Balances a wider forehead and narrower chin.",
        short: "Side bangs, face-hugging layers.",
        long: "Heavier layers below the chin, side parts.",
        shortImage: 'images/heart_short.png',
        longImage: 'images/heart_long.png'
    },
    "Oblong": {
        summary: "Works best with styles that reduce length and increase width.",
        short: "Jaw-line bobs, forehead-covering bangs.",
        long: "Medium-length layers, styles with side volume.",
        shortImage: 'images/oblong_short.png',
        longImage: 'images/oblong_long.png'
    }
};

const defaultRecommendation = {
    summary: "Select a face type button to see the hairstyle recommendation.",
    short: "Short Style Tip",
    long: "Long Style Tip",
    shortImage: 'null',
    longImage: 'null'
};

// ----------------------------------------------------
// 2. CORE FUNCTIONS
// ----------------------------------------------------

async function init(modelPath, modelType) {
    const URL = modelPath;
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    currentModel = modelType;

    // 이전 웹캠 중지 (모델 로드 전 정리)
    if (webcam && isRunning) {
        await webcam.stop();
        isRunning = false;
    }
    
    document.getElementById("current-model-info").innerText = `Active Model: Loading ${modelType === 1 ? 'Face Type Analysis' : 'Personal Tone Analysis'}...`;
    
    try {
        model = await tmImage.load(modelURL, metadataURL);
        
        document.getElementById("current-model-info").innerHTML = `Active Model: **${modelType === 1 ? 'Face Type Analysis' : 'Personal Tone Analysis'}** Loaded`;
        
        // 모델 로드 성공 시 버튼 스타일 업데이트
        document.querySelectorAll('.model-select-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`model${modelType}-btn`).classList.add('active');
        
        document.getElementById("initial-message").innerText = `Model ready. Click 'Start Analysis'.`;
        document.getElementById('process-image-btn').disabled = false;


    } catch (e) {
        console.error("Model loading failed:", e);
        document.getElementById("current-model-info").innerText = "Active Model: Error loading model. Check console for details.";
        document.getElementById('process-image-btn').disabled = true;
    }
}

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
        isRunning = true;
        return true; 
    } catch (error) {
        container.innerHTML = '<p id="initial-message" style="color:red; margin-top: 15px;">⚠️ Webcam access failed. Check browser permissions and HTTPS connection.</p>';
        console.error("Webcam setup error:", error);
        isRunning = false;
        return false; 
    }
}


// ----------------------------------------------------
// 3. PREDICT FUNCTION (예측 결과만 출력하도록 간소화)
// ----------------------------------------------------
async function predict() {
    if (!model) {
        alert("Please load a model first (Face Type or Personal Tone).");
        return;
    }

    let inputElement;
    let isWebcamMode = currentSource === 'webcam';

    if (isWebcamMode) {
        // Start Analysis 버튼 클릭 시 웹캠 시작/확인
        if (!webcam || !isRunning) {
            const success = await setupWebcam();
            if (!success) return; 
        }
        inputElement = webcam.canvas;
        
    } else {
        inputElement = document.getElementById('uploaded-img');
        if (!inputElement || !inputElement.src || inputElement.src.startsWith('data:image/') === false) {
            alert("Please upload an image first.");
            return;
        }
    }

    // 예측 실행
    const prediction = await model.predict(inputElement, false);
    
    let predictionOutput = document.getElementById("prediction-output");
    predictionOutput.innerHTML = ''; 

    // 1. 가장 높은 확률의 예측 결과 찾기
    let maxPrediction = { className: "N/A", probability: 0 };
    for (let i = 0; i < prediction.length; i++) {
        if (prediction[i].probability > maxPrediction.probability) {
            maxPrediction.probability = prediction[i].probability;
            maxPrediction.className = prediction[i].className;
        }
    }

    // A. 예측 결과 목록 출력 (Prediction Box)
    let predictionListHTML = '';
    for (let i = 0; i < prediction.length; i++) {
        const classPrediction =
            `<div class="prediction-item">${prediction[i].className}: <strong>${(prediction[i].probability * 100).toFixed(1)}%</strong></div>`;
        predictionListHTML += classPrediction;
    }
    
    const modelName = currentModel === 1 ? 'Face Type' : 'Personal Tone';

    const resultBoxHTML = `
        <div class="recommendation-box">
            <h4>📊 Model Output: ${modelName} Analysis</h4>
            ${predictionListHTML}
            <p style="margin-top: 15px; font-weight: bold; color: #fc5c7d;">Highest Match: ${maxPrediction.className} (${(maxPrediction.probability * 100).toFixed(1)}%)</p>
        </div>
    `;
    
    predictionOutput.innerHTML = resultBoxHTML;
}

// ----------------------------------------------------
// 4. MANUAL RECOMMENDATION FUNCTION (사용자 선택에 따른 추천)
// ----------------------------------------------------
function showRecommendation(faceType) {
    const data = faceTypeData[faceType] || defaultRecommendation; 
    const outputContainer = document.getElementById("recommendation-output");
    
    // 버튼 스타일 업데이트
    document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.face-select-btn[data-facetype="${faceType}"]`).classList.add('active');


    // 추천 스타일 텍스트 및 이미지 출력
    const recommendationHTML = `
        <div class="recommendation-box">
            <h4>✨ Recommended Style for: ${faceType}</h4>
            
            <div class="recommendation-summary">
                <strong>Summary</strong>: ${data.summary}
            </div>
            
            <div class="hair-style-detail">
                <div class="short-hair-section">
                    <p><strong><i class="fas fa-cut"></i> Short Hair:</strong> ${data.short}</p>
                    <div class="image-wrapper"><img src="${data.shortImage}" alt="${faceType} short hair"></div>
                </div>
                
                <div class="long-hair-section">
                    <p><strong><i class="fas fa-spa"></i> Long Hair:</strong> ${data.long}</p>
                    <div class="image-wrapper"><img src="${data.longImage}" alt="${faceType} long hair"></div>
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
}


// ----------------------------------------------------
// 5. MODE SWITCHING & EVENT LISTENERS
// ----------------------------------------------------
async function switchMode(mode) {
    currentSource = mode;
    const modeWebcam = document.getElementById('mode-webcam');
    const modeUpload = document.getElementById('mode-upload');
    const webcamControls = document.getElementById('webcam-controls');
    const uploadControls = document.getElementById('upload-controls');
    const webcamContainer = document.getElementById('webcam-container');
    const model1Btn = document.getElementById('model1-btn');
    const model2Btn = document.getElementById('model2-btn');

    // 1. UI 업데이트
    if (mode === 'webcam') {
        modeWebcam.classList.add('active');
        modeUpload.classList.remove('active');
        webcamControls.style.display = 'block';
        uploadControls.style.display = 'none';
    } else {
        modeUpload.classList.add('active');
        modeWebcam.classList.remove('active');
        webcamControls.style.display = 'none';
        uploadControls.style.display = 'block';
    }

    // 2. 웹캠 중지 (이미지 모드로 전환 시)
    if (mode === 'image' && webcam && isRunning) {
        await webcam.stop();
        webcam = null;
        isRunning = false;
        
        // 이미지 모드일 때 메시지 업데이트
        webcamContainer.innerHTML = '<p id="initial-message">Model Selection is active. Choose a model and upload an image.</p>';
    } else if (mode === 'webcam') {
        // 웹캠 모드일 때 메시지 업데이트 (이미지 파일 제거)
        const uploadedImg = document.getElementById('uploaded-img');
        if (uploadedImg) uploadedImg.remove();
        webcamContainer.innerHTML = '<p id="initial-message">Model Selection is active. Choose a model to begin.</p>';
    }

    // 3. 모델 선택 버튼 활성화 (순서 강제 해제)
    model1Btn.disabled = false;
    model2Btn.disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
    
    // 모델 선택 버튼 이벤트 리스너
    document.getElementById('model1-btn').addEventListener('click', () => init(URL_MODEL_1, 1));
    document.getElementById('model2-btn').addEventListener('click', () => init(URL_MODEL_2, 2));
    
    // 분석 시작 버튼 이벤트 리스너
    document.getElementById('start-button').addEventListener('click', predict);
    document.getElementById('process-image-btn').addEventListener('click', predict);

    // 모드 전환 이벤트 리스너
    document.getElementById('mode-webcam').addEventListener('click', () => switchMode('webcam'));
    document.getElementById('mode-upload').addEventListener('click', () => switchMode('image'));

    // ⚠️ 새로운 얼굴형 선택 버튼 이벤트 리스너 추가
    document.querySelectorAll('.face-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const faceType = e.target.getAttribute('data-facetype');
            showRecommendation(faceType);
        });
    });

    // 이미지 업로드 핸들링 (이전과 동일)
    document.getElementById('image-upload').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.id = 'uploaded-img';
                img.src = e.target.result;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '400px'; 
                img.style.borderRadius = '10px';
                
                const existingImg = document.getElementById('uploaded-img');
                if (existingImg) existingImg.remove();
                
                document.getElementById('webcam-container').appendChild(img);
                
                // 모델이 로드되었다면 이미지 분석 버튼 활성화
                document.getElementById('process-image-btn').disabled = !model; 
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 초기 설정
    switchMode('webcam'); 
});