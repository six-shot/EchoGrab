chrome.runtime.onInstalled.addListener(() => {
  console.log("Audio Recording Extension installed");
});

// You can add message listeners here to communicate between popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startRecording") {
    // Handle start recording
  } else if (message.action === "stopRecording") {
    // Handle stop recording
  }
});
