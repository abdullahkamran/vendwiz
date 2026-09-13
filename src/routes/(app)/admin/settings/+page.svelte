<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { CustomTheme } from '$lib/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let storeName = $state(data.store.name);
	let description = $state(data.store.description ?? '');
	let logoUrl = $state(data.store.logoUrl ?? '');
	let faviconUrl = $state(data.store.faviconUrl ?? '');
	let theme = $state(data.store.theme ?? 'minimal');
	let seoTitle = $state(data.store.seoTitle ?? '');
	let seoDescription = $state(data.store.seoDescription ?? '');

	const customThemeData = data.store.customTheme as CustomTheme | null;
	let primaryColor = $state(customThemeData?.primaryColor ?? '#1a1a2e');
	let accentColor = $state(customThemeData?.accentColor ?? '#e94560');
	let secondaryColor = $state(customThemeData?.secondaryColor ?? '#f5f5f5');

	let uploadingLogo = $state(false);
	let uploadingFavicon = $state(false);
	let saving = $state(false);

	const themes = [
		{
			id: 'minimal',
			label: 'Minimal',
			primary: '#1a1a2e',
			accent: '#e94560',
			description: 'Clean and professional'
		},
		{
			id: 'bold',
			label: 'Bold',
			primary: '#0f172a',
			accent: '#f97316',
			description: 'Strong and modern'
		},
		{
			id: 'playful',
			label: 'Playful',
			primary: '#7c3aed',
			accent: '#ec4899',
			description: 'Fun and vibrant'
		},
		{ id: 'custom', label: 'Custom', primary: primaryColor, accent: accentColor, description: 'Your colors' }
	];

	async function uploadImage(file: File, type: 'logo' | 'favicon') {
		const fd = new FormData();
		fd.append('file', file);
		fd.append('type', type);

		const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
		if (!res.ok) throw new Error('Upload failed');
		const json = await res.json();
		return json.url as string;
	}

	async function handleLogoChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploadingLogo = true;
		try {
			logoUrl = await uploadImage(file, 'logo');
		} catch {
			alert('Logo upload failed. Please try again.');
		} finally {
			uploadingLogo = false;
		}
	}

	async function handleFaviconChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploadingFavicon = true;
		try {
			faviconUrl = await uploadImage(file, 'favicon');
		} catch {
			alert('Favicon upload failed. Please try again.');
		} finally {
			uploadingFavicon = false;
		}
	}
</script>

{#if form?.error}
	<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
		{form.error}
	</div>
{/if}
{#if form?.success}
	<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
		Settings saved successfully.
	</div>
{/if}

<form
	method="POST"
	action="?/update"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}
>
	<!-- Branding -->
	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<h2 class="text-lg font-semibold mb-4">Branding</h2>

		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="name">
					Store Name <span class="text-red-500">*</span>
				</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					bind:value={storeName}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="My Awesome Store"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="description">
					Store Description
				</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					bind:value={description}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent] resize-none"
					placeholder="Tell customers about your store..."
				></textarea>
			</div>

			<!-- Logo upload -->
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1">Store Logo</label>
				<div class="flex items-center gap-4">
					{#if logoUrl}
						<img src={logoUrl} alt="Store logo" class="h-16 w-auto rounded-lg border border-[--color-border] object-contain bg-white p-1" />
					{:else}
						<div class="h-16 w-16 rounded-lg border border-dashed border-[--color-border] flex items-center justify-center text-[--color-text-muted] text-xs">
							No logo
						</div>
					{/if}
					<label class="cursor-pointer">
						<span class="inline-flex items-center gap-1 px-3 py-2 text-sm border border-[--color-border] rounded-lg hover:bg-[--color-surface-2] transition-colors">
							{uploadingLogo ? 'Uploading…' : 'Upload Logo'}
						</span>
						<input
							type="file"
							accept="image/*"
							class="sr-only"
							onchange={handleLogoChange}
							disabled={uploadingLogo}
						/>
					</label>
				</div>
				<input type="hidden" name="logoUrl" value={logoUrl} />
				<p class="text-xs text-[--color-text-muted] mt-1">Recommended: 400px wide, max 2MB. Converted to WebP.</p>
			</div>

			<!-- Favicon upload -->
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1">Favicon</label>
				<div class="flex items-center gap-4">
					{#if faviconUrl}
						<img src={faviconUrl} alt="Favicon" class="h-8 w-8 rounded border border-[--color-border] object-contain bg-white p-0.5" />
					{:else}
						<div class="h-8 w-8 rounded border border-dashed border-[--color-border] flex items-center justify-center text-[--color-text-muted] text-xs">
							–
						</div>
					{/if}
					<label class="cursor-pointer">
						<span class="inline-flex items-center gap-1 px-3 py-2 text-sm border border-[--color-border] rounded-lg hover:bg-[--color-surface-2] transition-colors">
							{uploadingFavicon ? 'Uploading…' : 'Upload Favicon'}
						</span>
						<input
							type="file"
							accept="image/*"
							class="sr-only"
							onchange={handleFaviconChange}
							disabled={uploadingFavicon}
						/>
					</label>
				</div>
				<input type="hidden" name="faviconUrl" value={faviconUrl} />
				<p class="text-xs text-[--color-text-muted] mt-1">Resized to 64×64px. Max 2MB.</p>
			</div>
		</div>
	</section>

	<!-- Theme -->
	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<h2 class="text-lg font-semibold mb-4">Theme</h2>

		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
			{#each themes as t}
				<label class="cursor-pointer">
					<input type="radio" name="theme" value={t.id} bind:group={theme} class="sr-only" />
					<div
						class="rounded-xl border-2 p-3 transition-all {theme === t.id
							? 'border-[--color-accent] shadow-sm'
							: 'border-[--color-border] hover:border-gray-300'}"
					>
						<div class="flex gap-1 mb-2">
							<div class="w-5 h-5 rounded-full" style:background-color={t.primary}></div>
							<div class="w-5 h-5 rounded-full" style:background-color={t.accent}></div>
						</div>
						<div class="text-sm font-medium">{t.label}</div>
						<div class="text-xs text-[--color-text-muted]">{t.description}</div>
					</div>
				</label>
			{/each}
		</div>

		{#if theme === 'custom'}
			<div class="grid grid-cols-3 gap-4 mt-4 p-4 bg-[--color-surface-2] rounded-lg">
				<div>
					<label class="block text-xs font-medium text-[--color-text] mb-1" for="primaryColor">Primary Color</label>
					<div class="flex gap-2 items-center">
						<input
							id="primaryColor"
							name="primaryColor"
							type="color"
							bind:value={primaryColor}
							class="h-9 w-12 cursor-pointer rounded border border-[--color-border] p-0.5"
						/>
						<input
							type="text"
							value={primaryColor}
							oninput={(e) => (primaryColor = (e.target as HTMLInputElement).value)}
							class="flex-1 border border-[--color-border] rounded px-2 py-1.5 text-xs font-mono"
							maxlength="7"
						/>
					</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-[--color-text] mb-1" for="accentColor">Accent Color</label>
					<div class="flex gap-2 items-center">
						<input
							id="accentColor"
							name="accentColor"
							type="color"
							bind:value={accentColor}
							class="h-9 w-12 cursor-pointer rounded border border-[--color-border] p-0.5"
						/>
						<input
							type="text"
							value={accentColor}
							oninput={(e) => (accentColor = (e.target as HTMLInputElement).value)}
							class="flex-1 border border-[--color-border] rounded px-2 py-1.5 text-xs font-mono"
							maxlength="7"
						/>
					</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-[--color-text] mb-1" for="secondaryColor">Secondary Color</label>
					<div class="flex gap-2 items-center">
						<input
							id="secondaryColor"
							name="secondaryColor"
							type="color"
							bind:value={secondaryColor}
							class="h-9 w-12 cursor-pointer rounded border border-[--color-border] p-0.5"
						/>
						<input
							type="text"
							value={secondaryColor}
							oninput={(e) => (secondaryColor = (e.target as HTMLInputElement).value)}
							class="flex-1 border border-[--color-border] rounded px-2 py-1.5 text-xs font-mono"
							maxlength="7"
						/>
					</div>
				</div>
			</div>
		{/if}
	</section>

	<!-- SEO -->
	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<h2 class="text-lg font-semibold mb-4">SEO</h2>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="seoTitle">
					Meta Title
				</label>
				<input
					id="seoTitle"
					name="seoTitle"
					type="text"
					bind:value={seoTitle}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
					placeholder="My Store — Best Products Online"
					maxlength="60"
				/>
				<p class="text-xs text-[--color-text-muted] mt-1">{seoTitle.length}/60 characters</p>
			</div>
			<div>
				<label class="block text-sm font-medium text-[--color-text] mb-1" for="seoDescription">
					Meta Description
				</label>
				<textarea
					id="seoDescription"
					name="seoDescription"
					rows="3"
					bind:value={seoDescription}
					class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent] resize-none"
					placeholder="Discover our amazing products…"
					maxlength="160"
				></textarea>
				<p class="text-xs text-[--color-text-muted] mt-1">{seoDescription.length}/160 characters</p>
			</div>
			<!-- SERP Preview -->
			{#if seoTitle || seoDescription}
				<div class="p-3 bg-white border border-[--color-border] rounded-lg text-sm">
					<p class="text-xs text-[--color-text-muted] mb-2 font-medium">Google Preview</p>
					<p class="text-blue-600 text-base truncate">{seoTitle || storeName}</p>
					<p class="text-green-700 text-xs">yourstore.vendwiz.com</p>
					<p class="text-gray-600 text-sm mt-0.5 line-clamp-2">{seoDescription || description}</p>
				</div>
			{/if}
		</div>
	</section>

	<div class="flex justify-end">
		<button
			type="submit"
			disabled={saving || uploadingLogo || uploadingFavicon}
			class="px-5 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
		>
			{saving ? 'Saving…' : 'Save Settings'}
		</button>
	</div>
</form>
