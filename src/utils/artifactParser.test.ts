import test from 'node:test';
import assert from 'node:assert/strict';
import { extractArtifactsFromMessage } from './artifactParser';

test('extractArtifactsFromMessage extracts <luma_artifact> tags accurately', () => {
  const raw = `Here is your counter app:
<luma_artifact id="counter-app" type="html" title="Interactive Counter">
<!DOCTYPE html>
<html>
<body><button id="btn">Click me: 0</button></body>
</html>
</luma_artifact>
Enjoy your app!`;

  const result = extractArtifactsFromMessage('msg_1', 'conv_1', raw);
  assert.equal(result.artifacts.length, 1);
  assert.equal(result.artifacts[0].id, 'counter-app');
  assert.equal(result.artifacts[0].type, 'html');
  assert.equal(result.artifacts[0].title, 'Interactive Counter');
  assert.match(result.artifacts[0].content, /<button id="btn">/);
  assert.match(result.displayContent, /:::artifact\[Interactive Counter\]/);
  assert.doesNotMatch(result.displayContent, /<luma_artifact/);
});

test('extractArtifactsFromMessage extracts standalone large HTML code blocks', () => {
  const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Timer App</title></head>
<body>
  <h1>Stopwatch</h1>
  <script>console.log("running");</script>
</body>
</html>`;
  const raw = `I created this application for you:\n\n\`\`\`html\n${htmlContent}\n\`\`\`\nLet me know if you need changes.`;

  const result = extractArtifactsFromMessage('msg_2', 'conv_1', raw);
  assert.equal(result.artifacts.length, 1);
  assert.equal(result.artifacts[0].title, 'Timer App');
  assert.equal(result.artifacts[0].type, 'html');
  assert.match(result.displayContent, /:::artifact\[Timer App\]/);
});

test('extractArtifactsFromMessage returns original text when no artifacts present', () => {
  const raw = `Hello! How can I assist you with your project today?`;
  const result = extractArtifactsFromMessage('msg_3', 'conv_1', raw);
  assert.equal(result.artifacts.length, 0);
  assert.equal(result.displayContent, raw);
});
