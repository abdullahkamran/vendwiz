<script lang="ts">
  type ImageRow = { id?: string; url: string; sortOrder: number };

  let {
    images = [],
    onChange
  }: {
    images: ImageRow[];
    onChange: (images: ImageRow[]) => void;
  } = $props();

  let rows = $state<ImageRow[]>(images.map((img) => ({ ...img })));
  let uploading = $state(false);
  let dragOver = $state(false);
  let dragIndex = $state<number | null>(null);
  let errorMsg = $state('');

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        errorMsg = data?.message ?? 'Upload failed';
        return null;
      }
      const { url } = await res.json();
      return url as string;
    } catch {
      errorMsg = 'Network error during upload';
      return null;
    }
  }

  async function handleFiles(files: FileList | File[]) {
    uploading = true;
    errorMsg = '';
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      if (!file.type.startsWith('image/')) {
        errorMsg = 'Only image files are accepted';
        continue;
      }
      const url = await uploadFile(file);
      if (url) {
        rows = [...rows, { url, sortOrder: rows.length }];
        onChange(rows);
      }
    }
    uploading = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      handleFiles(input.files);
    }
  }

  function removeImage(index: number) {
    rows = rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, sortOrder: i }));
    onChange(rows);
  }

  // Drag-to-reorder
  let dragItemIndex = $state<number | null>(null);

  function onItemDragStart(e: DragEvent, index: number) {
    dragItemIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  function onItemDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    dragIndex = index;
  }

  function onItemDrop(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragItemIndex === null || dragItemIndex === index) {
      dragItemIndex = null;
      dragIndex = null;
      return;
    }
    const newRows = [...rows];
    const [moved] = newRows.splice(dragItemIndex, 1);
    newRows.splice(index, 0, moved);
    rows = newRows.map((r, i) => ({ ...r, sortOrder: i }));
    onChange(rows);
    dragItemIndex = null;
    dragIndex = null;
  }

  function onItemDragEnd() {
    dragItemIndex = null;
    dragIndex = null;
  }
</script>

<div class="image-uploader">
  <!-- Drop zone -->
  <label
    class="drop-zone"
    class:drag-over={dragOver}
    ondragover={(e) => { e.preventDefault(); dragOver = true; }}
    ondragleave={() => { dragOver = false; }}
    ondrop={handleDrop}
  >
    <input type="file" accept="image/*" multiple onchange={handleInput} hidden />
    {#if uploading}
      <span class="drop-label">Uploading...</span>
    {:else}
      <span class="drop-label">
        Drag & drop images here, or <strong>click to select</strong>
      </span>
      <span class="drop-hint">PNG, JPG, WEBP — converted to WEBP on upload</span>
    {/if}
  </label>

  {#if errorMsg}
    <p class="error-msg">{errorMsg}</p>
  {/if}

  {#if rows.length > 0}
    <div class="image-grid">
      {#each rows as img, i}
        <div
          class="image-card"
          class:dragging={dragItemIndex === i}
          class:drag-target={dragIndex === i && dragItemIndex !== i}
          draggable="true"
          role="img"
          aria-label="Product image {i + 1}, drag to reorder"
          ondragstart={(e) => onItemDragStart(e, i)}
          ondragover={(e) => onItemDragOver(e, i)}
          ondrop={(e) => onItemDrop(e, i)}
          ondragend={onItemDragEnd}
        >
          <img src={img.url} alt="Product image {i + 1}" />
          {#if i === 0}
            <span class="primary-badge">Primary</span>
          {/if}
          <button
            type="button"
            class="btn-delete-img"
            onclick={() => removeImage(i)}
            title="Remove image"
          >
            &times;
          </button>
          <div class="drag-handle" title="Drag to reorder">⠿</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .image-uploader {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 2rem;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    text-align: center;
    gap: 0.4rem;
    background: #fafafa;
  }

  .drop-zone.drag-over {
    border-color: var(--color-accent);
    background: #e8f0fd;
  }

  .drop-label {
    color: var(--color-text);
    font-size: 0.9rem;
  }

  .drop-hint {
    color: var(--color-secondary);
    font-size: 0.78rem;
  }

  .error-msg {
    color: #cc3333;
    font-size: 0.85rem;
  }

  .image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .image-card {
    position: relative;
    width: 120px;
    height: 120px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #e5e5e5;
    background: #f5f5f5;
    cursor: grab;
    transition: border-color 0.15s, opacity 0.15s;
  }

  .image-card.dragging {
    opacity: 0.4;
  }

  .image-card.drag-target {
    border-color: var(--color-accent);
    border-style: dashed;
  }

  .image-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .primary-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    background: var(--color-accent);
    color: #fff;
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .btn-delete-img {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.55);
    border: none;
    color: #fff;
    font-size: 1rem;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    transition: background 0.15s;
  }

  .btn-delete-img:hover {
    background: #cc3333;
  }

  .drag-handle {
    position: absolute;
    bottom: 4px;
    right: 4px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
    text-shadow: 0 0 2px rgba(0,0,0,0.5);
    pointer-events: none;
  }
</style>
