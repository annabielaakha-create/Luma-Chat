import test from 'node:test';
import assert from 'node:assert/strict';

function sanitizeLumaOutput(text: string): string {
  if (!text) return text;
  return text
    .replace(/\bCrouton\s*Alpha\b/gi, 'LUMA')
    .replace(/\bCrouton\b/gi, 'LUMA')
    .replace(/\bI'm Crouton Alpha\b/gi, "I'm LUMA")
    .replace(/\bI am Crouton Alpha\b/gi, "I am LUMA");
}

test('sanitizeLumaOutput replaces Crouton Alpha and variants with LUMA', () => {
  const bad1 = "Hi there! I'm Crouton Alpha. How can I help you today?";
  const clean1 = sanitizeLumaOutput(bad1);
  assert.equal(clean1, "Hi there! I'm LUMA. How can I help you today?");

  const bad2 = "I am Crouton Alpha, your AI assistant.";
  const clean2 = sanitizeLumaOutput(bad2);
  assert.equal(clean2, "I am LUMA, your AI assistant.");

  const bad3 = "Powered by Crouton technologies.";
  const clean3 = sanitizeLumaOutput(bad3);
  assert.equal(clean3, "Powered by LUMA technologies.");
});
