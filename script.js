let model, webcam, labelContainer, maxPredictions;
let currentModel = null; // 현재 로드된 모델 (1: 얼굴형, 2: 톤)

// 얼굴형별 추천 데이터 및 이미지 URL 정의
const faceTypeData = {
    // ⚠️ 모델의 레이블 이름과 정확히 일치해야 합니다. (예: "Oval", "Round" 등)
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
    // ⚠️ 실제 모델 레이블에 맞춰 추가/수정해야 합니다.
};

const defaultRecommendation = {
    summary: "Please run the Face Type Analysis first.",
    short: "Select a model and click 'Start Analysis'.",
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

    if (webcam) {
        await webcam.stop();
        document.getElementById("webcam-container").innerHTML = '<p id="initial-message">Select a mode to begin.</p>';
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
        
        const modeWebcamBtn = document.getElementById('mode-webcam');
        if (modeWebcamBtn && modeWebcamBtn.classList.contains('active')) {
             setupWebcam();
        } else {
             document.getElementById("initial-message").innerText = "Image Upload Mode ready. Select an image.";
        }
        
        document.getElementById('process-image-btn').disabled = false;


    } catch (e) {
        console.error("Model loading failed:", e);
        document.getElementById("current-model-info").innerText = "Active Model: Error loading model. Check console for details.";
         document.getElementById('process-image-btn').disabled = true;
    }
}

// 2. 웹캠 설정
async function setupWebcam() {
    if (webcam) {
        await webcam.stop();
    }
    const container = document.getElementById("webcam-container");
    container.innerHTML = ''; 
    
    webcam = new tmImage.Webcam(400, 400, true); 
    await webcam.setup();
    await webcam.play();
    container.appendChild(webcam.canvas);
}

// 3. 예측 함수
async function predict() {
    if (!model) {
        alert("Please load a model first (Face Type or Personal Tone).");
        return;
    }

    let inputElement;
    let isWebcamMode = document.getElementById('mode-webcam').classList.contains('active');

    if (isWebcamMode) {
        if (!webcam || !webcam.canvas) {
            alert("Webcam is not running. Please restart the webcam or switch to image upload mode.");
            return;
        }
        inputElement = webcam.canvas;
    } else {
        inputElement = document.getElementById('uploaded-img');
        if (!inputElement) {
            alert("Please upload an image first.");
            return;
        }
    }

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
                        ${data.shortImage ? `<div class="image-wrapper">${data.shortImage}</div>` : ''}
                    </div>
                    
                    <div class="long-hair-section">
                        <h4><i class="fas fa-spa"></i> Long Hair: ${data.long}</h4>
                        ${data.longImage ? `<div class="image-wrapper">${data.longImage}</div>` : ''}
                    </div>
                    
                    <div class="summary-final">
                        Summary: ${data.summary}
                    </div>
                </div>
            </div>
        `;
        labelContainer.innerHTML += recommendationHTML; 

    } else if (currentModel === 2) {
        // 퍼스널 톤 모델의 경우 간단한 안내만 표시
        const toneResultHTML = `
            <div class="recommendation-box">
                <h3>✨ Recommended Tone (Highest Match: ${maxPrediction.className})</h3>
                <p>Based on your **Personal Tone** result, you can find the best matching makeup and clothing colors!</p>
            </div>
        `;
        labelContainer.innerHTML += toneResultHTML;
    }
}

// 4. 모드 및 모델 전환 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    
    const modeWebcam = document.getElementById('mode-webcam');
    const modeUpload = document.getElementById('mode-upload');
    const webcamContainer = document.getElementById('webcam-container');
    const webcamControls = document.getElementById('webcam-controls');
    const uploadControls = document.getElementById('upload-controls');
    const imageUpload = document.getElementById('image-upload');
    const processImageBtn = document.getElementById('process-image-btn');

    // ⚠️ 모델 로드 경로를 'models/model_1/' 및 'models/model_2/'로 최종 수정
    document.getElementById('model1-btn').addEventListener('click', () => init("models/model_1/", 1));
    document.getElementById('model2-btn').addEventListener('click', () => init("models/model_2/", 2));
    
    // Start Analysis Button
    document.getElementById('start-button').addEventListener('click', predict);
    processImageBtn.addEventListener('click', predict);


    // Webcam Mode Activation
    modeWebcam.addEventListener('click', async () => {
        modeWebcam.classList.add('active');
        modeUpload.classList.remove('active');
        webcamControls.style.display = 'block';
        uploadControls.style.display = 'none';
        
        // Remove uploaded image
        const uploadedImg = document.getElementById('uploaded-img');
        if (uploadedImg) uploadedImg.remove();
        
        // Start webcam if model is loaded, otherwise prompt user to load model
        if (model) {
            setupWebcam();
        } else {
            webcamContainer.innerHTML = '<p id="initial-message">Please select a model first (Face Type or Personal Tone).</p>';
        }
    });

    // Image Upload Mode Activation
    modeUpload.addEventListener('click', async () => {
        modeUpload.classList.add('active');
        modeWebcam.classList.remove('active');
        webcamControls.style.display = 'none';
        uploadControls.style.display = 'block';

        // Stop webcam
        if (webcam) {
            await webcam.stop();
            webcamContainer.innerHTML = '<p id="initial-message">Upload an image to start analysis.</p>';
            webcam = null;
        } else {
             webcamContainer.innerHTML = '<p id="initial-message">Upload an image to start analysis.</p>';
        }
    });
    
    // Image Upload Handling
    imageUpload.addEventListener('change', (event) => {
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
                
                // Remove existing image and add new one
                const existingImg = document.getElementById('uploaded-img');
                if (existingImg) existingImg.remove();
                
                webcamContainer.appendChild(img);
                
                // Enable process button if model is already loaded
                processImageBtn.disabled = !model; 
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 초기 설정: 기본은 웹캠 모드
    modeWebcam.click(); 
});
