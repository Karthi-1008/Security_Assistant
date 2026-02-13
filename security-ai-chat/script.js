// ========== WAIT FOR DOM TO LOAD ==========
document.addEventListener("DOMContentLoaded", function () {
  const sendBtn = document.getElementById("sendBtn");
  const userInput = document.getElementById("userInput");
  const savePdfBtn = document.getElementById("savePdfBtn");

  // Send message on button click
  sendBtn.addEventListener("click", sendMessage);

  // Send message on Enter key
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // ===== SAVE AS PDF =====
  if (savePdfBtn) {
    savePdfBtn.addEventListener("click", function () {
      window.print();
    });
  }
});

// ========== MAIN CHAT FUNCTION ==========
async function sendMessage() {
  const inputField = document.getElementById("userInput");
  const apiKey = document.getElementById("apiKey").value.trim();
  const chatBox = document.getElementById("chat-box");

  const userMessage = inputField.value.trim();

  if (!userMessage || !apiKey) {
    alert("Enter Groq API key and question.");
    return;
  }

  // Display user message
  appendMessage("user", userMessage);
  inputField.value = "";

  // Show loading indicator
  const loadingId = "loading-indicator";
  const loadingDiv = document.createElement("div");
  loadingDiv.id = loadingId;
  loadingDiv.classList.add("message", "bot", "loading");
  loadingDiv.textContent = "Bot is thinking...";
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Enhanced system rules with formatting instructions
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

IMPORTANT FORMATTING RULES:
1. Use short paragraphs (2-3 sentences max).
2. Use bullet points (- or *) for lists.
3. Use numbered lists (1., 2., etc.) for steps.
4. When comparing two or more items, ALWAYS present the information in a TABLE with clear headers.
5. Use **bold** for key terms (first occurrence or important concepts).
6. Keep answers concise and easy to scan.
7. DO NOT use long blocks of text. Break them up.
8. If the user asks for a difference between X and Y, format the answer as a Markdown table.

Example table format:
| Feature | Virus | Worm |
|--------|-------|------|
| Replication | Needs host | Self-replicating |
| Spread | Attaches to files | Network |

Answer clearly in plain English sentences.
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemRules },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    // Remove loading indicator
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.remove();

    if (data.error) {
      appendMessage("bot", "API Error: " + data.error.message);
      return;
    }

    const botReply = data.choices[0].message.content;
    appendMessage("bot", botReply);
  } catch (error) {
    // Remove loading indicator
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.remove();

    appendMessage("bot", "Network error or invalid API key.");
  }
}

// ========== MARKDOWN RENDERER ==========
function appendMessage(sender, text) {
  const chatBox = document.getElementById("chat-box");
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", sender);

  if (sender === "bot") {
    // Convert Markdown-style formatting to HTML
    let html = escapeHtml(text);

    // Bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text* -> <em>text</em> (but careful not to interfere with bullet lists)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Unordered lists: lines starting with - or *
    const lines = html.split('\n');
    let inList = false;
    let listHtml = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // Check for unordered list item
      if (line.trim().match(/^[-*]\s+(.*)$/)) {
        if (!inList) {
          listHtml += '<ul>';
          inList = true;
        }
        listHtml += '<li>' + line.trim().substring(1).trim() + '</li>';
      }
      // Check for ordered list item
      else if (line.trim().match(/^\d+\.\s+(.*)$/)) {
        if (!inList) {
          listHtml += '<ol>';
          inList = true;
        }
        listHtml += '<li>' + line.trim().substring(line.indexOf('.') + 1).trim() + '</li>';
      } else {
        if (inList) {
          listHtml += inList === 'ul' ? '</ul>' : '</ol>';
          inList = false;
        }
        listHtml += line + '\n';
      }
    }
    if (inList) {
      listHtml += inList === 'ul' ? '</ul>' : '</ol>';
    }
    html = listHtml;

    // Tables: simple Markdown table conversion
    const lines2 = html.split('\n');
    let tableFound = false;
    let tableRows = [];
    let tableHtml = '';

    for (let i = 0; i < lines2.length; i++) {
      let line = lines2[i];
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tableRows.push(line);
        tableFound = true;
      } else {
        if (tableFound) {
          if (tableRows.length >= 2) {
            tableHtml += '<table>';
            // Header row
            let headerCells = tableRows[0].split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
            tableHtml += '<thead><tr>';
            headerCells.forEach(cell => {
              tableHtml += '<th>' + cell + '</th>';
            });
            tableHtml += '</tr></thead><tbody>';
            // Data rows (skip separator)
            for (let j = 1; j < tableRows.length; j++) {
              if (tableRows[j].includes('---')) continue;
              let cells = tableRows[j].split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
              tableHtml += '<tr>';
              cells.forEach(cell => {
                tableHtml += '<td>' + cell + '</td>';
              });
              tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table>';
          }
          tableFound = false;
          tableRows = [];
        }
        tableHtml += line + '\n';
      }
    }
    if (tableFound) {
      if (tableRows.length >= 2) {
        tableHtml += '<table>';
        let headerCells = tableRows[0].split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
        tableHtml += '<thead><tr>';
        headerCells.forEach(cell => {
          tableHtml += '<th>' + cell + '</th>';
        });
        tableHtml += '</tr></thead><tbody>';
        for (let j = 1; j < tableRows.length; j++) {
          if (tableRows[j].includes('---')) continue;
          let cells = tableRows[j].split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
          tableHtml += '<tr>';
          cells.forEach(cell => {
            tableHtml += '<td>' + cell + '</td>';
          });
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
      }
    }
    html = tableHtml;

    // Convert line breaks to <br>
    html = html.replace(/\n/g, '<br>');

    messageDiv.innerHTML = html;
  } else {
    // User message – plain text
    messageDiv.textContent = text;
  }

  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Helper to escape HTML special characters
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
