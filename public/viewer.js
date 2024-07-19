window.onload = () => {
    document.getElementById('my-button').onclick = () => {
        init();
    }
}

async function init() {
    console.log("init running again and agian")
    const roomId = document.getElementById('roomId').value;
    if (!roomId) {
        alert('Please enter a Room ID');
        return;
    }

    const peer = createPeer(roomId);
    peer.addTransceiver("video", { direction: "recvonly" });
    peer.addTransceiver("audio", { direction: "recvonly" });
    startPolling(roomId,peer);
}

function createPeer(roomId) {
    const peer = new RTCPeerConnection({
        iceServers: [
            // {
            //     urls: [
            //         "stun:stun.l.google.com:19302",
            //         "stun:global.stun.twilio.com:3478",
            //       ],
            // },
            { urls: 'turn:54.196.181.163:3478', username: 'admin', credential: 'pass@123' },
            { urls: 'stun:54.196.181.163:3478', username: 'admin', credential: 'pass@123' },       
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

async function startPolling(roomId,peer) {
    try {
        const { data } = await axios.get(`/status/${roomId}`);
        console.log("🚀 ~ startPolling ~ data:", data,data.isLive)
        if (data.isLive === false) {
            console.log("if condition running again and agian")

            peer.close();
            document.getElementById("video").srcObject = null;
            alert('Video has ended');
        } else {
            setTimeout(()=>{
    console.log("else condition running again and agian")

                startPolling(roomId,peer)
            }, 5000);
        }
    } catch (error) {
        console.error('Error polling room status:', error);
        setTimeout(()=>{
            console.log("catch condition running again and agian")

            startPolling(roomId,peer)
        }, 5000);
    }
}