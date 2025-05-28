const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log("OpenAI API Key loaded:", process.env.OPENAI_API_KEY ? "✅ Yes" : "❌ No");

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

app.use(cors());
app.use(bodyParser.json());

app.post('/evaluate', async (req, res) => {
  const { rule1, rule2, rule3 } = req.body;

  const messages = [
    {
      role: 'system',
      content: `
You are grading open-ended answers to 3 questions about Blacker House. 
Here are the correct answers in natural language:

1. The first rule is Do not talk about "Blacker House". So the response should be anything
similar, i.e. "don't talk about it", "don't talk about blacker", "don't talk about the house" or similar.
2. The second rule is the same as the first, so evaluate with the above rule.
3. The third rule should be "The Two Being One and Inseparable", evaluate as long as the words are in correct order,
but the spelling and capitalization could be slightly wrong. Numbers can also be used. Again, the spelling
does not need to be exactly right, but close for each word.

Respond in JSON like this:
{
  "rule1": "Correct" or "Incorrect",
  "rule2": "Correct" or "Incorrect",
  "rule3": "Correct" or "Incorrect"
}f
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

    let result;
    try {
      result = JSON.parse(chat.choices[0].message.content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({ error: 'Invalid JSON received from OpenAI.' });
    }

    res.json(result);
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Something went wrong with evaluation.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
