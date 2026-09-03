import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const key = process.env.AI_API_KEY;
console.log('Testing Key:', key ? `${key.substring(0, 10)}... (length ${key.length})` : 'MISSING');

const modelsToTest = [
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro'
];

async function testModel(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: 'Hello, explain Mars in 1 sentence.' }] }
        ]
      })
    });
    console.log(`[${model}] Status: ${res.status} ${res.statusText}`);
    const json = await res.json();
    if (res.ok) {
      console.log(`✔ SUCCESS [${model}]:`, json.candidates?.[0]?.content?.parts?.[0]?.text);
      return true;
    } else {
      console.log(`❌ ERROR [${model}]:`, json.error?.message || json);
      return false;
    }
  } catch (err) {
    console.error(`❌ EXCEPTION [${model}]:`, err.message);
    return false;
  }
}

async function main() {
  for (const m of modelsToTest) {
    const ok = await testModel(m);
    if (ok) break;
  }
}

main();
