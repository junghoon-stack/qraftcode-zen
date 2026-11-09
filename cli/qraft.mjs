#!/usr/bin/env node

const baseUrl = (process.env.QRAFTCODE_API_URL || 'https://qraftcode.vercel.app/v1').replace(/\/$/, '');
const apiKey = process.env.QRAFTCODE_API_KEY || '';
const modelArg = process.argv.indexOf('--model');
const model = modelArg >= 0 ? process.argv[modelArg + 1] : (process.env.QRAFTCODE_MODEL || 'auto');
const args = process.argv.slice(2).filter((arg, index, list) => arg !== '--model' && (modelArg < 0 || index !== modelArg + 1));
const command = args[0] || 'chat';
let completedRequests = 0;

function showSponsor() {
  if (completedRequests > 0 && completedRequests % 5 === 0) {
    console.error('\n[QRAFTCODE SPONSOR] Free models are supported by developer tools and infrastructure sponsors. Learn more: https://qraftcode.vercel.app');
  }
}

function help() {
  console.log(`QraftCode CLI · YOUR CODE. YOUR CRAFT.\n\nUsage:\n  qraft ask "질문" [--model provider/model]\n  qraft chat\n  qraft models\n\nEnvironment:\n  QRAFTCODE_API_URL  API base URL (default: ${baseUrl})\n  QRAFTCODE_API_KEY  Optional sk-qraft API key with monthly credits\n  QRAFTCODE_MODEL    Default model ID\n`);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'content-type': 'application/json', 'x-client-type': 'cli', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}), ...(init.headers || {}) } });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!response.ok) throw new Error(typeof data === 'string' ? data : data?.error?.message || data?.error || `HTTP ${response.status}`);
  return data;
}

async function ask(prompt) {
  if (!prompt) return help();
  const response = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) }, body: JSON.stringify({ model, stream: true, clientType: 'cli', messages: [{ role: 'user', content: prompt }] }) });
  if (!response.ok) throw new Error(await response.text());
  if (!response.body) throw new Error('Streaming is unavailable.');
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { if (!line.startsWith('data:')) continue; const payload = line.slice(5).trim(); if (payload === '[DONE]') continue; try { const json = JSON.parse(payload); process.stdout.write(json.choices?.[0]?.delta?.content || ''); } catch {} } }
  completedRequests += 1;
  showSponsor();
  process.stdout.write('\n');
}

async function interactive() {
  const readline = await import('node:readline/promises'); const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('QraftCode chat · /help for commands · /exit to leave');
  while (true) { const prompt = await rl.question('\nYou › '); if (prompt === '/exit') break; if (prompt === '/help') { help(); continue; } try { process.stdout.write('Qraft › '); await ask(prompt); } catch (error) { console.error(`\nError: ${error.message}`); } }
  rl.close();
}

try {
  if (command === 'ask') await ask(args.slice(1).join(' '));
  else if (command === 'chat') await interactive();
  else if (command === 'models') console.log(JSON.stringify(await request('/models'), null, 2));
  else if (command === 'providers') console.log(JSON.stringify(await request('/providers'), null, 2));
  else help();
} catch (error) { console.error(`QraftCode: ${error.message}`); process.exitCode = 1; }
