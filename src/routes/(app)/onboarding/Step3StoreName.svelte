<script lang="ts">
	interface Props {
		licenseCode: string;
		subdomain: string;
		serverError?: string;
	}

	let { licenseCode, subdomain, serverError }: Props = $props();

	let name = $state('');
	let description = $state('');
	let theme = $state<'minimal' | 'bold' | 'playful'>('minimal');
	let logoPreview = $state<string | null>(null);
	let faviconPreview = $state<string | null>(null);
	let nameError = $state('');

	const themes = [
		{ value: 'minimal', label: 'Minimal', desc: 'Clean and modern, dark navy + red accent' },
		{ value: 'bold', label: 'Bold', desc: 'High contrast, dark slate + orange accent' },
		{ value: 'playful', label: 'Playful', desc: 'Vibrant purple + pink accent' }
	] as const;

	function onLogoChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		logoPreview = URL.createObjectURL(file);
	}

	function onFaviconChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		faviconPreview = URL.createObjectURL(file);
	}

	function validate() {
		if (!name.trim()) {
			nameError = 'Store name is required';
			return false;
		}
		if (name.trim().length < 2) {
			nameError = 'Store name must be at least 2 characters';
			return false;
		}
		nameError = '';
		return true;
	}
</script>

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-xl font-semibold text-[var(--color-primary)]">Set up your store</h2>
		<p class="mt-1 text-sm text-[var(--color-text-muted)]">
			Almost there — give your store a name and choose a look.
		</p>
	</div>

	<!-- This form posts to the page action -->
	<form
		method="POST"
		action="?/createStore"
		enctype="multipart/form-data"
		class="flex flex-col gap-5"
		onsubmit={(e) => {
			if (!validate()) e.preventDefault();
		}}
	>
		<!-- Hidden: pass verified state from prior steps -->
		<input type="hidden" name="licenseCode" value={licenseCode} />
		<input type="hidden" name="subdomain" value={subdomain} />

		{#if serverError}
			<div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
				{serverError}
			</div>
		{/if}

		<!-- Store name -->
		<div class="flex flex-col gap-1.5">
			<label for="store-name" class="text-sm font-medium text-[var(--color-text)]">
				Store name <span class="text-[var(--color-error)]">*</span>
			</label>
			<input
				id="store-name"
				name="name"
				type="text"
				bind:value={name}
				oninput={() => (nameError = '')}
				placeholder="My Awesome Store"
				maxlength="60"
				required
				class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]
					{nameError ? 'border-red-400' : ''}"
			/>
			{#if nameError}
				<p class="text-xs text-red-600">{nameError}</p>
			{/if}
		</div>

		<!-- Description -->
		<div class="flex flex-col gap-1.5">
			<label for="store-desc" class="text-sm font-medium text-[var(--color-text)]">
				Description
				<span class="text-[var(--color-text-muted)] font-normal">(optional)</span>
			</label>
			<textarea
				id="store-desc"
				name="description"
				bind:value={description}
				placeholder="A short description of your store…"
				maxlength="500"
				rows="3"
				class="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
			></textarea>
		</div>

		<!-- Logo upload -->
		<div class="flex flex-col gap-1.5">
			<span class="text-sm font-medium text-[var(--color-text)]">
				Logo
				<span class="text-[var(--color-text-muted)] font-normal">(optional)</span>
			</span>
			<div class="flex items-center gap-4">
				{#if logoPreview}
					<img src={logoPreview} alt="Logo preview" class="w-16 h-16 object-contain rounded-lg border border-[var(--color-border)]" />
				{:else}
					<div class="w-16 h-16 rounded-lg border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-xs">
						Logo
					</div>
				{/if}
				<label
					class="cursor-pointer text-sm font-medium text-[var(--color-accent)] hover:underline"
				>
					{logoPreview ? 'Change' : 'Upload logo'}
					<input
						type="file"
						name="logo"
						accept="image/*"
						class="hidden"
						onchange={onLogoChange}
					/>
				</label>
			</div>
		</div>

		<!-- Favicon upload -->
		<div class="flex flex-col gap-1.5">
			<span class="text-sm font-medium text-[var(--color-text)]">
				Favicon
				<span class="text-[var(--color-text-muted)] font-normal">(optional)</span>
			</span>
			<div class="flex items-center gap-4">
				{#if faviconPreview}
					<img src={faviconPreview} alt="Favicon preview" class="w-10 h-10 object-contain rounded border border-[var(--color-border)]" />
				{:else}
					<div class="w-10 h-10 rounded border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-xs">
						Fav
					</div>
				{/if}
				<label class="cursor-pointer text-sm font-medium text-[var(--color-accent)] hover:underline">
					{faviconPreview ? 'Change' : 'Upload favicon'}
					<input
						type="file"
						name="favicon"
						accept="image/*,.ico"
						class="hidden"
						onchange={onFaviconChange}
					/>
				</label>
			</div>
		</div>

		<!-- Theme selection -->
		<div class="flex flex-col gap-2">
			<span class="text-sm font-medium text-[var(--color-text)]">Theme</span>
			<div class="grid grid-cols-3 gap-3">
				{#each themes as t}
					<label
						class="relative flex flex-col gap-1 border-2 rounded-xl p-3 cursor-pointer transition-all
							{theme === t.value
							? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
							: 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40'}"
					>
						<input
							type="radio"
							name="theme"
							value={t.value}
							bind:group={theme}
							class="sr-only"
						/>
						<span class="text-sm font-medium text-[var(--color-text)]">{t.label}</span>
						<span class="text-xs text-[var(--color-text-muted)]">{t.desc}</span>
						{#if theme === t.value}
							<span class="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-[10px]">✓</span>
						{/if}
					</label>
				{/each}
			</div>
		</div>

		<button
			type="submit"
			class="w-full bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
		>
			Launch my store →
		</button>
	</form>
</div>
