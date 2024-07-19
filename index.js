const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const webrtc = require('wrtc');
const cors = require('cors');

let streams = {}; // Dictionary to store streams with room IDs
let hosts = {};   // Dictionary to keep track of hosts by room IDs
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/consumer', async ({ body }, res) => {
    const { sdp, roomId } = body;
    if (!streams[roomId]) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    const peer = new webrtc.RTCPeerConnection({
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

    const desc = new webrtc.RTCSessionDescription(sdp);
    await peer.setRemoteDescription(desc);

    streams[roomId]?.getTracks()?.forEach(track => peer?.addTrack(track, streams[roomId]));
    
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    };

    res.json(payload);
});

app.post('/broadcast', async ({ body }, res) => {
    const { sdp, roomId } = body;

    // Check if there is already a host for the given room ID
    // if (hosts[roomId]) {
    //     return res.status(400).json({ error: 'Room already has a host' });
    // }

    const peer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:global.stun.twilio.com:3478",
              ],
            },
          ]
    });

    peer.ontrack = (e) => handleTrackEvent(e, peer, roomId);

    const desc = new webrtc.RTCSessionDescription(sdp);
    await peer.setRemoteDescription(desc);

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    };

    // Set the host for this room ID
    hosts[roomId] = peer;

    res.json(payload);
});
app.post('/end', async ({ body }, res) => {
    const { roomId } = body;

    if (!hosts[roomId]) {
        return res.status(404).json({ error: 'Room not found or no active host' });
    }

    hosts[roomId].close();
    delete hosts[roomId];
    delete streams[roomId];

    res.json({ message: 'Stream ended' });
});

app.get('/status/:roomId', (req, res) => {
    const { roomId } = req.params;
    const isLive = !!hosts[roomId];

    res.json({ roomId, isLive });
});
function handleTrackEvent(e, peer, roomId) {
    streams[roomId] = e.streams[0];
}

app.listen(5000, () => console.log('server started'));
