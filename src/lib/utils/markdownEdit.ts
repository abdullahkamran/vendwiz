/**
 * Text edit behind the editor's "Blank line" button (About Us / policies).
 *
 * In Markdown a heading is a single line and extra newlines after it add no visible gap. So when the
 * cursor is on a heading line, the blank space is added as a separate paragraph *after* the heading.
 */

export type EditResult = { value: string; cursor: number };

const HEADING = /^\s{0,3}#{1,6}(\s|$)/;
const BLANK_PARAGRAPH = '&nbsp;';

function lineBounds(value: string, cursor: number) {
	const start = value.lastIndexOf('\n', cursor - 1) + 1;
	const nextNewline = value.indexOf('\n', cursor);
	const end = nextNewline === -1 ? value.length : nextNewline;
	return { start, end, line: value.slice(start, end) };
}

/** Puts a blank paragraph directly after the line that ends at `lineEnd`, keeping what follows intact. */
function blankParagraphAfter(value: string, lineEnd: number): EditResult {
	const before = value.slice(0, lineEnd);
	const rest = value.slice(lineEnd).replace(/^\n+/, '');
	const insertion = `\n\n${BLANK_PARAGRAPH}`;
	if (!rest) return { value: before + insertion + '\n\n', cursor: (before + insertion).length + 2 };
	return { value: `${before}${insertion}\n\n${rest}`, cursor: (before + insertion).length + 2 };
}

/** "Blank line": an empty line of space between paragraphs. */
export function insertBlankLine(value: string, start: number, end = start): EditResult {
	const { end: lineEnd, line } = lineBounds(value, start);
	if (HEADING.test(line)) return blankParagraphAfter(value, lineEnd);
	const insertion = `\n\n${BLANK_PARAGRAPH}\n\n`;
	return { value: value.slice(0, start) + insertion + value.slice(end), cursor: start + insertion.length };
}
