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

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const destination = audioContext.createMediaStreamDestination();

        source.connect(destination);
        source.connect(audioContext.destination);

        mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: "audio/webm;codecs=opus",
          audioBitsPerSecond: 128000,
        });

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

          // Create a status element in the popup
          const statusDiv = document.createElement("div");
          statusDiv.textContent = "Starting transcription process...";
          document.body.appendChild(statusDiv);

          try {
            // First save the audio file
            const audioUrl = URL.createObjectURL(audioBlob);
            statusDiv.textContent = "Saving audio file...";
            await chrome.downloads.download({
              url: audioUrl,
              filename: "tab-recording.webm",
            });

            // Then transcribe
            statusDiv.textContent =
              "Transcribing audio... (this may take a minute)";
            console.log("Starting transcription...");
            const text = await transcribeAudio(audioBlob);
            console.log("Transcription received:", text);

            // Create and download text file
            statusDiv.textContent = "Creating transcription file...";
            const textBlob = new Blob([text], { type: "text/plain" });
            const textUrl = URL.createObjectURL(textBlob);

            await chrome.downloads.download({
              url: textUrl,
              filename: "transcription.txt",
            });

            statusDiv.textContent = "✅ Transcription completed and saved!";
          } catch (error) {
            console.error("Detailed error:", error);
            statusDiv.textContent = "❌ Transcription failed: " + error.message;
          }

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

async function transcribeAudio(audioBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        console.log("Sending request to Google Speech API...");
        const response = await fetch(
          "https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyCbD3fG02B62QqELkhgT5XqD6sQ9AczRQc",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              config: {
                encoding: "WEBM_OPUS",
                sampleRateHertz: 48000,
                audioChannelCount: 2,
                languageCode: "en-US",
                enableAutomaticPunctuation: true,
              },
              audio: {
                content: reader.result.split(",")[1],
              },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API Error Response:", errorData);
          throw new Error(
            `API request failed: ${
              errorData.error?.message || response.statusText
            }`
          );
        }

        const data = await response.json();
        console.log("API Response:", data); // Debug log

        if (data.results && data.results.length > 0) {
          const transcription = data.results
            .map((result) => result.alternatives[0].transcript)
            .join("\n");
          console.log("Transcription successful:", transcription);
          resolve(transcription);
        } else {
          throw new Error("No transcription available");
        }
      } catch (error) {
        console.error("Full error:", error); // Debug log
        reject(error);
      }
    };
  });
}
