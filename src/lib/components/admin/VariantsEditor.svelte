<script lang="ts">
  type VariantOption = { label: string; price_modifier: number };
  type VariantRow = { id?: string; name: string; options: VariantOption[] };

  let {
    variants = [],
    onChange
  }: {
    variants: VariantRow[];
    onChange: (variants: VariantRow[]) => void;
  } = $props();

  let rows = $state<VariantRow[]>(
    variants.map((v) => ({
      ...v,
      options: (v.options ?? []).map((o) => ({ ...o }))
    }))
  );

  function addVariant() {
    rows = [...rows, { name: '', options: [{ label: '', price_modifier: 0 }] }];
    onChange(rows);
  }

  function removeVariant(vi: number) {
    rows = rows.filter((_, i) => i !== vi);
    onChange(rows);
  }

  function updateVariantName(vi: number, name: string) {
    rows = rows.map((r, i) => (i === vi ? { ...r, name } : r));
    onChange(rows);
  }

  function addOption(vi: number) {
    rows = rows.map((r, i) =>
      i === vi ? { ...r, options: [...r.options, { label: '', price_modifier: 0 }] } : r
    );
    onChange(rows);
  }

  function removeOption(vi: number, oi: number) {
    rows = rows.map((r, i) =>
      i === vi ? { ...r, options: r.options.filter((_, j) => j !== oi) } : r
    );
    onChange(rows);
  }

  function updateOptionLabel(vi: number, oi: number, label: string) {
    rows = rows.map((r, i) =>
      i === vi
        ? {
            ...r,
            options: r.options.map((o, j) => (j === oi ? { ...o, label } : o))
          }
        : r
    );
    onChange(rows);
  }

  function updateOptionModifier(vi: number, oi: number, modStr: string) {
    const price_modifier = parseFloat(modStr) || 0;
    rows = rows.map((r, i) =>
      i === vi
        ? {
            ...r,
            options: r.options.map((o, j) => (j === oi ? { ...o, price_modifier } : o))
          }
        : r
    );
    onChange(rows);
  }
</script>

<div class="variants-editor">
  {#each rows as variant, vi}
    <div class="variant-block">
      <div class="variant-header">
        <input
          type="text"
          class="variant-name-input"
          value={variant.name}
          placeholder="Variant name (e.g. Size, Color)"
          oninput={(e) => updateVariantName(vi, (e.target as HTMLInputElement).value)}
        />
        <button type="button" class="btn-remove-variant" onclick={() => removeVariant(vi)}>
          Remove Variant
        </button>
      </div>

      <div class="options-table-wrap">
        <table class="options-table">
          <thead>
            <tr>
              <th>Option Label</th>
              <th>Price Modifier</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each variant.options as option, oi}
              <tr>
                <td>
                  <input
                    type="text"
                    value={option.label}
                    placeholder="e.g. Small"
                    oninput={(e) =>
                      updateOptionLabel(vi, oi, (e.target as HTMLInputElement).value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={option.price_modifier}
                    step="0.01"
                    placeholder="0.00"
                    oninput={(e) =>
                      updateOptionModifier(vi, oi, (e.target as HTMLInputElement).value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    class="btn-remove-option"
                    onclick={() => removeOption(vi, oi)}
                    title="Remove option"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <button type="button" class="btn-add-option" onclick={() => addOption(vi)}>
          + Add Option
        </button>
      </div>
    </div>
  {/each}

  {#if rows.length === 0}
    <p class="empty-msg">No variants yet.</p>
  {/if}

  <button type="button" class="btn-add-variant" onclick={addVariant}>+ Add Variant</button>
</div>

<style>
  .variants-editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .variant-block {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 1rem;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .variant-header {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .variant-name-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    background: #fff;
  }

  .variant-name-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .btn-remove-variant {
    background: none;
    border: 1px solid #cc3333;
    color: #cc3333;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-remove-variant:hover {
    background: #ffe0e0;
  }

  .options-table-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .options-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .options-table th {
    text-align: left;
    padding: 0.4rem 0.5rem;
    background: #fff;
    border-bottom: 1px solid #e5e5e5;
    font-weight: 600;
    color: var(--color-secondary);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .options-table td {
    padding: 0.35rem 0.4rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .options-table td input {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 0.875rem;
    background: #fff;
  }

  .options-table td input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .btn-remove-option {
    background: none;
    border: none;
    color: #cc3333;
    font-size: 1.1rem;
    padding: 0.2rem 0.4rem;
    cursor: pointer;
    border-radius: 4px;
    line-height: 1;
  }

  .btn-remove-option:hover {
    background: #ffe0e0;
  }

  .btn-add-option {
    align-self: flex-start;
    background: none;
    border: 1px dashed #aaa;
    color: var(--color-secondary);
    padding: 0.35rem 0.6rem;
    border-radius: 5px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .btn-add-option:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .btn-add-variant {
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

  .btn-add-variant:hover {
    background: #e8f0fd;
  }

  .empty-msg {
    color: var(--color-secondary);
    font-size: 0.875rem;
    font-style: italic;
  }
</style>
