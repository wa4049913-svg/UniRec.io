/* ==========================================================
   UNIVERSAL SCREEN RECORDER PRO - SIMPLE VERSION
   Stop Sharing auto-stop + Webcam overlay (No aspect ratio)
   ========================================================== */

let mediaRecorder = null;
let recordedChunks = [];
let startTime = null;
let timerInterval = null;
let stream = null;
let webcamStream = null;
let isPaused = false;
let countdownInterval = null;
let canvasDrawingInterval = null;

/* ============ ELEMENTS ============ */
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');
const downloadBtn = document.getElementById('downloadBtn');
const stickyStopBtn = document.getElementById('stickyStopBtn');
const stickyPauseBtn = document.getElementById('stickyPauseBtn');
const timer = document.getElementById('timer');
const status = document.getElementById('status');
const preview = document.getElementById('preview');
const adBanner = document.getElementById('adNotificationBanner');
const skipBtn = document.getElementById('skipAdBtn');
const pauseIndicator = document.getElementById('pauseIndicator');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const webcamPreview = document.getElementById('webcamPreview');
const previewNote = document.getElementById('previewNote');

/* ============ NAV ============ */
function openNav() { document.getElementById("mySidenav").style.width = "270px"; }
function closeNav() { document.getElementById("mySidenav").style.width = "0"; }

/* ============ PRESETS ============ */
function applyPreset() {
    const preset = document.getElementById('preset').value;
    const quality = document.getElementById('quality');
    const fps = document.getElementById('fps');
    if (preset === 'gaming4k') { quality.value = '4k'; fps.value = '60'; }
    else if (preset === 'gaming') { quality.value = 'ultra'; fps.value = '60'; }
    else if (preset === 'tutorial') { quality.value = 'high'; fps.value = '30'; }
    else if (preset === 'meeting') { quality.value = 'medium'; fps.value = '30'; }
    else if (preset === 'social') { quality.value = 'high'; fps.value = '30'; }
}

/* ============ WEBCAM TOGGLE ============ */
function toggleWebcamOptions() {
    const enabled = document.getElementById('enableWebcam').checked;
    document.getElementById('webcamOptions').style.display = enabled ? 'block' : 'none';
}

/* ============ CANCEL COUNTDOWN ============ */
function cancelCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    if (countdownOverlay) countdownOverlay.classList.remove('active');
    status.innerText = 'Cancelled. Click Start to try again.';
    startBtn.disabled = false;
    cleanupAll();
}

/* ============ TIMER ============ */
function updateTimer() {
    let sec = Math.floor((Date.now() - startTime) / 1000);
    let h = String(Math.floor(sec / 3600)).padStart(2, '0');
    let m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    let s = String(sec % 60).padStart(2, '0');
    timer.innerText = `${h}:${m}:${s}`;
}

function parseTimerToMs(t) {
    const p = t.split(':');
    return ((parseInt(p[0]) * 3600) + (parseInt(p[1]) * 60) + parseInt(p[2])) * 1000;
}

/* ============ CLEANUP ============ */
function cleanupAll() {
    if (canvasDrawingInterval) {
        clearInterval(canvasDrawingInterval);
        canvasDrawingInterval = null;
    }
    if (stream) {
        stream.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
        stream = null;
    }
    if (webcamStream) {
        webcamStream.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
        webcamStream = null;
    }
    if (webcamPreview) {
        webcamPreview.srcObject = null;
        webcamPreview.style.display = 'none';
    }
}

/* ============ BEEP ============ */
function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
}

/* ============ DOWNLOAD ============ */
function handleDownloadClick() {
    if (recordedChunks.length === 0) return;
    adBanner.style.display = "flex";
    let count = 5;
    skipBtn.disabled = true;
    skipBtn.style.cursor = "not-allowed";
    skipBtn.style.background = "#555";
    skipBtn.innerText = `Generating Download Link in ${count}s`;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            skipBtn.innerText = `Generating Download Link in ${count}s`;
        } else {
            clearInterval(interval);
            skipBtn.disabled = false;
            skipBtn.style.cursor = "pointer";
            skipBtn.style.background = "#4f8cff";
            skipBtn.style.color = "#ffffff";
            skipBtn.innerText = "📥 Download Now";
        }
    }, 1000);
}

if (skipBtn) {
    skipBtn.addEventListener("click", () => {
        adBanner.style.display = "none";
        triggerActualDownload();
    });
}

function triggerActualDownload() {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'UniRec_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.webm';
    a.click();
    status.innerText = 'Downloaded successfully! ✅';
}

/* ==========================================================
   START RECORDING
   ========================================================== */
async function startRecording() {
    if (startBtn.disabled) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        status.innerText = '⚠️ Screen recording not supported on this browser.';
        return;
    }

    startBtn.disabled = true;

    /* Hide preview note when new recording starts */
    if (previewNote) previewNote.classList.remove('show');

    try {
        const mic = document.getElementById('micAudio').checked;
        const system = document.getElementById('systemAudio').checked;
        const fps = document.getElementById('fps').value;
        const quality = document.getElementById('quality').value;
        const webcamEnabled = document.getElementById('enableWebcam').checked;

        let videoWidth = 1280, videoHeight = 720;
        if (quality === '4k') { videoWidth = 3840; videoHeight = 2160; }
        else if (quality === 'ultra') { videoWidth = 2560; videoHeight = 1440; }
        else if (quality === 'high') { videoWidth = 1920; videoHeight = 1080; }
        else if (quality === 'low') { videoWidth = 854; videoHeight = 480; }

        let micStream = null;

        if (mic) {
            status.innerText = 'Step 1: Allow microphone access...';
            try {
                micStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true }
                });
            } catch (e) { console.log("Mic denied", e); }
        }

        if (webcamEnabled) {
            status.innerText = 'Step 2: Allow webcam access...';
            try {
                webcamStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 }, facingMode: 'user' },
                    audio: false
                });
                webcamPreview.srcObject = webcamStream;
                webcamPreview.style.display = 'block';
                await webcamPreview.play();
            } catch (e) {
                console.log("Webcam denied", e);
                webcamStream = null;
            }
        }

        status.innerText = 'Step 3: Choose what to record — Screen, Window, or Tab';
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                frameRate: parseInt(fps),
                width: { ideal: videoWidth },
                height: { ideal: videoHeight }
            },
            audio: system
        });

        /* ==========================================================
           AUTO-STOP — bas 'ended' event (simple aur working)
           ========================================================== */
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            console.log(">>> Screen share stopped — auto-stopping recording");
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                stopRecording();
            }
        });

        /* Mix audio */
        if (micStream) {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const dest = audioCtx.createMediaStreamDestination();
                if (screenStream.getAudioTracks().length > 0) {
                    audioCtx.createMediaStreamSource(screenStream).connect(dest);
                }
                audioCtx.createMediaStreamSource(micStream).connect(dest);
                screenStream.getAudioTracks().forEach(t => screenStream.removeTrack(t));
                dest.stream.getAudioTracks().forEach(t => screenStream.addTrack(t));
            } catch (e) { console.log("Audio mix failed", e); }
        }

        /* Merge webcam if enabled */
        if (webcamStream) {
            status.innerText = 'Preparing recording...';
            const wcPos = document.getElementById('webcamPosition').value;
            const wcSize = document.getElementById('webcamSize').value;
            stream = await mergeWebcamIntoStream(screenStream, webcamStream, wcPos, wcSize);
        } else {
            stream = screenStream;
        }

        /* NO COUNTDOWN — direct start */
        beginActualRecording();

    } catch (err) {
        console.error("Start error:", err);
        status.innerText = 'Recording cancelled. Click Start to try again.';
        startBtn.disabled = false;
        cleanupAll();
    }
}

/* ==========================================================
   MERGE WEBCAM (Simple — no aspect ratio)
   ========================================================== */
async function mergeWebcamIntoStream(screenStream, wcStream, position, size) {
    const screenVideo = document.createElement('video');
    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.autoplay = true;
    await screenVideo.play();

    const webcamVideo = document.createElement('video');
    webcamVideo.srcObject = wcStream;
    webcamVideo.muted = true;
    webcamVideo.playsInline = true;
    webcamVideo.autoplay = true;
    await webcamVideo.play();

    await new Promise(resolve => {
        let checks = 0;
        const check = () => {
            checks++;
            if ((screenVideo.videoWidth > 0 && webcamVideo.videoWidth > 0) || checks > 50) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });

    const screenWidth = screenVideo.videoWidth || 1920;
    const screenHeight = screenVideo.videoHeight || 1080;

    const sizeMap = { small: 0.15, medium: 0.20, large: 0.28 };
    const sizeRatio = sizeMap[size] || 0.20;
    const wcSize = Math.round(screenWidth * sizeRatio);
    const margin = Math.round(screenWidth * 0.02);

    let x, y;
    switch (position) {
        case 'top-left':     x = margin; y = margin; break;
        case 'top-right':    x = screenWidth - wcSize - margin; y = margin; break;
        case 'bottom-left':  x = margin; y = screenHeight - wcSize - margin; break;
        case 'bottom-right': x = screenWidth - wcSize - margin; y = screenHeight - wcSize - margin; break;
        default:             x = screenWidth - wcSize - margin; y = margin;
    }

    const canvas = document.createElement('canvas');
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    const targetFps = parseInt(document.getElementById('fps').value) || 30;
    const frameInterval = 1000 / targetFps;

    canvasDrawingInterval = setInterval(() => {
        try {
            ctx.drawImage(screenVideo, 0, 0, screenWidth, screenHeight);

            ctx.save();
            ctx.beginPath();
            ctx.arc(x + wcSize / 2, y + wcSize / 2, wcSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(webcamVideo, x, y, wcSize, wcSize);
            ctx.restore();

            ctx.strokeStyle = '#4f8cff';
            ctx.lineWidth = Math.max(3, Math.round(screenWidth / 640));
            ctx.beginPath();
            ctx.arc(x + wcSize / 2, y + wcSize / 2, wcSize / 2, 0, Math.PI * 2);
            ctx.stroke();
        } catch (e) {}
    }, frameInterval);

    const combinedStream = canvas.captureStream(targetFps);
    screenStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));

    return combinedStream;
}

/* ============ ACTUAL RECORDING ============ */
function beginActualRecording() {
    try {
        if (!stream) {
            status.innerText = 'Error: No stream available.';
            startBtn.disabled = false;
            return;
        }

        recordedChunks = [];

        let mimeType = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        const quality = document.getElementById('quality').value;
        let bitrate = 8000000;
        if (quality === '4k') bitrate = 40000000;
        else if (quality === 'ultra') bitrate = 20000000;
        else if (quality === 'high') bitrate = 12000000;
        else if (quality === 'medium') bitrate = 8000000;
        else if (quality === 'low') bitrate = 4000000;

        const options = {
            mimeType: mimeType,
            videoBitsPerSecond: bitrate,
            audioBitsPerSecond: 128000
        };

        mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };

        /* ============ mediaRecorder.onstop — HIGH QUALITY PREVIEW ============ */
        mediaRecorder.onstop = () => {
            if (recordedChunks.length === 0) {
                status.innerText = 'No data recorded. Try again.';
                startBtn.disabled = false;
                return;
            }

            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            /* HIGH QUALITY PREVIEW */
            preview.src = url;
            preview.style.display = 'block';

            preview.setAttribute('preload', 'metadata');
            preview.setAttribute('playsinline', 'true');

            preview.onloadedmetadata = () => {
                console.log('✅ Preview native size:', preview.videoWidth, 'x', preview.videoHeight);

                preview.width = preview.videoWidth;
                preview.height = preview.videoHeight;
                preview.style.width = '100%';
                preview.style.maxWidth = preview.videoWidth + 'px';
                preview.style.height = 'auto';
                preview.style.aspectRatio = preview.videoWidth + ' / ' + preview.videoHeight;
                preview.style.objectFit = 'contain';
                preview.style.imageRendering = 'high-quality';
            };

            preview.onloadeddata = () => {
                preview.currentTime = 0;
            };

            /* SHOW PREVIEW NOTE */
            if (previewNote) previewNote.classList.add('show');

            downloadBtn.style.display = 'inline-block';
            status.innerText = 'Recording completed! Click Download.';
            pauseIndicator.classList.remove('active');
            startBtn.disabled = false;

            playBeep();

            if (canvasDrawingInterval) {
                clearInterval(canvasDrawingInterval);
                canvasDrawingInterval = null;
            }
            if (webcamPreview) {
                webcamPreview.srcObject = null;
                webcamPreview.style.display = 'none';
            }
        };

        mediaRecorder.onerror = e => console.error("Recorder error:", e);

        mediaRecorder.start(1000);

        startBtn.disabled = true;
        stopBtn.disabled = false;
        pauseBtn.disabled = false;
        stickyStopBtn.disabled = false;
        stickyPauseBtn.disabled = false;

        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
        status.innerText = '🔴 Recording in progress...';

    } catch (err) {
        console.error("Recording error:", err);
        status.innerText = 'Error starting recording.';
        startBtn.disabled = false;
    }
}

/* ============ PAUSE / RESUME ============ */
function pauseRecording() {
    if (!mediaRecorder) return;
    if (mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        isPaused = true;
        clearInterval(timerInterval);
        pauseBtn.innerText = "▶️ Resume";
        stickyPauseBtn.innerText = "▶️ Resume";
        pauseIndicator.classList.add('active');
    } else if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        isPaused = false;
        startTime = Date.now() - parseTimerToMs(timer.innerText);
        timerInterval = setInterval(updateTimer, 1000);
        pauseBtn.innerText = "⏸️ Pause";
        stickyPauseBtn.innerText = "⏸️ Pause";
        pauseIndicator.classList.remove('active');
    }
}

/* ============ STOP ============ */
function stopRecording() {
    try {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    } catch (e) {}

    if (stream) {
        stream.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
    }
    if (webcamStream) {
        webcamStream.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
        webcamPreview.srcObject = null;
        webcamPreview.style.display = 'none';
    }

    if (canvasDrawingInterval) {
        clearInterval(canvasDrawingInterval);
        canvasDrawingInterval = null;
    }

    stopBtn.disabled = true;
    pauseBtn.disabled = true;
    stickyStopBtn.disabled = true;
    stickyPauseBtn.disabled = true;
    clearInterval(timerInterval);
    pauseIndicator.classList.remove('active');
}

/* ============ PWA INSTALL ============ */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'inline-block';
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    }
}

/* ============ MODALS ============ */
function openModal(id) { document.getElementById(id).style.display = "block"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
window.onclick = function (e) {
    if (e.target.className === "modal") { e.target.style.display = "none"; }
}

/* ============ NOTIFICATION PERMISSION ============ */
if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => {
        Notification.requestPermission();
    }, 3000);
}
