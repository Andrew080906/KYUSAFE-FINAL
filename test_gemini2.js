import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'fake-key', baseUrl: 'https://invalid-non-existent-url.google.com' });
try {
  await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Hello"
  });
  console.log('Success');
} catch (err) {
  console.log('Error:', err.message);
}
