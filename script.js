// 1. ELEMENTS
const video = document.getElementById("video");
const status = document.getElementById("status");
const output = document.getElementById("outputText");

let detectionInterval = null;

// 2. MAIN INIT (runs everything in the right order)
async function init() {

  // STEP 1: Load AI models first
  status.innerText = "Loading AI models...";

  try {
    await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'),
  faceapi.nets.faceExpressionNet.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights')
]);
    status.innerText = "Models loaded ✔️";
  } catch (err) {
    status.innerText = "❌ Failed to load AI models";
    console.error(err);
    return; // stop here if models fail
  }

  // STEP 2: Start camera after models are ready
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      }
    });

    video.srcObject = stream;
    await new Promise(resolve => video.onloadedmetadata = resolve);
    video.play();

  } catch (err) {
    status.innerText = "❌ Kamera tidak bisa diakses";
    console.error(err);
    return; // stop here if camera fails
  }

  // STEP 3: Start detection
  start();
}

// 3. START DETECTION LOOP
function start() {

  status.innerText = "Initializing AI...";

  setTimeout(() => {
    status.innerText = "Camera Ready ✔️";
  }, 1000);

  setTimeout(() => {
    status.innerText = "Scanning face...";
  }, 2000);

  // 🔁 LOOP every 200ms
  detectionInterval = setInterval(async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections.length > 0) {
        const exp = detections[0].expressions;
        checkEmotion(exp);
      }
    } catch (err) {
      console.error("Detection error:", err);
    }

  }, 200);
}

// 4. EMOTION LOGIC
function checkEmotion(exp) {

  if (exp.happy > 0.7) {
    document.body.className = "happy";
    status.innerText = "Emotion: HAPPY";
    output.innerText = "Saya ingin berbicara 😊";
  }

  else if (exp.angry > 0.5) {
    document.body.className = "angry";
    status.innerText = "Emotion: ANGRY";
    output.innerText = "Tolong jangan ganggu saya 😠";
  }

  else {
    document.body.className = "neutral";
    status.innerText = "Emotion: NEUTRAL";
    output.innerText = "Saya sedang berpikir...";
  }
}

// HAND GESTURE SETUP
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    checkGesture(landmarks);
  }
});

// Start MediaPipe camera
const mpCamera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 1280,
  height: 720
});
mpCamera.start();

function checkGesture(landmarks) {
  // Tip of each finger (index = 8, middle = 12, ring = 16, pinky = 20)
  // Base of each finger (index = 6, middle = 10, ring = 14, pinky = 18)
  // Thumb tip = 4, Thumb base = 2

  const fingers = {
    index:  landmarks[8].y  < landmarks[6].y,
    middle: landmarks[12].y < landmarks[10].y,
    ring:   landmarks[16].y < landmarks[14].y,
    pinky:  landmarks[20].y < landmarks[18].y,
  };

  const raisedCount = Object.values(fingers).filter(Boolean).length;

  if (raisedCount === 4) {
    output.innerText = "✋ Open Hand";
  } else if (raisedCount === 1 && fingers.index) {
    output.innerText = "☝️ Pointing";
  } else if (raisedCount === 2 && fingers.index && fingers.middle) {
    output.innerText = "✌️ Peace";
  } else if (raisedCount === 0) {
    output.innerText = "✊ Fist";
  }
}

// 5. RUN
init();