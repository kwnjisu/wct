<!-- static/Capturing.js -->
<!-- Camera 클래스는 MediaPipe에서 제공하는 예제 코드입니다. 직접 구현하거나 MediaPipe의 카메라 예제를 참고하세요. -->
<script>
    class Camera {
        constructor(videoElement, options) {
            this.video = videoElement;
            this.onFrame = options.onFrame;
            this.width = options.width;
            this.height = options.height;
            this.interval = null;
        }

        async start() {
            await this.video.play();
            this.interval = setInterval(this.onFrame, 1000 / 30);
        }

        stop() {
            clearInterval(this.interval);
        }
    }
</script>
