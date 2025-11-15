// script.js - AI StyleMate Logic (Final Version with Dual Mode)

// ----------------------------------------------------
// 1. MODEL PATHS (⚠️ 경로가 정확한지 다시 확인하세요!)
// ----------------------------------------------------
const URL_MODEL_1 = "./models/model_1/"; 
const URL_MODEL_2 = "./models/model_2/"; 

let model1, model2, webcam;
let labelContainer = document.getElementById("label-container");
let currentModel = 0; 
let requestID; // window.requestAnimationFrame의 ID 저장용
let isRunning = false; // 웹캠 실시간 분석 상태 (Webcam Mode 전용)
let isInitialized = false; // 모델 및 웹캠 초기화 여부
let currentSource = 'webcam'; // 현재 입력 소스: 'webcam' 또는 'image'


// ===============================================
// 2. Event Listeners and Setup
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    // 버튼 연결
    document.getElementById("start-button").addEventListener("click", toggleAnalysis);
    
    // 모델 전환 버튼 연결 (handleModelChange 함수 사용)
    document.getElementById("model1-btn").addEventListener("click", () => handleModelChange(1));
    document.getElementById("model2-btn").addEventListener("click", () => handleModelChange(2));
    
    // 모드 전환 버튼 연결
    document.getElementById("mode-webcam").addEventListener("click", () => switchMode('webcam'));
    document.getElementById("mode-upload").addEventListener("click", () => switchMode('image'));

    // 이미지 업로드 입력 변경 감지
    document.getElementById("image-upload").addEventListener("change", handleImageUpload);
    document.getElementById("process-image-btn").addEventListener("click", processUploadedImage);
    
    // 초기에는 웹캠 모드로 시작
    switchMode('webcam');
});


// ===============================================
// 3. Mode Switching Logic
// ===============================================

function switchMode(mode) {
    if (currentSource === mode) return;

    // 실시간 웹캠 분석이 진행 중이면 중지
    if (isRunning) {
        toggleAnalysis(); // Pause
    }
    
    // 웹캠 컨테이너 내용 정리 (캔버스, 이미지 등)
    document.getElementById("webcam-container").innerHTML = '';
    
    // 모드 상태 업데이트
    currentSource = mode;
    
    // UI 업데이트
    document.getElementById("mode-webcam").classList.remove('active');
    document.getElementById("mode-upload").classList.remove('active');
    
    const webcamControls = document.getElementById("webcam-controls");
    const uploadControls = document.getElementById("upload-controls");

    if (mode === 'webcam') {
        document.getElementById("mode-webcam").classList.add('active');
        webcamControls.style.display = 'block';
        uploadControls.style.display = 'none';
        document.getElementById("webcam-container").innerHTML = '<p id="initial-message">Click "Start Analysis" to load webcam.</p>';
        labelContainer.innerHTML = 'Waiting for analysis...';
        
        // 웹캠 모드 진입 시, 이전에 웹캠이 켜져 있었다면 재시작을 위해 webcam.play() 호출
        if(webcam && webcam.canvas) {
            document.getElementById("webcam-container").appendChild(webcam.canvas);
            webcam.play();
        }

    } else if (mode === 'image') {
        document.getElementById("mode-upload").classList.add('active');
        webcamControls.style.display = 'none';
        uploadControls.style.display = 'block';
        document.getElementById("webcam-container").innerHTML = '<p id="initial-message">Please upload an image.</p>';
        labelContainer.innerHTML = 'Upload an image and click "Process Image".';
        
        // 이미지 모드 진입 시, 웹캠이 켜져 있다면 중지
        if(webcam) {
            webcam.pause();
        }
    }
}


// ===============================================
// 4. Initialization, Webcam Loop Control (toggleAnalysis)
// ===============================================

async function toggleAnalysis() {
    const startButton = document.getElementById("start-button");
    
    // ------------------------------------------
    // A. 분석 정지 (Pause)
    // ------------------------------------------
    if (isRunning) {
        window.cancelAnimationFrame(requestID);
        startButton.innerText = "▶️ Resume Analysis";
        startButton.classList.replace('primary-btn', 'secondary-btn');
        isRunning = false;
        return; 
    }
    
    // ------------------------------------------
    // B. 모델 로드 및 웹캠 시작 (최초 1회만 실행)
    // ------------------------------------------
    if (!isInitialized) {
        startButton.innerText = "LOADING...";
        startButton.disabled = true;
        document.getElementById("webcam-container").innerHTML = "Loading models and setting up webcam. Please wait...";
        
        try {
            // 모델 로드
            model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
            model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
            
            // 웹캠 설정
            const flip = true; 
            webcam = new tmImage.Webcam(400, 300, flip); 
            await webcam.setup(); 
            await webcam.play();
            document.getElementById("webcam-container").innerHTML = ''; // 초기 메시지 제거
            document.getElementById("webcam-container").appendChild(webcam.canvas);
            
            currentModel = 1;
            updateModelInfo();
            isInitialized = true;

        } catch (error) {
            console.error("Initialization error:", error);
            document.getElementById("webcam-container").innerHTML = "<p class='error'>Error! Check console. (Ensure files are present and running on HTTPS)</p>";
            startButton.innerText = "⚠️ Error. Retry";
            startButton.disabled = false;
            return;
        }
        startButton.disabled = false;
    }

    // ------------------------------------------
    // C. 분석 재개 (Start / Resume)
    // ------------------------------------------
    if(webcam) webcam.play();
    startButton.innerText = "⏸️ Pause & Lock Result";
    startButton.classList.replace('secondary-btn', 'primary-btn');
    isRunning = true;
    loop(); // 루프 시작
}


// ===============================================
// 5. Webcam Prediction Loop and Model Change Handler
// ===============================================

function loop() {
    // 웹캠 모드에서만 실행
    if (currentSource === 'webcam') {
        webcam.update(); 
        
        if (currentModel === 1 && model1) {
            predict(model1, "Face Type Analysis", webcam.canvas);
        } else if (currentModel === 2 && model2) {
            predict(model2, "Personal Tone Analysis", webcam.canvas);
        }
    }
    
    requestID = window.requestAnimationFrame(loop); 
}

// 💡 수정된 함수: 모델 버튼 클릭 시 호출되어 정지 상태에서 즉시 예측 실행
function handleModelChange(newModel) {
    if (currentModel === newModel) return;

    currentModel = newModel;
    updateModelInfo();
    
    // 💡 핵심 로직: 웹캠 모드이고 분석이 일시 정지(잠금) 상태라면 즉시 예측을 실행합니다.
    if (currentSource === 'webcam' && !isRunning && isInitialized) {
        const modelToUse = (currentModel === 1) ? model1 : model2;
        const modelName = (currentModel === 1) ? "Face Type Analysis" : "Personal Tone Analysis";
        
        // 고정된 웹캠 캔버스를 분석하여 결과를 즉시 표시
        predict(modelToUse, modelName, webcam.canvas);
    } 
}


// ===============================================
// 6. Image Upload Logic
// ===============================================

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        // 이미지를 보여주고 분석 버튼 활성화
        const imgElement = document.createElement('img');
        imgElement.id = 'uploaded-image';
        imgElement.src = e.target.result;
        
        const container = document.getElementById("webcam-container");
        container.innerHTML = ''; // 기존 내용 제거
        container.appendChild(imgElement);

        document.getElementById("process-image-btn").disabled = false;
        labelContainer.innerHTML = 'Image uploaded. Click "Process Uploaded Image" to analyze.';
    };
    reader.readAsDataURL(file);
}

async function processUploadedImage() {
    const imgElement = document.getElementById('uploaded-image');
    if (!imgElement) return;
    
    // 모델이 초기화되지 않았다면 먼저 초기화 시도
    if (!isInitialized) {
        labelContainer.innerHTML = 'Loading models... Please wait.';
        try {
            model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
            model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
            isInitialized = true;
        } catch(e) {
            labelContainer.innerHTML = 'Error loading models. Check console.';
            return;
        }
    }

    // 이미지 분석은 한 번만 실행하고 결과를 확정합니다.
    const modelToUse = (currentModel === 1) ? model1 : model2;
    const modelName = (currentModel === 1) ? "Face Type Analysis" : "Personal Tone Analysis";

    labelContainer.innerHTML = 'Analyzing image...';
    // 예측 실행
    await predict(modelToUse, modelName, imgElement); 
    
    document.getElementById("process-image-btn").innerText = 'Analysis Complete (Click to re-analyze)';
}


// ===============================================
// 7. Core Prediction and UI Update
// ===============================================

async function predict(modelToUse, modelName, element) {
    if (!modelToUse) {
        labelContainer.innerHTML = `Error: ${modelName} is not loaded.`;
        return;
    }
    
    // 💡 클래스 개수 불일치 오류 해결 로직 (핵심)
    const currentMaxPredictions = modelToUse.getTotalClasses(); 

    // 예측 수행 (캔버스 또는 이미지 사용)
    const prediction = await modelToUse.predict(element);

    let resultHTML = `<div class="model-name-title"><h3>${modelName} Results:</h3></div>`;
    
    // 동적으로 가져온 개수만큼만 반복하여 오류를 방지합니다.
    for (let i = 0; i < currentMaxPredictions; i++) {
        const classPrediction = 
            `<strong>${prediction[i].className}</strong>: ${(prediction[i].probability * 100).toFixed(1)}%`;
        resultHTML += `<div class="prediction-item">${classPrediction}</div>`;
    }
    labelContainer.innerHTML = resultHTML;
}

function updateModelInfo() {
    const infoElement = document.getElementById("current-model-info");
    const btn1 = document.getElementById("model1-btn");
    const btn2 = document.getElementById("model2-btn");

    if (currentModel === 1) {
        infoElement.innerHTML = "Active Model: **Face Type Analysis**";
        btn1.classList.add('active');
        btn2.classList.remove('active');
    } else if (currentModel === 2) {
        infoElement.innerHTML = "Active Model: **Personal Tone Analysis**";
        btn1.classList.remove('active');
        btn2.classList.add('active');
    }

    // 이미지 모드에서 모델 전환 시 즉시 재분석 유도
    if (currentSource === 'image' && document.getElementById('uploaded-image')) {
         document.getElementById("process-image-btn").innerText = 'Re-Analyze Image';
    }
}