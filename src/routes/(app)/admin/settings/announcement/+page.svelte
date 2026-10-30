<script lang="ts">
	import { enhance } from '$app/forms';
	import { mediaUrl } from '$lib/media';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let enabled = $state(data.store.announcementEnabled);
	let text = $state(data.store.announcementText ?? '');
	let bgColor = $state(data.store.announcementBg ?? '#1a1a2e');
	let fgColor = $state(data.store.announcementFg ?? '#ffffff');
	let saving = $state(false);

	// Home page slideshow. Empty = the storefront shows product images instead.
	const MAX_SLIDES = 8;
	type Slide = { imageUrl: string; title: string; description: string };
	let slides = $state<Slide[]>([]);
	let uploading = $state(false);
	let uploadError = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let replaceIndex: number | null = null; // slide whose image is being replaced; null = new slide

	function pickImage(index: number | null) {
		replaceIndex = index;
		fileInput?.click();
	}

	async function onFileChosen(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			uploadError = 'Only image files are accepted';
			return;
		}
		uploading = true;
		uploadError = '';
		try {
			const body = new FormData();
			body.append('file', file);
			body.append('folder', 'slides');
			const res = await fetch('/api/admin/upload', { method: 'POST', body });
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				uploadError = err?.message ?? 'Upload failed';
				return;
			}
			const { url } = await res.json();
			if (replaceIndex !== null && slides[replaceIndex]) slides[replaceIndex].imageUrl = url;
			else slides.push({ imageUrl: url, title: '', description: '' });
		} catch {
			uploadError = 'Network error during upload';
		} finally {
			uploading = false;
		}
	}

	function moveSlide(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= slides.length) return;
		[slides[i], slides[j]] = [slides[j], slides[i]];
	}
	function removeSlide(i: number) {
		slides.splice(i, 1);
	}

	// Re-sync state from server after save so a reload reflects stored values
	$effect(() => {
		enabled = data.store.announcementEnabled;
		text = data.store.announcementText ?? '';
		bgColor = data.store.announcementBg ?? '#1a1a2e';
		fgColor = data.store.announcementFg ?? '#ffffff';
		slides = (data.store.heroSlides ?? []).map((s) => ({ ...s }));
	});
</script>

<!-- Live preview -->
{#if enabled && text}
	<div
		class="rounded-lg px-4 py-2 text-sm text-center font-medium mb-6"
		style:background-color={bgColor}
		style:color={fgColor}
	>
		{text}
	</div>
{:else}
	<div class="rounded-lg px-4 py-2 text-sm text-center text-[--color-text-muted] border border-dashed border-[--color-border] mb-6">
		Announcement bar preview will appear here
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
	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<h2 class="text-lg font-semibold mb-4">Announcement Bar</h2>
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-semibold text-[--color-text]">Enable Announcement Bar</p>
					<p class="text-xs text-[--color-text-muted]">Show a banner at the top of your storefront</p>
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						name="announcementEnabled"
						bind:checked={enabled}
						class="sr-only peer"
					/>
					<div
						class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[--color-accent] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"
					></div>
				</label>
			</div>

			{#if enabled}
				<div>
					<label class="block text-sm font-semibold text-[--color-text] mb-1" for="announcementText">
						Announcement Text
					</label>
					<input
						id="announcementText"
						name="announcementText"
						type="text"
						bind:value={text}
						maxlength="200"
						class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
						placeholder="🎉 Free shipping on orders over Rs. 2000!"
					/>
					<p class="text-xs text-[--color-text-muted] mt-1">{text.length}/200 characters</p>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-semibold text-[--color-text] mb-1" for="announcementBg">
							Background Color
						</label>
						<div class="flex gap-2 items-center">
							<input
								id="announcementBg"
								name="announcementBg"
								type="color"
								bind:value={bgColor}
								class="h-9 w-12 cursor-pointer rounded border border-[--color-border] p-0.5"
							/>
							<input
								type="text"
								value={bgColor}
								oninput={(e) => (bgColor = (e.target as HTMLInputElement).value)}
								class="flex-1 border border-[--color-border] rounded px-2 py-1.5 text-sm font-mono"
								maxlength="7"
							/>
						</div>
					</div>
					<div>
						<label class="block text-sm font-semibold text-[--color-text] mb-1" for="announcementFg">
							Text Color
						</label>
						<div class="flex gap-2 items-center">
							<input
								id="announcementFg"
								name="announcementFg"
								type="color"
								bind:value={fgColor}
								class="h-9 w-12 cursor-pointer rounded border border-[--color-border] p-0.5"
							/>
							<input
								type="text"
								value={fgColor}
								oninput={(e) => (fgColor = (e.target as HTMLInputElement).value)}
								class="flex-1 border border-[--color-border] rounded px-2 py-1.5 text-sm font-mono"
								maxlength="7"
							/>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
		<h2 class="text-lg font-semibold mb-1">Home Page Slideshow</h2>
		<p class="text-sm text-[--color-text-muted] mb-4">
			Your own slides for the top of the home page, each with an image, a heading and a short description.
			With no slides, the slideshow shows your latest products.
		</p>

		<input type="hidden" name="heroSlides" value={JSON.stringify(slides)} />
		<input bind:this={fileInput} type="file" accept="image/*" class="hidden" onchange={onFileChosen} />

		<div class="space-y-4">
			{#each slides as slide, i}
				<div class="flex flex-col sm:flex-row gap-4 border border-[--color-border] rounded-lg p-3">
					<button
						type="button"
						class="relative shrink-0 w-full sm:w-48 aspect-[16/9] rounded-md overflow-hidden bg-gray-100 group"
						onclick={() => pickImage(i)}
						disabled={uploading}
						aria-label="Change image for slide {i + 1}"
					>
						<img src={mediaUrl(slide.imageUrl)} alt="" class="w-full h-full object-cover" />
						<span class="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
							Change image
						</span>
					</button>
					<div class="flex-1 space-y-2">
						<div>
							<label class="block text-sm font-semibold text-[--color-text] mb-1" for="slideTitle-{i}">Heading</label>
							<input
								id="slideTitle-{i}"
								type="text"
								maxlength="80"
								bind:value={slide.title}
								class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
								placeholder="New Winter Collection"
							/>
						</div>
						<div>
							<label class="block text-sm font-semibold text-[--color-text] mb-1" for="slideDesc-{i}">Description</label>
							<input
								id="slideDesc-{i}"
								type="text"
								maxlength="200"
								bind:value={slide.description}
								class="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
								placeholder="Handmade pieces, now in store"
							/>
						</div>
					</div>
					<div class="flex sm:flex-col gap-2 sm:justify-start">
						<button type="button" class="btn btn-secondary" onclick={() => moveSlide(i, -1)} disabled={i === 0} aria-label="Move slide {i + 1} up">↑</button>
						<button type="button" class="btn btn-secondary" onclick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} aria-label="Move slide {i + 1} down">↓</button>
						<button type="button" class="btn btn-secondary" onclick={() => removeSlide(i)} aria-label="Remove slide {i + 1}">Remove</button>
					</div>
				</div>
			{/each}
		</div>

		{#if slides.length < MAX_SLIDES}
			<button type="button" class="btn btn-secondary mt-4" onclick={() => pickImage(null)} disabled={uploading}>
				{uploading ? 'Uploading…' : '+ Add slide'}
			</button>
		{/if}
		{#if uploadError}<p class="text-sm text-red-600 mt-2">{uploadError}</p>{/if}
		<p class="text-xs text-[--color-text-muted] mt-2">
			Wide landscape images (around 2400 × 1000 px) look best. Up to {MAX_SLIDES} slides.
		</p>
	</section>

	<div class="flex items-center justify-end gap-3">
		{#if form?.error}
			<p class="text-sm text-red-600">{form.error}</p>
		{/if}
		{#if form?.success}
			<p class="text-sm text-green-600">Settings saved successfully.</p>
		{/if}
		<button
			type="submit"
			disabled={saving}
			class="btn btn-primary"
		>
			{saving ? 'Saving…' : 'Save'}
		</button>
	</div>
</form>
