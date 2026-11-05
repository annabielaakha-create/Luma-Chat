import { Artifact, ArtifactType } from '../types';

export interface ParseResult {
  displayContent: string;
  artifacts: Artifact[];
}

export function extractArtifactsFromMessage(
  messageId: string,
  conversationId: string,
  rawContent: string
): ParseResult {
  const artifacts: Artifact[] = [];
  let displayContent = rawContent;

  // 1. Check for explicit <luma_artifact ...>...</luma_artifact> tags
  const tagRegex = /<luma_artifact\s+([^>]*?)>([\s\S]*?)<\/luma_artifact>/gi;
  let tagMatch;

  while ((tagMatch = tagRegex.exec(rawContent)) !== null) {
    const attrString = tagMatch[1];
    const content = tagMatch[2].trim();

    // Parse attributes
    const idMatch = attrString.match(/id=["']([^"']+)["']/i);
    const typeMatch = attrString.match(/type=["']([^"']+)["']/i);
    const titleMatch = attrString.match(/title=["']([^"']+)["']/i);
    const langMatch = attrString.match(/language=["']([^"']+)["']/i);

    const artifactId = idMatch ? idMatch[1] : `art_${messageId}_${artifacts.length + 1}`;
    const type = (typeMatch ? typeMatch[1].toLowerCase() : 'html') as ArtifactType;
    const title = titleMatch ? titleMatch[1] : 'Interactive Artifact';
    const language = langMatch ? langMatch[1] : undefined;

    artifacts.push({
      id: artifactId,
      conversationId,
      messageId,
      title,
      type,
      language,
      content,
      version: 1,
      createdAt: new Date().toISOString()
    });
  }

  if (artifacts.length > 0) {
    // Replace the tag content in displayContent with an inline indicator
    displayContent = displayContent.replace(tagRegex, (_match, attrString) => {
      const titleMatch = attrString.match(/title=["']([^"']+)["']/i);
      const title = titleMatch ? titleMatch[1] : 'Interactive Artifact';
      return `\n\n:::artifact[${title}]\n\n`;
    });
    return { displayContent, artifacts };
  }

  // 1b. Check for unclosed <luma_artifact ...> tag (e.g. streaming or truncated)
  const unclosedTagRegex = /<luma_artifact\s+([^>]*?)>([\s\S]*)$/i;
  const unclosedMatch = rawContent.match(unclosedTagRegex);
  if (unclosedMatch) {
    const attrString = unclosedMatch[1];
    const content = unclosedMatch[2].trim();
    if (content.length > 30) {
      const idMatch = attrString.match(/id=["']([^"']+)["']/i);
      const typeMatch = attrString.match(/type=["']([^"']+)["']/i);
      const titleMatch = attrString.match(/title=["']([^"']+)["']/i);
      const langMatch = attrString.match(/language=["']([^"']+)["']/i);

      const artifactId = idMatch ? idMatch[1] : `art_${messageId}_1`;
      const type = (typeMatch ? typeMatch[1].toLowerCase() : 'html') as ArtifactType;
      const title = titleMatch ? titleMatch[1] : 'Interactive Artifact';
      const language = langMatch ? langMatch[1] : undefined;

      artifacts.push({
        id: artifactId,
        conversationId,
        messageId,
        title,
        type,
        language,
        content,
        version: 1,
        createdAt: new Date().toISOString()
      });

      displayContent = displayContent.replace(unclosedTagRegex, () => {
        return `\n\n:::artifact[${title}]\n\n`;
      });
      return { displayContent, artifacts };
    } else {
      // Hide the bare tag during early streaming so it doesn't flash in chat
      displayContent = displayContent.replace(/<luma_artifact[^>]*>?/gi, '').trim();
    }
  }

  // 2. Check for substantial standalone HTML code blocks (e.g. ```html <!DOCTYPE html> ... ``` or ```html <div ... ```)
  const htmlCodeBlockRegex = /```html(?::title=["']?([^"'\n]+)["']?)?\n([\s\S]*?)```/gi;
  let htmlMatch;

  while ((htmlMatch = htmlCodeBlockRegex.exec(rawContent)) !== null) {
    const explicitTitle = htmlMatch[1];
    const codeContent = htmlMatch[2].trim();

    // Check if it looks like a full application, dashboard, component or tool
    const isFullHtml =
      codeContent.includes('<!DOCTYPE html>') ||
      codeContent.includes('<html') ||
      codeContent.includes('<script') ||
      codeContent.includes('<style') ||
      codeContent.length > 300;

    if (isFullHtml) {
      const artifactId = `art_${messageId}_${artifacts.length + 1}`;
      let title = explicitTitle || 'Interactive Web Application';

      // Try to find <title> inside HTML
      const titleTag = codeContent.match(/<title>([^<]+)<\/title>/i);
      if (titleTag && !explicitTitle) {
        title = titleTag[1].trim();
      }

      artifacts.push({
        id: artifactId,
        conversationId,
        messageId,
        title,
        type: 'html',
        language: 'html',
        content: codeContent,
        version: 1,
        createdAt: new Date().toISOString()
      });
    }
  }

  // If HTML artifacts were found from code blocks
  if (artifacts.length > 0) {
    let artIndex = 0;
    displayContent = displayContent.replace(htmlCodeBlockRegex, () => {
      const art = artifacts[artIndex++];
      return `\n\n:::artifact[${art ? art.title : 'Interactive Web Application'}]\n\n`;
    });
    return { displayContent, artifacts };
  }

  // 3. Check for specific code blocks with explicit filename/title: ```js:title="server.js" or ```python:title="script.py"
  const titledCodeBlockRegex = /```([a-zA-Z0-9]+):title=["']?([^"'\n]+)["']?\n([\s\S]*?)```/gi;
  let codeMatch;

  while ((codeMatch = titledCodeBlockRegex.exec(rawContent)) !== null) {
    const lang = codeMatch[1].toLowerCase();
    const title = codeMatch[2].trim();
    const codeContent = codeMatch[3].trim();

    if (codeContent.length > 100) {
      const artifactId = `art_${messageId}_${artifacts.length + 1}`;
      artifacts.push({
        id: artifactId,
        conversationId,
        messageId,
        title,
        type: 'code',
        language: lang,
        content: codeContent,
        version: 1,
        createdAt: new Date().toISOString()
      });
    }
  }

  if (artifacts.length > 0) {
    displayContent = displayContent.replace(titledCodeBlockRegex, (_match, _lang, title) => {
      return `\n\n:::artifact[${title}]\n\n`;
    });
  }

  return { displayContent, artifacts };
}
