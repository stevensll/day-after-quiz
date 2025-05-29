require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log("OpenAI API Key loaded:", process.env.OPENAI_API_KEY ? "✅ Yes" : "❌ No");

// Middleware
app.use(cors({
  origin: "https://stevensll.github.io"
}));
app.use(bodyParser.json());

// Serve static files (e.g., index.html) from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Health check for debugging
app.get('/health', (req, res) => {
  res.send('Server is running');
});

// Test OpenAI connection
async function testConnection() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello" }],
    });
    console.log("✅ Successfully connected to OpenAI. Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("❌ Failed to connect to OpenAI:", error.message);
  }
}

testConnection();
app.post('/evaluate', async (req, res) => {
  const { rule1, rule2, rule3 } = req.body;

  const messages = [
    {
      role: 'system',
      content: `
You are grading open-ended responses to 3 questions about the rules of Blacker House.

Grade the answers using the following rules and format your response in strict JSON.

RULE 1 and RULE 2:
- The correct answer is: "Do not talk about Blacker House"
- Acceptable variations include similar phrasing such as:
  - "Don't talk about it"
  - "You do not talk about Blacker House"
  - "Do not talk about the house"
- For Rule 2, also accept: "similar as rule one", or similar paraphrase such as
  - "same as first"
  - "the first rule"
- Use your best judgment for paraphrased versions.
- For each, include a detailed explanation for your decision.
- Do not accept blank answers or random letters.

RULE 3:
- The correct answer is: "The Two Being One and Inseparable"
- Allow minor spelling or capitalization errors
- Accept numbers for words (e.g., "2" for "Two")
- All four words must be present and in the correct order

FORMAT:
Respond strictly in this JSON format:

{
  "rule1": {
    "grade": "Correct" or "Incorrect",
    "explanation": "Why this answer is correct or incorrect"
  },
  "rule2": {
    "grade": "Correct" or "Incorrect",
    "explanation": "Why this answer is correct or incorrect"
  },
  "rule3": {
    "grade": "Correct" or "Incorrect",
    "explanation": "Why this answer is correct or incorrect"
  }
}

      `.trim()
    },
    {
      role: 'user',
      content: `
Here are the answers:

1. ${rule1}
2. ${rule2}
3. ${rule3}

Grade them now.
      `.trim()
    }
  ];

  try {
    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
    });

    const reply = chat.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(reply);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, '\nReply content:\n', reply);
      return res.status(500).json({ error: 'Invalid JSON received from OpenAI.' });
    }

    // Log full detailed reasoning on the server
    console.log('Detailed grading explanation:', result);

    // Extract just the grades to send back to client
    const minimalResult = {
      rule1: result.rule1.grade,
      rule2: result.rule2.grade,
      rule3: result.rule3.grade,
    };

    res.json(minimalResult);

  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Something went wrong with evaluation.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
