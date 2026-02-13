async function sendMessage() {
  const inputField = document.getElementById("userInput");
  const apiKey = document.getElementById("apiKey").value.trim();
  const chatBox = document.getElementById("chat-box");

  const userMessage = inputField.value.trim();

  if (!userMessage || !apiKey) {
    alert("Enter Groq API key and question.");
    return;
  }

  appendMessage("user", userMessage);
  inputField.value = "";

  const systemRules = `
You are a cybersecurity assistant.
You ONLY answer questions related to:
- Cybersecurity
- Security issues
- Network security
- Malware
- Vulnerabilities
- Attacks
- Cryptography
- Web security
- Digital forensics

If the user asks anything unrelated, reply:
"I am only trained to answer cybersecurity and vulnerability topics only."
Answer clearly in plain English sentences.
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemRules },
          { role: "user", content: userMessage }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (data.error) {
      appendMessage("bot", "API Error: " + data.error.message);
      return;
    }

    const botReply = data.choices[0].message.content;
    appendMessage("bot", botReply);

  } catch (error) {
    appendMessage("bot", "Network error or invalid API key.");
  }
}

function appendMessage(sender, text) {
  const chatBox = document.getElementById("chat-box");
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", sender);
  messageDiv.textContent = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}
