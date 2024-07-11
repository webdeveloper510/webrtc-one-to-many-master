window.onload = () => {
    document.getElementById('my-button').onclick = () => {
        init();
    }
}

async function init() {
    const roomId = document.getElementById('roomId').value;
    if (!roomId) {
        alert('Please enter a Room ID');
        return;
    }

    const peer = createPeer(roomId);
    peer.addTransceiver("video", { direction: "recvonly" });
}

function createPeer(roomId) {
    const peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: 'stun:stun.stunprotocol.org'
            },
            { urls: 'turn:54.235.30.116:3478', username: 'admin', credential: 'pass@123' }
          ]
    });
    peer.ontrack = handleTrackEvent;
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
        const { data } = await axios.post('/consumer', payload);
        const desc = new RTCSessionDescription(data.sdp);
        await peer.setRemoteDescription(desc);
    } catch (error) {
        alert(`Error: ${error.response.data.error}`);
    }
}

function handleTrackEvent(e) {
    document.getElementById("video").srcObject = e.streams[0];
}
