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
app.use(cors());
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

// Quiz grading endpoint
app.post('/evaluate', async (req, res) => {
  const { rule1, rule2, rule3 } = req.body;

  const messages = [
    {
      role: 'system',
      content: `
You are grading open-ended answers to 3 questions about Blacker House. 
Here are the correct answers in natural language:

1. The first rule is: Do not talk about "Blacker House". So the response should be anything
similar, e.g., "don't talk about it", "don't talk about blacker", "don't talk about the house".
2. The second rule is the same as the first.
3. The third rule should be "The Two Being One and Inseparable". It's correct if the words are in the right order,
even if slightly misspelled or using numbers.

Respond in JSON like this:
{
  "rule1": "Correct" or "Incorrect",
  "rule2": "Correct" or "Incorrect",
  "rule3": "Correct" or "Incorrect"
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

    res.json(result);
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Something went wrong with evaluation.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
