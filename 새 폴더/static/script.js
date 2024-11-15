// static/script.js

const socket = io();

// 비디오 요소 및 캔버스 초기화
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const jointCanvas = document.getElementById('jointCanvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const ctx = jointCanvas.getContext('2d');

// WebRTC 관련 변수
let localStream;
let peerConnections = {};
const config = {
    'iceServers': [
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
};

// MediaPipe Pose 초기화
const pose = new Pose.Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.4/${file}`;
    }
});
pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
pose.onResults(onPoseResults);

// 웹캠 스트림 캡처
async function startVideo() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        // MediaPipe Pose 시작
        const camera = new Camera(localVideo, {
            onFrame: async () => {
                await pose.send({ image: localVideo });
            },
            width: 640,
            height: 480
        });
        camera.start();
    } catch (err) {
        console.error('웹캠 접근 실패:', err);
    }
}

// 포즈 결과 처리
function onPoseResults(results) {
    ctx.clearRect(0, 0, jointCanvas.width, jointCanvas.height);
    if (results.poseLandmarks) {
        // 관절 위치 그리기
        for (let landmark of results.poseLandmarks) {
            ctx.beginPath();
            ctx.arc(landmark.x * jointCanvas.width, landmark.y * jointCanvas.height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }
        // 관절 데이터를 서버로 전송
        socket.emit('joint_data', results.poseLandmarks);
    }
}

// 회의 시작 버튼 클릭 시
startBtn.onclick = () => {
    startVideo();
    // 서버에 회의 시작 알림
    socket.emit('join_meeting');
};

// 회의 종료 버튼 클릭 시
stopBtn.onclick = () => {
    // 스트림 중지
    localStream.getTracks().forEach(track => track.stop());
    // 서버에 회의 종료 알림
    socket.emit('leave_meeting');
};

// Socket.IO 이벤트 핸들러
socket.on('user_connected', (data) => {
    console.log('사용자 연결:', data.sid);
    // 새로운 피어 연결 설정
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[data.sid] = peerConnection;

    // 로컬 스트림 트랙 추가
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // ICE 후보 처리
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', {
                to: data.sid,
                candidate: event.candidate
            });
        }
    };

    // 원격 스트림 수신 처리
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Offer 생성 및 전송
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('signal', {
                to: data.sid,
                description: peerConnection.localDescription
            });
        });
});

socket.on('signal', async (data) => {
    const from = data.from;
    if (!peerConnections[from]) {
        const peerConnection = new RTCPeerConnection(config);
        peerConnections[from] = peerConnection;

        // 로컬 스트림 트랙 추가
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // ICE 후보 처리
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', {
                    to: from,
                    candidate: event.candidate
                });
            }
        };

        // 원격 스트림 수신 처리
        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };
    }

    const peerConnection = peerConnections[from];

    if (data.description) {
        const desc = new RTCSessionDescription(data.description);
        await peerConnection.setRemoteDescription(desc);
        if (desc.type === 'offer') {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('signal', {
                to: from,
                description: peerConnection.localDescription
            });
        }
    } else if (data.candidate) {
        try {
            await peerConnection.addIceCandidate(data.candidate);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
});

socket.on('joint_data', (data) => {
    // 다른 사용자의 관절 데이터를 캔버스에 그리기
    // 이 부분은 추가 구현이 필요함
});
