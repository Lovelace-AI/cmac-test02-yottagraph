import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';

interface ExportCitation {
    type: string;
    neid: string;
    label: string;
}

interface ExportAnswer {
    category: string;
    question: string;
    answer: string;
    citations: ExportCitation[];
}

interface ExportBody {
    format: 'markdown' | 'html' | 'pdf';
    collectionName: string;
    generatedAt: string;
    overview: string;
    answers: ExportAnswer[];
}

function toMarkdown(body: ExportBody): string {
    const lines: string[] = [
        `# ${body.collectionName} - Insights Analysis`,
        '',
        `Generated: ${body.generatedAt}`,
        '',
        '## Overview',
        '',
        body.overview,
        '',
        '## Answered Questions',
        '',
    ];

    for (const item of body.answers) {
        lines.push(`### ${item.category}`);
        lines.push('');
        lines.push(`**Question:** ${item.question}`);
        lines.push('');
        lines.push(item.answer);
        lines.push('');
        if (item.citations?.length) {
            lines.push('Supporting evidence:');
            for (const citation of item.citations) {
                lines.push(`- ${citation.label} (${citation.type}, ${citation.neid})`);
            }
            lines.push('');
        }
    }
    return lines.join('\n');
}

function escapeHtml(text: string): string {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function toHtml(markdown: string, title: string): string {
    const paragraphs = markdown
        .split('\n\n')
        .map((section) => `<p>${escapeHtml(section).replaceAll('\n', '<br />')}</p>`)
        .join('\n');
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 36px auto; max-width: 900px; line-height: 1.55; padding: 0 18px; color: #0f172a; }
    h1 { font-size: 1.7rem; margin-bottom: 0.6rem; }
    p { margin: 0 0 0.95rem; white-space: normal; }
  </style>
</head>
<body>
${paragraphs}
</body>
</html>`;
}

function wrapLine(line: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    if (!line.trim()) return [''];
    const words = line.split(/\s+/).filter(Boolean);
    const output: string[] = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        const width = font.widthOfTextAtSize(candidate, fontSize);
        if (width <= maxWidth || !current) {
            current = candidate;
            continue;
        }
        output.push(current);
        current = word;
    }
    if (current) output.push(current);
    return output;
}

async function toPdfBase64(markdown: string, title: string): Promise<string> {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageSize: [number, number] = [612, 792];
    const margin = 48;
    let page: PDFPage = pdf.addPage(pageSize);
    let y = page.getHeight() - margin;
    const maxWidth = page.getWidth() - margin * 2;

    const ensureSpace = (height: number) => {
        if (y - height >= margin) return;
        page = pdf.addPage(pageSize);
        y = page.getHeight() - margin;
    };

    const drawWrapped = (text: string, font: PDFFont, size: number, gap = 5) => {
        const lines = wrapLine(text, font, size, maxWidth);
        for (const line of lines) {
            ensureSpace(size + gap);
            page.drawText(line, {
                x: margin,
                y,
                size,
                font,
            });
            y -= size + gap;
        }
    };

    drawWrapped(title, bold, 18, 8);
    y -= 4;

    for (const rawLine of markdown.split('\n')) {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
            y -= 6;
            continue;
        }
        if (line.startsWith('# ')) {
            y -= 4;
            drawWrapped(line.slice(2).trim(), bold, 15, 7);
            y -= 2;
            continue;
        }
        if (line.startsWith('## ')) {
            y -= 3;
            drawWrapped(line.slice(3).trim(), bold, 13, 6);
            y -= 2;
            continue;
        }
        if (line.startsWith('### ')) {
            y -= 2;
            drawWrapped(line.slice(4).trim(), bold, 12, 5);
            continue;
        }
        drawWrapped(line, regular, 11, 5);
    }

    const bytes = await pdf.save();
    return Buffer.from(bytes).toString('base64');
}

export default defineEventHandler(async (event) => {
    const body = await readBody<ExportBody>(event);
    if (!body?.format || !body.collectionName) {
        throw createError({
            statusCode: 400,
            statusMessage: 'format and collectionName are required',
        });
    }
    const markdown = toMarkdown(body);
    const safeName = body.collectionName.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
    const stamp = new Date(body.generatedAt || Date.now()).toISOString().slice(0, 10);
    if (body.format === 'markdown') {
        return {
            format: 'markdown',
            filename: `${safeName}-insights-${stamp}.md`,
            mimeType: 'text/markdown;charset=utf-8',
            content: markdown,
        };
    }
    const html = toHtml(markdown, `${body.collectionName} Insights Analysis`);
    if (body.format === 'html') {
        return {
            format: 'html',
            filename: `${safeName}-insights-${stamp}.html`,
            mimeType: 'text/html;charset=utf-8',
            content: html,
        };
    }
    const pdfContent = await toPdfBase64(markdown, `${body.collectionName} Insights Analysis`);
    return {
        format: 'pdf',
        filename: `${safeName}-insights-${stamp}.pdf`,
        mimeType: 'application/pdf',
        content: pdfContent,
        encoding: 'base64',
    };
});
