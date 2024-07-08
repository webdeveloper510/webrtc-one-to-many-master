window.onload = () => {
    populateDeviceOptions();

    document.getElementById('my-button').onclick = () => {
        init();
    }
}

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

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById("video").srcObject = stream;
    const peer = createPeer(roomId);
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
}

function createPeer(roomId) {
    const peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer, roomId);

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
