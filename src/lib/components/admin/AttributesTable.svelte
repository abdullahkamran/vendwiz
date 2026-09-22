<script lang="ts">
  import type { ProductAttribute } from '$lib/server/db/schema';

  type AttributeRow = { id?: string; name: string; value: string };

  let {
    attributes = [],
    onChange
  }: {
    attributes: AttributeRow[];
    onChange: (attrs: AttributeRow[]) => void;
  } = $props();

  let rows = $state<AttributeRow[]>(attributes.map((a) => ({ ...a })));

  function addRow() {
    rows = [...rows, { name: '', value: '' }];
    onChange(rows);
  }

  function removeRow(index: number) {
    rows = rows.filter((_, i) => i !== index);
    onChange(rows);
  }

  function updateName(index: number, name: string) {
    rows = rows.map((r, i) => (i === index ? { ...r, name } : r));
    onChange(rows);
  }

  function updateValue(index: number, value: string) {
    rows = rows.map((r, i) => (i === index ? { ...r, value } : r));
    onChange(rows);
  }
</script>

<div class="attributes-table">
  {#if rows.length > 0}
    <table>
      <thead>
        <tr>
          <th>Attribute Name</th>
          <th>Value</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row, i}
          <tr>
            <td>
              <input
                type="text"
                value={row.name}
                placeholder="e.g. Material"
                oninput={(e) => updateName(i, (e.target as HTMLInputElement).value)}
              />
            </td>
            <td>
              <input
                type="text"
                value={row.value}
                placeholder="e.g. 100% Cotton"
                oninput={(e) => updateValue(i, (e.target as HTMLInputElement).value)}
              />
            </td>
            <td>
              <button type="button" class="btn-remove" onclick={() => removeRow(i)} title="Remove">
                &times;
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="empty-msg">No attributes yet.</p>
  {/if}

  <button type="button" class="btn-add" onclick={addRow}>+ Add Attribute</button>
</div>

<style>
  .attributes-table {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    border-bottom: 1px solid #e5e5e5;
    font-weight: 600;
    color: var(--color-secondary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  td {
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid #f0f0f0;
  }

  td input {
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 0.875rem;
    background: #fff;
  }

  td input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .btn-remove {
    background: none;
    border: none;
    color: #cc3333;
    font-size: 1.1rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1;
  }

  .btn-remove:hover {
    background: #ffe0e0;
  }

  .btn-add {
    align-self: flex-start;
    background: none;
    border: 1px dashed var(--color-accent);
    color: var(--color-accent);
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-add:hover {
    background: #e8f0fd;
  }

  .empty-msg {
    color: var(--color-secondary);
    font-size: 0.875rem;
    font-style: italic;
  }
</style>
