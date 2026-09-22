<script lang="ts">
  import type { PageData } from './$types';
  import { slugify } from '$lib/utils/slug';

  let { data }: { data: PageData } = $props();

  type Category = {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    storeId: string;
    description: string | null;
    imageUrl: string | null;
    createdAt: Date;
    parentId?: string | null; // legacy field — not present in DB, kept for template compat
  };

  let categories = $state<Category[]>(data.categories as Category[]);

  // Modal state
  let showModal = $state(false);
  let editingCategory = $state<Category | null>(null);
  let deleteTarget = $state<Category | null>(null);

  // Form fields
  let formName = $state('');
  let formSlug = $state('');
  let formParentId = $state<string>('');
  let formSortOrder = $state(0);
  let formError = $state('');
  let saving = $state(false);
  let slugManuallyEdited = $state(false);

  // Drag reorder state
  let dragIndex = $state<number | null>(null);
  let dropIndex = $state<number | null>(null);

  // Root categories (no parent) for the parent selector
  let rootCategories = $derived(categories.filter((c) => !c.parentId));

  function openNew() {
    editingCategory = null;
    formName = '';
    formSlug = '';
    formParentId = '';
    formSortOrder = categories.length;
    formError = '';
    slugManuallyEdited = false;
    showModal = true;
  }

  function openEdit(cat: Category) {
    editingCategory = cat;
    formName = cat.name;
    formSlug = cat.slug;
    formParentId = cat.parentId ?? '';
    formSortOrder = cat.sortOrder;
    formError = '';
    slugManuallyEdited = true;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingCategory = null;
    formError = '';
  }

  function handleNameInput(e: Event) {
    formName = (e.target as HTMLInputElement).value;
    if (!slugManuallyEdited) {
      formSlug = slugify(formName);
    }
  }

  function handleSlugInput(e: Event) {
    formSlug = (e.target as HTMLInputElement).value;
    slugManuallyEdited = true;
  }

  async function saveCategory() {
    if (!formName.trim()) {
      formError = 'Name is required';
      return;
    }
    if (!formSlug.trim()) {
      formError = 'Slug is required';
      return;
    }

    saving = true;
    formError = '';

    const payload = {
      name: formName.trim(),
      slug: formSlug.trim(),
      parentId: formParentId || null,
      sortOrder: formSortOrder
    };

    try {
      let res: Response;
      if (editingCategory) {
        res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        formError = err?.error ?? 'Failed to save category';
        return;
      }

      const saved = await res.json();

      if (editingCategory) {
        categories = categories.map((c) => (c.id === saved.id ? saved : c));
      } else {
        categories = [...categories, saved];
      }

      closeModal();
    } catch {
      formError = 'Network error';
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    deleteTarget = null;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? 'Cannot delete category');
        return;
      }
      categories = categories.filter((c) => c.id !== id);
    } catch {
      alert('Network error');
    }
  }

  // Drag-to-reorder
  function onDragStart(e: DragEvent, index: number) {
    dragIndex = index;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    dropIndex = index;
  }

  async function onDrop(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      dragIndex = null;
      dropIndex = null;
      return;
    }
    const newList = [...categories];
    const [moved] = newList.splice(dragIndex, 1);
    newList.splice(index, 0, moved);
    const reordered = newList.map((c, i) => ({ ...c, sortOrder: i }));
    categories = reordered;
    dragIndex = null;
    dropIndex = null;

    // Persist
    await fetch('/api/admin/categories/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((c) => ({ id: c.id, sortOrder: c.sortOrder })))
    });
  }

  function onDragEnd() {
    dragIndex = null;
    dropIndex = null;
  }

  function getParentName(parentId: string | null): string {
    if (!parentId) return '—';
    return categories.find((c) => c.id === parentId)?.name ?? '—';
  }
</script>

<div class="page">
  <div class="page-header">
    <h1>Categories</h1>
    <button class="btn-primary" onclick={openNew}>+ New Category</button>
  </div>

  {#if categories.length === 0}
    <div class="empty-state">
      <p>No categories yet. Create your first category.</p>
    </div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width:32px"></th>
            <th>Name</th>
            <th>Slug</th>
            <th>Parent</th>
            <th>Sort Order</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each categories as cat, i}
            <tr
              class:dragging={dragIndex === i}
              class:drop-target={dropIndex === i && dragIndex !== i}
              draggable="true"
              ondragstart={(e) => onDragStart(e, i)}
              ondragover={(e) => onDragOver(e, i)}
              ondrop={(e) => onDrop(e, i)}
              ondragend={onDragEnd}
            >
              <td class="drag-cell">⠿</td>
              <td class:child-indent={!!cat.parentId}>
                {cat.name}
              </td>
              <td><code>{cat.slug}</code></td>
              <td>{getParentName(cat.parentId ?? null)}</td>
              <td>{cat.sortOrder}</td>
              <td class="actions-cell">
                <button class="btn-edit" onclick={() => openEdit(cat)}>Edit</button>
                <button class="btn-delete" onclick={() => (deleteTarget = cat)}>Delete</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Create/Edit Modal -->
{#if showModal}
  <div class="modal-backdrop" onclick={closeModal} onkeydown={(e) => e.key === 'Escape' && closeModal()} role="presentation" tabindex="-1">
    <div class="modal" role="dialog" aria-modal="true" tabindex="0" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>{editingCategory ? 'Edit Category' : 'New Category'}</h2>
        <button class="btn-close" onclick={closeModal} aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-field">
          <label for="cat-name">Name <span class="required">*</span></label>
          <input
            id="cat-name"
            type="text"
            value={formName}
            oninput={handleNameInput}
            placeholder="e.g. Men's Clothing"
          />
        </div>

        <div class="form-field">
          <label for="cat-slug">Slug <span class="required">*</span></label>
          <input
            id="cat-slug"
            type="text"
            value={formSlug}
            oninput={handleSlugInput}
            placeholder="e.g. mens-clothing"
          />
          <span class="field-hint">Lowercase, hyphens only</span>
        </div>

        <div class="form-field">
          <label for="cat-parent">Parent Category</label>
          <select id="cat-parent" bind:value={formParentId}>
            <option value="">None (root category)</option>
            {#each rootCategories as rc}
              {#if !editingCategory || rc.id !== editingCategory.id}
                <option value={rc.id}>{rc.name}</option>
              {/if}
            {/each}
          </select>
        </div>

        <div class="form-field">
          <label for="cat-sort">Sort Order</label>
          <input
            id="cat-sort"
            type="number"
            bind:value={formSortOrder}
            min="0"
          />
        </div>

        {#if formError}
          <p class="form-error">{formError}</p>
        {/if}
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick={closeModal} disabled={saving}>Cancel</button>
        <button class="btn-primary" onclick={saveCategory} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if deleteTarget}
  <div class="modal-backdrop" onclick={() => (deleteTarget = null)} onkeydown={(e) => e.key === 'Escape' && (deleteTarget = null)} role="presentation" tabindex="-1">
    <div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="0" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Delete Category</h2>
      </div>
      <div class="modal-body">
        <p>
          Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be
          undone. Categories with assigned products cannot be deleted.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => (deleteTarget = null)}>Cancel</button>
        <button class="btn-danger" onclick={confirmDelete}>Delete</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 960px;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    color: var(--color-secondary);
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
  }

  .table-container {
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th {
    text-align: left;
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    border-bottom: 1px solid #e5e5e5;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-secondary);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr.dragging {
    opacity: 0.4;
  }

  tr.drop-target {
    background: #e8f0fd;
  }

  tr:hover td {
    background: #fafafa;
  }

  .drag-cell {
    color: #bbb;
    cursor: grab;
    user-select: none;
    font-size: 1rem;
    padding: 0.75rem 0.5rem;
  }

  .child-indent {
    padding-left: 2rem;
  }

  code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-family: monospace;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
  }

  /* Buttons */
  .btn-primary {
    background: var(--color-text);
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-primary:hover {
    opacity: 0.85;
  }

  .btn-secondary {
    background: #fff;
    color: var(--color-text);
    border: 1px solid #e0e0e0;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn-secondary:hover {
    background: var(--color-surface);
  }

  .btn-edit {
    background: none;
    border: 1px solid #e0e0e0;
    padding: 0.3rem 0.6rem;
    border-radius: 5px;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--color-text);
  }

  .btn-edit:hover {
    background: var(--color-surface);
  }

  .btn-delete {
    background: none;
    border: 1px solid #ffd0d0;
    padding: 0.3rem 0.6rem;
    border-radius: 5px;
    font-size: 0.8rem;
    cursor: pointer;
    color: #cc3333;
  }

  .btn-delete:hover {
    background: #ffe0e0;
  }

  .btn-danger {
    background: #cc3333;
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-danger:hover {
    background: #aa2222;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-secondary);
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: #fff;
    border-radius: 10px;
    width: 480px;
    max-width: 95vw;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
  }

  .modal-sm {
    width: 360px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem 0;
  }

  .modal-header h2 {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .modal-body {
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    border-top: 1px solid #f0f0f0;
  }

  /* Form */
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .form-field label {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .form-field input,
  .form-field select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.9rem;
    background: #fff;
    width: 100%;
  }

  .form-field input:focus,
  .form-field select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .field-hint {
    font-size: 0.76rem;
    color: var(--color-secondary);
  }

  .form-error {
    color: #cc3333;
    font-size: 0.85rem;
  }

  .required {
    color: #cc3333;
  }
</style>
