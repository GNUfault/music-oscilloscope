const canvas = document.getElementById('oscilloscope');
        const ctx = canvas.getContext('2d');
        const fileInput = document.getElementById('fileInput');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const repeatBtn = document.getElementById('repeatBtn');
        
        let audioContext = null;
        let analyser = null;
        let dataArray = null;
        let animationId = null;
        let currentSource = null;
        let isPlaying = false;
        let shouldRepeat = false;
        let audioBuffer = null;
        let startTime = 0;
        let pausedAt = 0;
        let isPausedIntentionally = false;
        
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        
        function playAudio(buffer, offset = 0) {
            if (currentSource) {
                currentSource.stop();
                currentSource.disconnect();
                currentSource = null;
            }
            
            currentSource = audioContext.createBufferSource();
            currentSource.buffer = buffer;
            currentSource.connect(analyser);
            analyser.connect(audioContext.destination);
            
            startTime = audioContext.currentTime - offset;
            currentSource.start(0, offset);
            
            isPausedIntentionally = false;
            
            currentSource.onended = function() {
                if (!isPausedIntentionally) {
                    if (shouldRepeat) {
                        playAudio(buffer, 0);
                    } else {
                        isPlaying = false;
                        playPauseBtn.textContent = "▶";
                        pausedAt = 0;
                        if (animationId) {
                            cancelAnimationFrame(animationId);
                            animationId = null;
                        }
                        drawIdleLine();
                    }
                }
            };
            
            isPlaying = true;
            playPauseBtn.textContent = "⏸";
            
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            draw();
        }
        
        function togglePlayPause() {
            if (!audioBuffer) return;
            
            if (isPlaying) {
                isPausedIntentionally = true;
                if (currentSource) {
                    currentSource.stop();
                    currentSource.disconnect();
                    currentSource = null;
                    pausedAt = audioContext.currentTime - startTime;
                }
                isPlaying = false;
                playPauseBtn.textContent = "▶";
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
                drawIdleLine();
            } else {
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                playAudio(audioBuffer, pausedAt);
            }
        }
        
        function toggleRepeat() {
            shouldRepeat = !shouldRepeat;
            repeatBtn.style.backgroundColor = shouldRepeat ? "#333333" : "#000";
        }
        
        playPauseBtn.addEventListener('click', togglePlayPause);
        repeatBtn.addEventListener('click', toggleRepeat);
        
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            if (audioContext === null) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                dataArray = new Uint8Array(analyser.frequencyBinCount);
            }
            
            const fileReader = new FileReader();
            fileReader.onload = function(e) {
                audioContext.decodeAudioData(e.target.result)
                    .then(function(buffer) {
                        audioBuffer = buffer;
                        pausedAt = 0;
                        playAudio(buffer, 0);
                    })
                    .catch(function(error) {
                        console.error("Audio type not supported:", error);
                        alert("Audio type not supported.");
                    });
            };
            fileReader.onerror = function(error) {
                console.error("Error reading file:", error);
                alert("Error reading file. Please try again.");
            };
            fileReader.readAsArrayBuffer(file);
        });
        
        function draw() {
            animationId = requestAnimationFrame(draw);
            
            if (isPlaying) {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            analyser.getByteTimeDomainData(dataArray);
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'lime';
            ctx.beginPath();
            
            const bufferLength = analyser.frequencyBinCount;
            const sliceWidth = canvas.width / bufferLength;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                x += sliceWidth;
            }
            
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        }

        function drawIdleLine() {
            if (isPlaying) return;
            
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = 'lime';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        }

        document.addEventListener('DOMContentLoaded', () => {
            resizeCanvas();
            drawIdleLine();
        });
