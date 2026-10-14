<script lang="ts">
  /**
   * Rich-text editor for admin pages (About Us). Content is stored as Markdown and rendered the same
   * way the storefront renders policy pages. The toolbar covers bold, italic, headings, lists,
   * tables, links, quotes and picture upload.
   */
  import MarkdownIt from 'markdown-it';
  import { insertBlankLine, type EditResult } from '$lib/utils/markdownEdit';

  let {
    value = $bindable(''),
    name = 'content',
    id = undefined,
    rows = 16,
    placeholder = ''
  }: {
    value?: string;
    name?: string;
    /** id of the text box, so a <label for> can point at it */
    id?: string;
    rows?: number;
    placeholder?: string;
  } = $props();

  let mode = $state<'write' | 'preview'>('write');
  let textarea = $state<HTMLTextAreaElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let uploading = $state(false);
  let uploadError = $state('');

  // ── Undo / redo ────────────────────────────────────────────────────────────
  // The browser's own undo is wiped whenever the toolbar changes the text, so history is kept here.
  // Typing is grouped: a pause of more than 0.7s (or any toolbar action) starts a new undo step.
  const MAX_HISTORY = 200;
  const GROUP_MS = 700;
  let undoStack = $state<string[]>([]);
  let redoStack = $state<string[]>([]);
  let committed = value; // the state the stacks are measured from
  let lastEdit = 0;

  $effect(() => {
    const current = value;
    if (current === committed) return; // unchanged, or just set by undo / redo
    const now = Date.now();
    if (now - lastEdit > GROUP_MS || undoStack.length === 0) {
      undoStack = [...undoStack, committed].slice(-MAX_HISTORY);
    }
    redoStack = [];
    committed = current;
    lastEdit = now;
  });

  function undo() {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, committed];
    committed = previous;
    lastEdit = 0;
    value = previous;
    textarea?.focus();
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    undoStack = [...undoStack, committed];
    committed = next;
    lastEdit = 0;
    value = next;
    textarea?.focus();
  }

  function onKeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  }

  // Same configuration as the server: raw HTML is escaped, bare URLs become links
  const md = new MarkdownIt({ html: false, linkify: true });

  const TABLE_TEMPLATE =
    '\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n\n';

  function refocus(start: number, end: number) {
    // Wait for the bound value to reach the textarea before restoring the selection
    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start, end);
    }, 0);
  }

  /** Wraps the selection (or a placeholder word) in markers, e.g. **bold** */
  function wrap(before: string, after: string, fallback: string) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    value = value.slice(0, start) + before + selected + after + value.slice(end);
    refocus(start + before.length, start + before.length + selected.length);
  }

  /** Inserts text at the cursor, replacing any selection */
  function insert(text: string) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    value = value.slice(0, start) + text + value.slice(end);
    refocus(start + text.length, start + text.length);
  }

  /** Spacing button: a heading-aware edit computed by a pure helper (see markdownEdit.ts) */
  function applySpacing(edit: (text: string, start: number, end: number) => EditResult) {
    if (!textarea) return;
    const result = edit(value, textarea.selectionStart, textarea.selectionEnd);
    value = result.value;
    refocus(result.cursor, result.cursor);
  }

  /** Puts a prefix at the start of every selected line (headings, lists, quotes) */
  function prefixLines(prefix: string | ((index: number) => string), fallback: string) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const block = value.slice(lineStart, end) || fallback;
    const changed = block
      .split('\n')
      .map((line, i) => (typeof prefix === 'function' ? prefix(i) : prefix) + line)
      .join('\n');
    value = value.slice(0, lineStart) + changed + value.slice(end);
    refocus(lineStart, lineStart + changed.length);
  }

  async function uploadPicture(file: File | undefined) {
    if (!file) return;
    uploadError = '';
    if (!file.type.startsWith('image/')) {
      uploadError = 'Please choose an image file.';
      return;
    }
    uploading = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        uploadError = body?.message ?? 'Picture upload failed.';
        return;
      }
      const { url } = await res.json();
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[\[\]()]/g, '').replace(/[-_]+/g, ' ');
      insert(`\n\n![${alt}](${url})\n\n`);
    } catch {
      uploadError = 'Network error while uploading the picture.';
    } finally {
      uploading = false;
      if (fileInput) fileInput.value = '';
    }
  }
</script>

<div class="md-editor">
  <div class="md-toolbar" role="toolbar" aria-label="Formatting">
    <button type="button" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={undoStack.length === 0 || mode === 'preview'} onclick={undo}>↶ Undo</button>
    <button type="button" title="Redo (Ctrl+Y)" aria-label="Redo" disabled={redoStack.length === 0 || mode === 'preview'} onclick={redo}>↷ Redo</button>
    <span class="md-sep" aria-hidden="true"></span>
    <button type="button" title="Bold" aria-label="Bold" onclick={() => wrap('**', '**', 'bold text')}><strong>B</strong></button>
    <button type="button" title="Italic" aria-label="Italic" onclick={() => wrap('_', '_', 'italic text')}><em>I</em></button>
    <span class="md-sep" aria-hidden="true"></span>
    <button type="button" title="Heading" aria-label="Heading" onclick={() => prefixLines('## ', 'Heading')}>H1</button>
    <button type="button" title="Subheading" aria-label="Subheading" onclick={() => prefixLines('### ', 'Subheading')}>H2</button>
    <span class="md-sep" aria-hidden="true"></span>
    <button type="button" title="Bulleted list" aria-label="Bulleted list" onclick={() => prefixLines('- ', 'List item')}>• List</button>
    <button type="button" title="Numbered list" aria-label="Numbered list" onclick={() => prefixLines((i) => `${i + 1}. `, 'List item')}>1. List</button>
    <button type="button" title="Quote" aria-label="Quote" onclick={() => prefixLines('> ', 'Quote')}>❝</button>
    <span class="md-sep" aria-hidden="true"></span>
    <button type="button" title="Blank line: add an empty line of space between paragraphs" aria-label="Blank line" onclick={() => applySpacing(insertBlankLine)}>␣ Blank line</button>
    <span class="md-sep" aria-hidden="true"></span>
    <button type="button" title="Table" aria-label="Table" onclick={() => insert(TABLE_TEMPLATE)}>▦ Table</button>
    <button type="button" title="Link" aria-label="Link" onclick={() => wrap('[', '](https://)', 'link text')}>🔗 Link</button>
    <button type="button" title="Upload a picture" aria-label="Upload a picture" disabled={uploading} onclick={() => fileInput?.click()}>
      {uploading ? 'Uploading…' : '🖼 Picture'}
    </button>
    <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={(e) => uploadPicture(e.currentTarget.files?.[0])} />

    <span class="md-tabs">
      <button type="button" class:md-tab-active={mode === 'write'} onclick={() => (mode = 'write')}>Write</button>
      <button type="button" class:md-tab-active={mode === 'preview'} onclick={() => (mode = 'preview')}>Preview</button>
    </span>
  </div>

  {#if uploadError}
    <p class="md-error" role="alert">{uploadError}</p>
  {/if}

  {#if mode === 'write'}
    <textarea bind:this={textarea} {id} {name} {rows} {placeholder} bind:value onkeydown={onKeydown} class="md-textarea"></textarea>
  {:else}
    <!-- Keep the value in the form while previewing -->
    <input type="hidden" {name} {value} />
    <div class="md-preview" style="min-height:{rows * 1.45}rem">
      {#if value.trim()}
        {@html md.render(value)}
      {:else}
        <p class="md-empty">Nothing to preview yet.</p>
      {/if}
    </div>
  {/if}

  <p class="md-hint">
    Markdown is supported — use the buttons above, or type <code>**bold**</code>, <code>_italic_</code>, <code>## Heading</code>.
    Pressing Enter once doesn't add a gap on the page — use <strong>Blank line</strong> for extra space.
  </p>
</div>

<style>
  .md-editor {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
  }
  .md-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-2);
  }
  .md-toolbar button {
    padding: 4px 9px;
    font-size: 0.78rem;
    line-height: 1.3;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: #fff;
    color: var(--color-text);
    cursor: pointer;
  }
  .md-toolbar button:hover:not(:disabled) {
    background: #f3f4f6;
  }
  .md-toolbar button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .md-sep {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 4px;
  }
  .md-tabs {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }
  .md-tabs .md-tab-active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }
  .md-tabs .md-tab-active:hover:not(:disabled) {
    background: var(--color-primary);
  }
  .md-error {
    margin: 0;
    padding: 6px 10px;
    font-size: 0.8rem;
    color: #b91c1c;
    background: #fef2f2;
    border-bottom: 1px solid #fecaca;
  }
  .md-textarea {
    display: block;
    width: 100%;
    border: none !important;
    border-radius: 0 !important;
    padding: 12px 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85rem;
    line-height: 1.55;
    resize: vertical;
    box-shadow: none !important;
  }
  .md-textarea:focus {
    outline: none;
  }
  .md-preview {
    padding: 12px 16px;
    font-size: 0.9rem;
    line-height: 1.7;
    color: var(--color-text);
  }
  .md-empty {
    color: var(--color-text-muted);
    font-style: italic;
  }
  .md-hint {
    margin: 0;
    padding: 6px 12px;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    border-top: 1px solid var(--color-border);
    background: var(--color-surface-2);
  }
  .md-hint code {
    background: #e5e7eb;
    padding: 0 4px;
    border-radius: 3px;
  }
  .md-preview :global(h1),
  .md-preview :global(h2),
  .md-preview :global(h3) {
    font-weight: 700;
    margin: 1.2em 0 0.4em;
  }
  .md-preview :global(p) {
    margin: 0 0 1em;
  }
  .md-preview :global(ul) {
    list-style: disc;
    padding-left: 1.5em;
    margin: 0 0 1em;
  }
  .md-preview :global(ol) {
    list-style: decimal;
    padding-left: 1.5em;
    margin: 0 0 1em;
  }
  .md-preview :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 0.5em 0;
  }
  .md-preview :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75em 0;
    font-size: 0.875rem;
  }
  .md-preview :global(th),
  .md-preview :global(td) {
    border: 1px solid var(--color-border);
    padding: 6px 10px;
    text-align: left;
  }
  .md-preview :global(th) {
    background: var(--color-surface-2);
    font-weight: 600;
  }
  .md-preview :global(blockquote) {
    border-left: 3px solid var(--color-border);
    margin: 0.75em 0;
    padding: 0.4em 0.9em;
    color: var(--color-text-muted);
  }
  .md-preview :global(a) {
    text-decoration: underline;
  }
</style>
