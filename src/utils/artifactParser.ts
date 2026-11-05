import type { Artifact, ArtifactType } from '../types';

export interface ParseResult {
  displayContent: string;
  artifacts: Artifact[];
}

function normalizeArtifactType(rawType?: string, content = '', lang?: string): ArtifactType {
  const t = (rawType || '').toLowerCase().trim();
  const trimmed = content.trim();

  if (t === 'svg' || trimmed.startsWith('<svg') || lang === 'svg') return 'svg';
  if (t === 'table' || t === 'csv' || lang === 'csv') return 'table';
  if (t === 'markdown' || t === 'md' || t === 'document' || t === 'doc' || lang === 'markdown' || lang === 'md') return 'document';
  if (t === 'html' || t === 'web' || t === 'app' || t === 'react' || lang === 'html') return 'html';
  if (t === 'pdf') return 'pdf';
  if (t === 'code') return 'code';

  // Content-based heuristics
  if (trimmed.includes('<!DOCTYPE html>') || (trimmed.includes('<html') && trimmed.includes('</html>'))) return 'html';
  if (trimmed.startsWith('<svg') && trimmed.includes('</svg>')) return 'svg';
  if (lang) return 'code';
  return 'document';
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
    const rawType = typeMatch ? typeMatch[1] : undefined;
    const rawLang = langMatch ? langMatch[1] : undefined;
    const type = normalizeArtifactType(rawType, content, rawLang);
    const title = titleMatch ? titleMatch[1] : 'Interactive Artifact';

    // Safe language resolution: never assign undefined
    let language = rawLang;
    if (!language) {
      if (type === 'svg') language = 'svg';
      else if (type === 'html') language = 'html';
      else if (type === 'table') language = 'csv';
      else if (type === 'document') language = 'markdown';
      else if (type === 'pdf') language = 'pdf';
      else language = 'text';
    }

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
    displayContent = displayContent.replace(tagRegex, (_match, attrString) => {
      const titleMatch = attrString.match(/title=["']([^"']+)["']/i);
      const title = titleMatch ? titleMatch[1] : 'Interactive Artifact';
      return `\n\n:::artifact[${title}]\n\n`;
    });
    return { displayContent, artifacts };
  }

  // 1b. Check for unclosed <luma_artifact ...> tag (e.g. active streaming chunk)
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
      const rawType = typeMatch ? typeMatch[1] : undefined;
      const rawLang = langMatch ? langMatch[1] : undefined;
      const type = normalizeArtifactType(rawType, content, rawLang);
      const title = titleMatch ? titleMatch[1] : 'Interactive Artifact';

      let language = rawLang;
      if (!language) {
        if (type === 'svg') language = 'svg';
        else if (type === 'html') language = 'html';
        else if (type === 'table') language = 'csv';
        else if (type === 'document') language = 'markdown';
        else if (type === 'pdf') language = 'pdf';
        else language = 'text';
      }

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
      displayContent = displayContent.replace(/<luma_artifact[^>]*>?/gi, '').trim();
    }
  }

  // 2. Check for SVG blocks: ```svg ... ``` or ```xml <svg ... </svg> ```
  const svgBlockRegex = /```(?:svg|xml)(?::title=["']?([^"'\n]+)["']?)?\n([\s\S]*?<svg[\s\S]*?<\/svg>[\s\S]*?)```/gi;
  let svgMatch;

  while ((svgMatch = svgBlockRegex.exec(rawContent)) !== null) {
    const explicitTitle = svgMatch[1];
    const svgContent = svgMatch[2].trim();
    const artifactId = `art_${messageId}_${artifacts.length + 1}`;
    const title = explicitTitle || 'Vector Graphic';

    artifacts.push({
      id: artifactId,
      conversationId,
      messageId,
      title,
      type: 'svg',
      language: 'svg',
      content: svgContent,
      version: 1,
      createdAt: new Date().toISOString()
    });
  }

  if (artifacts.length > 0) {
    let artIndex = 0;
    displayContent = displayContent.replace(svgBlockRegex, () => {
      const art = artifacts[artIndex++];
      return `\n\n:::artifact[${art ? art.title : 'Vector Graphic'}]\n\n`;
    });
    return { displayContent, artifacts };
  }

  // 3. Check for standalone HTML code blocks: ```html ... ```
  const htmlCodeBlockRegex = /```html(?::title=["']?([^"'\n]+)["']?)?\n([\s\S]*?)```/gi;
  let htmlMatch;

  while ((htmlMatch = htmlCodeBlockRegex.exec(rawContent)) !== null) {
    const explicitTitle = htmlMatch[1];
    const codeContent = htmlMatch[2].trim();

    const isFullHtml =
      codeContent.includes('<!DOCTYPE html>') ||
      codeContent.includes('<html') ||
      codeContent.includes('<script') ||
      codeContent.includes('<style') ||
      codeContent.length > 250;

    if (isFullHtml) {
      const artifactId = `art_${messageId}_${artifacts.length + 1}`;
      let title = explicitTitle || 'Interactive Web Application';

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

  if (artifacts.length > 0) {
    let artIndex = 0;
    displayContent = displayContent.replace(htmlCodeBlockRegex, () => {
      const art = artifacts[artIndex++];
      return `\n\n:::artifact[${art ? art.title : 'Interactive Web Application'}]\n\n`;
    });
    return { displayContent, artifacts };
  }

  // 4. Check for CSV / Tabular datasets with explicit title: ```csv:title="..." or ```table:title="..."
  const tableBlockRegex = /```(?:csv|table)(?::title=["']?([^"'\n]+)["']?)?\n([\s\S]*?)```/gi;
  let tableMatch;

  while ((tableMatch = tableBlockRegex.exec(rawContent)) !== null) {
    const title = tableMatch[1] || 'Dataset Table';
    const tableContent = tableMatch[2].trim();

    if (tableContent.length > 30) {
      const artifactId = `art_${messageId}_${artifacts.length + 1}`;
      artifacts.push({
        id: artifactId,
        conversationId,
        messageId,
        title,
        type: 'table',
        language: 'csv',
        content: tableContent,
        version: 1,
        createdAt: new Date().toISOString()
      });
    }
  }

  if (artifacts.length > 0) {
    let artIndex = 0;
    displayContent = displayContent.replace(tableBlockRegex, () => {
      const art = artifacts[artIndex++];
      return `\n\n:::artifact[${art ? art.title : 'Dataset Table'}]\n\n`;
    });
    return { displayContent, artifacts };
  }

  // 5. Check for titled code blocks: ```lang:title="filename.ext" ... ```
  const titledCodeBlockRegex = /```([a-zA-Z0-9]+):title=["']?([^"'\n]+)["']?\n([\s\S]*?)```/gi;
  let codeMatch;

  while ((codeMatch = titledCodeBlockRegex.exec(rawContent)) !== null) {
    const lang = codeMatch[1].toLowerCase();
    const title = codeMatch[2].trim();
    const codeContent = codeMatch[3].trim();

    if (codeContent.length > 50) {
      const artifactId = `art_${messageId}_${artifacts.length + 1}`;
      const type = (lang === 'md' || lang === 'markdown') ? 'document' : 'code';

      artifacts.push({
        id: artifactId,
        conversationId,
        messageId,
        title,
        type,
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
