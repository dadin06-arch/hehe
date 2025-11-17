// script.js - AI StyleMate Logic (Final Version with Face Detection)

// ----------------------------------------------------
// 1. MODEL PATHS, VARIABLES & DATA DEFINITION
// ( ... 기존 코드 생략 ... )
// ----------------------------------------------------

// 💡 새로운 상수 추가: 최소 예측 확률 임계값 (60%)
const MIN_CONFIDENCE_THRESHOLD = 0.60; 


// ( ... 기존 코드 생략 ... )
// ===============================================
// 7. Core Prediction and UI Update (핵심 수정 부분)
// ===============================================

async function predict(modelToUse, modelName, element) {
    if (!modelToUse || !faceDetectorModel) {
        labelContainer.innerHTML = `Error: ${modelName} or Face Detector is not loaded.`;
        return;
    }
    
    // ----------------------------------------------------------------
    // 💡 1. 얼굴 감지(Face Detection) 로직: 얼굴의 명확성 확인
    // ( ... 기존 얼굴 감지/크기 검사 로직 유지 ... )
    // ----------------------------------------------------------------
    const predictions = await faceDetectorModel.estimateFaces(element, FACE_DETECTION_THRESHOLD);

    if (predictions.length === 0) {
        labelContainer.innerHTML = '<div style="color: red; font-weight: bold; padding: 10px;">⚠️ 경고: 얼굴이 명확하게 감지되지 않았습니다!</div><p>분석을 진행하려면 얼굴이 정면으로 잘 보이고, 충분히 밝으며, 가려지지 않았는지 확인해 주세요.</p>';
        document.getElementById("recommendation-output").innerHTML = '<p>얼굴 인식 실패: 명확한 얼굴을 감지할 수 없습니다.</p>';
        
        document.getElementById("style-selection-controls").style.display = 'none';
        document.getElementById("tone-selection-controls").style.display = 'none';
        return; 
    }
    
    // 선택적: 얼굴 크기 검사 (너무 멀리 있거나 작게 찍힌 경우)
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
    
    // ----------------------------------------------------------------
    // 💡 2. 분류(Classification) 로직: 얼굴이 명확할 때만 실행
    // ----------------------------------------------------------------
    
    const currentMaxPredictions = modelToUse.getTotalClasses(); 
    const prediction = await modelToUse.predict(element);

    // 💡 3. 최고 확률 검사 및 경고 메시지 추가 로직
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
    
    if (currentModel === 1) {
        document.getElementById("style-selection-controls").style.display = 'block';
        document.getElementById("tone-selection-controls").style.display = 'none'; 
    } else if (currentModel === 2) {
        document.getElementById("tone-selection-controls").style.display = 'block';
        document.getElementById("style-selection-controls").style.display = 'none'; 
    }
}

// ( ... 이하 기존 코드 유지 ... )
