let mediaRecorder;
let audioChunks = [];

document.getElementById("startRecord").addEventListener("click", async () => {
  try {
    chrome.tabCapture.capture(
      {
        audio: true,
        video: false,
        audioConstraints: {
          mandatory: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        },
      },
      (stream) => {
        if (!stream) {
          console.error("Error: No stream received");
          return;
        }

        // Create an AudioContext to handle the audio stream
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const destination = audioContext.createMediaStreamDestination();

        // Connect the source to both the destination and audio context destination
        source.connect(destination);
        source.connect(audioContext.destination); // This allows you to hear the audio while recording

        mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: "audio/webm;codecs=opus",
          audioBitsPerSecond: 128000,
        });

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          const url = URL.createObjectURL(audioBlob);

          chrome.downloads.download({
            url: url,
            filename: "tab-recording.webm",
          });

          audioChunks = [];
          stream.getTracks().forEach((track) => track.stop());
          audioContext.close();
        };

        mediaRecorder.start(1000);
        document.getElementById("startRecord").disabled = true;
        document.getElementById("stopRecord").disabled = false;
      }
    );
  } catch (err) {
    console.error("Error capturing tab audio:", err);
  }
});

document.getElementById("stopRecord").addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    document.getElementById("startRecord").disabled = false;
    document.getElementById("stopRecord").disabled = true;
  }
});
