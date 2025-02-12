let mediaRecorder;
let audioChunks = [];

document.getElementById("startRecord").addEventListener("click", async () => {
  try {
    // Use chrome.tabCapture API instead of getUserMedia
    chrome.tabCapture.capture(
      {
        audio: true,
        video: false,
      },
      (stream) => {
        if (!stream) {
          console.error("Error: No stream received");
          return;
        }

        mediaRecorder = new MediaRecorder(stream);

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
        };

        mediaRecorder.start();
        document.getElementById("startRecord").disabled = true;
        document.getElementById("stopRecord").disabled = false;
      }
    );
  } catch (err) {
    console.error("Error capturing tab audio:", err);
  }
});

document.getElementById("stopRecord").addEventListener("click", () => {
  mediaRecorder.stop();
  document.getElementById("startRecord").disabled = false;
  document.getElementById("stopRecord").disabled = true;
});
