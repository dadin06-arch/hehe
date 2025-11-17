// script.js - AI StyleMate Logic (Final Version with Face Detection & Confidence Check & Button Fix)

// ----------------------------------------------------
// 1. MODEL PATHS, VARIABLES & DATA DEFINITION
// ----------------------------------------------------
const URL_MODEL_1 = "./models/model_1/"; 
const URL_MODEL_2 = "./models/model_2/"; 

let model1, model2, webcam;
let faceDetectorModel; // 💡 얼굴 감지 모델 변수
let labelContainer = document.getElementById("label-container");
let currentModel = 0; 
let requestID; 
let isRunning = false; 
let isInitialized = false; // 💡 초기화 상태 플래그 (버튼 작동 오류 방지 핵심)
let currentSource = 'webcam'; 

// 💡 얼굴 감지 임계값 (필요 시 조정 가능)
const FACE_DETECTION_THRESHOLD = 0.9; // 얼굴 감지 신뢰도
const MIN_FACE_SIZE = 50; // 최소 얼굴 크기 (픽셀)

// 💡 [요청 기능] 최소 예측 확률 임계값 (60%)
const MIN_CONFIDENCE_THRESHOLD = 0.60; 

// 💡 얼굴형별 추천 데이터 및 이미지 URL 정의
const faceTypeData = {
    "Oval": {
        summary: "The most versatile face shape. Naturally suits most hairstyles.",
        short: "Crop cut, undercut, bob.",
        long: "Layered cuts, natural waves.",
        shortImage: 'images/oval_short.png',
        longImage: 'images/oval_long.png'
    },
    "Round": {
        summary: "Styles that look longer and sharper work well. Best with styles that add vertical length and slim the sides.",
        short: "Asymmetrical cuts, volume on top.",
        long: "Long bob, side-flowing layers.",
        shortImage: 'images/round_short.png',
        longImage: 'images/round_long.png'
    },
    "Square": {
        summary: "Reduce sharp angles and add soft lines. Softens a strong jawline with gentle curves.",
        short: "Textured cuts, side-swept styles.",
        long: "Waves with face-framing layers.",
        shortImage: 'images/square_short.png',
        longImage: 'images/square_long.png'
    },
    "Heart": {
        summary: "Keep the top light and add volume toward the bottom. Balances a wider forehead and narrower chin.",
        short: "Side bangs, face-hugging layers.",
        long: "Heavier layers below the chin, side parts.",
        shortImage: 'images/heart_short.png',
        longImage: 'images/heart_long.png'
    },
    "Oblong": {
        summary: "Shorten the appearance of length and widen the silhouette. Works best with styles that reduce length and increase width.",
        short: "Jaw-line bobs, forehead-covering bangs.",
        long: "Medium-length layers, styles with side volume.",
        shortImage: 'images/oblong_short.png',
        longImage: 'images/oblong_long.png'
    }
};

// 💡 퍼스널 톤 추천 데이터 및 이미지 URL 정의
const personalToneData = {
    "Cool": {
        summary: "Blue-based and purple-based cool hues make the skin look clearer and brighter.",
        hair: "Ash brown, ash blonde, blue-black",
        clothing: "Light tones: Ice blue, lavender, lilac pink | Dark tones: Navy, charcoal gray, burgundy | Neutrals: White, cool gray",
        makeup: "Lips: Raspberry, fuchsia, cool pink | Eyes: Mauve, silver, cool brown | Blush: Rose pink, lilac pink",
        image: 'images/cool_tone.png' 
    },
    "Warm": {
        summary: "Yellow-based and orange-based warm hues enhance natural warmth and give a healthy glow.",
        hair: "Golden brown, copper brown",
        clothing: "Light tones: Coral, peach, salmon | Dark tones: Olive, khaki, mustard | Neutrals: Beige, ivory, cream",
        makeup: "Lips: Coral, orange-red, brick | Eyes: Gold, bronze, warm brown | Blush: Peach, coral, apricot",
        image: 'images/warm_tone.png' 
    }
};


// ===============================================
// 2. Event Listeners and Setup
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    // 💡 모든 버튼에 이벤트 리스너 할당
    document.getElementById("start-button").addEventListener("click", toggleAnalysis);
    
    document.getElementById("model1-btn").addEventListener("click", () => handleModelChange(1));
    document.getElementById("model2-btn").addEventListener("click", () => handleModelChange(2));
    
    document.getElementById("mode-webcam").addEventListener("click", () => switchMode('webcam'));
    document.getElementById("mode-upload").addEventListener("click", () => switchMode('image'));

    document.getElementById("image-upload").addEventListener("change", handleImageUpload);
    document.getElementById("process-image-btn").addEventListener("click", processUploadedImage);
    
    document.querySelectorAll('.face-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active')); 
            e.target.classList.add('active');
            const faceType = e.target.getAttribute('data-facetype');
            showRecommendation(faceType); 
        });
    });

    document.querySelectorAll('.tone-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active')); 
            document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const toneType = e.target.getAttribute('data-tonetype');
            showToneRecommendation(toneType); 
        });
    });
    
    // 초기 모드 및 UI 설정
    switchMode('webcam');
    
    document.getElementById("style-selection-controls").style.display = 'none';
    document.getElementById("tone-selection-controls").style.display = 'none';
    
    currentModel = 1; 
    updateModelInfo();
});


// ===============================================
// 3. Mode Switching Logic 
// ===============================================

function switchMode(mode) {
    if (currentSource === mode) return;

    // 모드 전환 시 웹캠 분석 일시 정지
    if (isRunning) {
        toggleAnalysis(); 
    }
    
    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.innerHTML = '';
    
    currentSource = mode;
    
    document.getElementById("mode-webcam").classList.remove('active');
    document.getElementById("mode-upload").classList.remove('active');
    
    const webcamControls = document.getElementById("webcam-controls");
    const uploadControls = document.getElementById("upload-controls");

    if (mode === 'webcam') {
        document.getElementById("mode-webcam").classList.add('active');
        webcamControls.style.display = 'block';
        uploadControls.style.display = 'none';
        
        if (isInitialized && webcam && webcam.canvas) {
            // 이미 초기화된 웹캠 재사용
            webcamContainer.appendChild(webcam.canvas);
        } else {
             webcamContainer.innerHTML = '<p id="initial-message">Click "Start Analysis" to load webcam.</p>';
        }

    } else if (mode === 'image') {
        document.getElementById("mode-upload").classList.add('active');
        webcamControls.style.display = 'none';
        uploadControls.style.display = 'block';
        webcamContainer.innerHTML = '<p id="initial-message">Please upload an image.</p>';
        
        // 이미지 모드 진입 시 웹캠 일시 정지
        if(webcam) {
            webcam.pause();
        }
    }
    
    labelContainer.innerHTML = 'Waiting for analysis...';
    document.getElementById("recommendation-output").innerHTML = '<p>Select a model to begin the analysis or selection.</p>';
}


// ===============================================
// 4. Initialization, Webcam Loop Control (toggleAnalysis)
// ===============================================

async function toggleAnalysis() {
    const startButton = document.getElementById("start-button");
    
    if (isRunning) {
        window.cancelAnimationFrame(requestID);
        startButton.innerText = "▶️ Resume Analysis";
        startButton.classList.replace('primary-btn', 'secondary-btn');
        isRunning = false;
        return; 
    }
    
    if (!isInitialized) {
        startButton.innerText = "LOADING...";
        startButton.disabled = true;
        document.getElementById("webcam-container").innerHTML = "Loading models and setting up webcam. Please wait...";
        
        try {
            model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
            model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
            
            // 💡 얼굴 감지 모델 로드 추가
            faceDetectorModel = await blazeface.load();

            const flip = true; 
            webcam = new tmImage.Webcam(400, 300, flip); 
            await webcam.setup(); 
            
            document.getElementById("webcam-container").innerHTML = ''; 
            document.getElementById("webcam-container").appendChild(webcam.canvas);
            
            currentModel = 1; 
            updateModelInfo();
            isInitialized = true; // 💡 초기화 성공 플래그 설정

        } catch (error) {
            console.error("Initialization error:", error);
            document.getElementById("webcam-container").innerHTML = "<p style='color:red;'>⚠️ Error! Check console. (Ensure files are present and running on HTTPS)</p>";
            startButton.innerText = "⚠️ Error. Retry";
            startButton.disabled = false;
            return;
        }
        startButton.disabled = false;
    }

    if(webcam) webcam.play(); // 웹캠 객체 확인 후 재생
    startButton.innerText = "⏸️ Pause & Lock Result";
    startButton.classList.replace('secondary-btn', 'primary-btn');
    isRunning = true;
    loop(); 
}


// ===============================================
// 5. Webcam Prediction Loop and Model Change Handler 
// ===============================================

function loop() {
    if (currentSource === 'webcam' && isRunning) {
        // 💡 isRunning과 webcam 로드 상태 확인
        if (webcam && webcam.canvas) {
            webcam.update(); 
            
            if (currentModel === 1 && model1) {
                predict(model1, "Face Type Analysis", webcam.canvas);
            } else if (currentModel === 2 && model2) {
                predict(model2, "Personal Tone Analysis", webcam.canvas);
            }
        }
    }
    
    requestID = window.requestAnimationFrame(loop); 
}

// 💡 모델 변경 핸들러 (버튼 작동 문제 해결 핵심 로직)
function handleModelChange(newModel) {
    if (currentModel === newModel) return;

    currentModel = newModel;
    updateModelInfo();
    
    const styleControls = document.getElementById("style-selection-controls");
    const toneControls = document.getElementById("tone-selection-controls"); 
    const recommendationOutput = document.getElementById("recommendation-output");
    
    // 추천 버튼 UI 전환 및 초기화
    if (newModel === 1) { 
        styleControls.style.display = 'block';
        toneControls.style.display = 'none';
        recommendationOutput.innerHTML = '<p>Select a Face Type button from the **Hair Style Guide** to see recommendations.</p>';
        document.querySelectorAll('.tone-select-btn').forEach(btn => btn.classList.remove('active')); // 다른 모델 버튼 활성화 해제
        
    } else { 
        styleControls.style.display = 'none'; 
        toneControls.style.display = 'block'; 
        recommendationOutput.innerHTML = '<p>Select a Personal Tone button from the **Personal Tone Guide** to see recommendations.</p>';
        document.querySelectorAll('.face-select-btn').forEach(btn => btn.classList.remove('active')); // 다른 모델 버튼 활성화 해제
    }
    
    // 💡 중요: 초기화 상태 확인 로직 (버튼 클릭 오류 방지)
    if (!isInitialized) {
        labelContainer.innerHTML = 'Please click "Start Analysis" first or upload an image.';
        return;
    }
    
    // 웹캠 모드에서 일시 정지 상태이거나 이미지 모드일 때만 수동 분석 실행
    if ((currentSource === 'webcam' && !isRunning) || currentSource === 'image') {
        const modelToUse = (currentModel === 1) ? model1 : model2;
        const modelName = (currentModel === 1) ? "Face Type Analysis" : "Personal Tone Analysis";
        
        let element = null;
        if (currentSource === 'webcam' && webcam && webcam.canvas) {
            element = webcam.canvas;
        } else if (currentSource === 'image') {
            element = document.getElementById('uploaded-image');
        }
        
        // 유효한 입력 요소가 있을 때만 예측 실행
        if(element) {
            predict(modelToUse, modelName, element);
        } else if (currentSource === 'image') {
            labelContainer.innerHTML = 'Image uploaded. Click "Process Uploaded Image" to analyze.';
        }
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
        const imgElement = document.createElement('img');
        imgElement.id = 'uploaded-image';
        imgElement.src = e.target.result;
        
        const container = document.getElementById("webcam-container");
        container.innerHTML = ''; 
        container.appendChild(imgElement);

        document.getElementById("process-image-btn").disabled = false;
        labelContainer.innerHTML = 'Image uploaded. Click "Process Uploaded Image" to analyze.';
    };
    reader.readAsDataURL(file);
}

async function processUploadedImage() {
    const imgElement = document.getElementById('uploaded-image');
    if (!imgElement) return;
    
    // 이미지 분석 시 모델이 초기화되지 않았다면 로드 시도
    if (!isInitialized) {
        labelContainer.innerHTML = 'Loading models... Please wait.';
        try {
            model1 = await tmImage.load(URL_MODEL_1 + "model.json", URL_MODEL_1 + "metadata.json");
            model2 = await tmImage.load(URL_MODEL_2 + "model.json", URL_MODEL_2 + "metadata.json");
            faceDetectorModel = await blazeface.load(); 
            isInitialized = true;
        } catch(e) {
            labelContainer.innerHTML = 'Error loading models. Check console.';
            return;
        }
    }

    const modelToUse = (currentModel === 1) ? model1 : model2;
    const modelName = (currentModel === 1) ? "Face Type Analysis" : "Personal Tone Analysis";

    labelContainer.innerHTML = 'Analyzing image...';
    document.getElementById("process-image-btn").innerText = 'Analyzing...';
    document.getElementById("process-image-btn").disabled = true;

    await predict(modelToUse, modelName, imgElement); 
    
    document.getElementById("process-image-btn").innerText = 'Analysis Complete (Click to re-analyze)';
    document.getElementById("process-image-btn").disabled = false;
}


// ===============================================
// 7. Core Prediction and UI Update (60% 경고 기능 포함)
// ===============================================

async function predict(modelToUse, modelName, element) {
    if (!modelToUse || !faceDetectorModel || !element) {
        labelContainer.innerHTML = `Error: ${modelName}, Face Detector, or input element is not loaded.`;
        return;
    }
    
    // 1. 얼굴 감지(Face Detection) 로직: 얼굴의 명확성 확인
    const predictions = await faceDetectorModel.estimateFaces(element, FACE_DETECTION_THRESHOLD);

    if (predictions.length === 0) {
        labelContainer.innerHTML = '<div style="color: red; font-weight: bold; padding: 10px;">⚠️ 경고: 얼굴이 명확하게 감지되지 않았습니다!</div><p>분석을 진행하려면 얼굴이 정면으로 잘 보이고, 충분히 밝으며, 가려지지 않았는지 확인해 주세요.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>얼굴 인식 실패: 명확한 얼굴을 감지할 수 없습니다.</p>';
        
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        return; 
    }
    
    // 선택적: 얼굴 크기 검사
    const largestFace = predictions[0]; 
    const faceWidth = largestFace.bottomRight[0] - largestFace.topLeft[0];
    const faceHeight = largestFace.bottomRight[1] - largestFace.topLeft[1];

    if (faceWidth < MIN_FACE_SIZE || faceHeight < MIN_FACE_SIZE) {
        labelContainer.innerHTML = '<div style="color: orange; font-weight: bold; padding: 10px;">⚠️ 경고: 얼굴 크기가 너무 작습니다!</div><p>카메라에 더 가까이 다가가거나, 사진에서 얼굴이 더 크게 보이도록 해 주세요.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>얼굴 인식 실패: 얼굴 크기가 너무 작습니다.</p>';
        
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        return;
    }
    
    // 2. 분류(Classification) 로직
    const currentMaxPredictions = modelToUse.getTotalClasses(); 
    const prediction = await modelToUse.predict(element);

    // 💡 3. [요청 기능] 최고 확률 검사 및 경고 메시지 추가 로직
    const maxProbability = prediction.reduce((max, p) => Math.max(max, p.probability), 0);
    
    let resultHTML = `<div class="model-name-title"><h3>${modelName} Results:</h3></div>`;
    
    if (maxProbability < MIN_CONFIDENCE_THRESHOLD) {
        resultHTML += `
            <div style="color: #FF8C00; font-weight: bold; padding: 10px; border: 2px solid #FF8C00; border-radius: 5px; margin-bottom: 15px;">
                🚨 **신뢰도 경고**: 최고 예측 확률 (${(maxProbability * 100).toFixed(1)}%)이 60% 미만입니다!
                <br>더 정확한 결과를 위해 다시 시도하거나, 더 명확한 이미지를 사용해 주세요.
            </div>
        `;
    }
    
    // 기존 예측 결과 목록 추가
    for (let i = 0; i < currentMaxPredictions; i++) {
        const classPrediction = 
            `<strong>${prediction[i].className}</strong>: ${(prediction[i].probability * 100).toFixed(1)}%`;
        resultHTML += `<div class="prediction-item">${classPrediction}</div>`;
    }
    labelContainer.innerHTML = resultHTML;
    
    // 분류가 성공적으로 이루어졌을 때만 컨트롤 표시
    if (currentModel === 1) {
        document.getElementById("style-selection-controls").style.display = 'block';
        document.getElementById("tone-selection-controls").style.display = 'none'; 
    } else if (currentModel === 2) {
        document.getElementById("tone-selection-controls").style.display = 'block';
        document.getElementById("style-selection-controls").style.display = 'none'; 
    }
}


// ===============================================
// 8. Manual Recommendation Output 
// ===============================================

// 얼굴형 추천 출력
function showRecommendation(faceType) {
    const data = faceTypeData[faceType]; 
    const outputContainer = document.getElementById("recommendation-output");
    
    if (!data) {
        outputContainer.innerHTML = `<p style="color:red;">Error: No recommendation data found for ${faceType}.</p>`;
        return;
    }

    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>✨ Hairstyle Guide for ${faceType} Face Shape</h4>
            
            <p class="summary-text">${data.summary}</p>
            
            <div class="hair-styles-container">
                <div class="style-column">
                    <h5><i class="fas fa-cut"></i> Short Hair: ${data.short}</h5>
                    <img src="${data.shortImage}" alt="${faceType} Short Hairstyle">
                </div>
                
                <div class="style-column">
                    <h5><i class="fas fa-spa"></i> Long Hair: ${data.long}</h5>
                    <img src="${data.longImage}" alt="${faceType} Long Hairstyle">
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
}

// 퍼스널 톤 추천 출력
function showToneRecommendation(toneType) {
    const data = personalToneData[toneType]; 
    const outputContainer = document.getElementById("recommendation-output");
    
    if (!data) {
        outputContainer.innerHTML = `<p style="color:red;">Error: No recommendation data found for ${toneType}.</p>`;
        return;
    }

    const recommendationHTML = `
        <div class="recommendation-content">
            <h4>✨ Personal Color Guide for ${toneType} Tone</h4>
            
            <p class="summary-text">${data.summary}</p>
            
            <div class="tone-styles-container">
                <div class="tone-text-column">
                    <div class="tone-category">
                        <h5><i class="fas fa-cut"></i> Hair Colors</h5>
                        <p>${data.hair}</p>
                    </div>
                    <div class="tone-category">
                        <h5><i class="fas fa-tshirt"></i> Clothing Colors</h5>
                        <p>${data.clothing}</p>
                    </div>
                    <div class="tone-category">
                        <h5><i class="fas fa-gem"></i> Makeup Colors</h5>
                        <p>${data.makeup}</p>
                    </div>
                </div>
                <div class="tone-image-column">
                    <img src="${data.image}" alt="${toneType} Color Palette">
                </div>
            </div>
        </div>
    `;
    outputContainer.innerHTML = recommendationHTML; 
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

    if (currentSource === 'image' && document.getElementById('uploaded-image')) {
         document.getElementById("process-image-btn").innerText = 'Re-Analyze Image';
    }
}
