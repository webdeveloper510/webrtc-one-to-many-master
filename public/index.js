window.onload = () => {
    populateDeviceOptions();

    document.getElementById('my-button').onclick = () => {
        init();
    }

    document.getElementById('mute-audio').onclick = () => {
        muteAudio();
    }

    document.getElementById('unmute-audio').onclick = () => {
        unmuteAudio();
    }

    document.getElementById('stop-video').onclick = () => {
        stopVideo();
    }

    document.getElementById('resume-video').onclick = () => {
        resumeVideo();
    }
}

let stream;
let peer;

async function populateDeviceOptions() {
    const videoSelect = document.getElementById('videoSource');
    const audioSelect = document.getElementById('audioSource');

    const devices = await navigator.mediaDevices.enumerateDevices();

    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        if (device.kind === 'videoinput') {
            option.text = device.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        } else if (device.kind === 'audioinput') {
            option.text = device.label || `Microphone ${audioSelect.length + 1}`;
            audioSelect.appendChild(option);
        }
    });
}

async function init() {
    const roomId = document.getElementById('roomId').value;
    const videoSource = document.getElementById('videoSource').value;
    const audioSource = document.getElementById('audioSource').value;

    if (!roomId) {
        alert('Please enter a Room ID');
        return;
    }

    const constraints = {
        video: { deviceId: videoSource ? { exact: videoSource } : undefined },
        audio: { deviceId: audioSource ? { exact: audioSource } : undefined }
    };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById("video").srcObject = stream;
        setupMicMeter(stream);

        peer = createPeer(roomId);
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
    } catch (error) {
        alert('Could not access media devices. Please make sure your camera and microphone are connected.');
        console.error(error);
    }
}

function createPeer(roomId) {
    const peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:global.stun.twilio.com:3478",
                  ],
            },
            { urls: 'turn:54.235.30.116:3478', username: 'admin', credential: 'pass@123' }
        ]
    });

    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer, roomId);
    peer.oniceconnectionstatechange = handleICEConnectionStateChange;
    peer.onconnectionstatechange = handleConnectionStateChange;

    return peer;
}

async function handleNegotiationNeededEvent(peer, roomId) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription,
        roomId: roomId
    };

    try {
        const { data } = await axios.post('/broadcast', payload);
        const desc = new RTCSessionDescription(data.sdp);
        await peer.setRemoteDescription(desc);
    } catch (error) {
        alert(`Error: ${error.response.data.error}`);
    }
}

function handleICEConnectionStateChange() {
    switch (peer.iceConnectionState) {
        case 'disconnected':
        case 'failed':
            alert('Your video is not streaming due to connectivity issues.');
            break;
        case 'closed':
            alert('Connection closed.');
            break;
    }
}

function handleConnectionStateChange() {
    switch (peer.connectionState) {
        case 'disconnected':
        case 'failed':
            alert('Your video is not streaming due to connectivity issues.');
            break;
        case 'closed':
            alert('Connection closed.');
            break;
    }
}

function muteAudio() {
    stream.getAudioTracks().forEach(track => track.enabled = false);
}

function unmuteAudio() {
    stream.getAudioTracks().forEach(track => track.enabled = true);
}

function stopVideo() {
    stream.getVideoTracks().forEach(track => track.enabled = false);
}

function resumeVideo() {
    stream.getVideoTracks().forEach(track => track.enabled = true);
}

function setupMicMeter(stream) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    mediaStreamSource.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const micMeter = document.getElementById('mic-meter');

    function updateMeter() {
        analyser.getByteFrequencyData(dataArray);
        let values = 0;
        const length = dataArray.length;
        for (let i = 0; i < length; i++) {
            values += dataArray[i];
        }
        const average = values / length;
        micMeter.value = average / 256; // Normalizing to 0-1 range
        requestAnimationFrame(updateMeter);
    }
    updateMeter();
}

// Detect network issues
window.addEventListener('offline', () => {
    alert('Network connection lost. Please check your internet connection.');
});

window.addEventListener('online', () => {
    alert('Network connection restored.');
});
