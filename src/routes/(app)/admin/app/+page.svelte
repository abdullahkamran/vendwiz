<script lang="ts">
	import { enhance } from '$app/forms';
	import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
	import { ANDROID_STEPS, type AndroidStep } from '$lib/android';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let store = $derived(data.store);
	let done = $derived(new Set<string>(store.androidStepsDone));
	let doneCount = $derived(ANDROID_STEPS.filter((s) => done.has(s)).length);
	// The first step not yet ticked off starts expanded
	let current = $derived(ANDROID_STEPS.find((s) => !done.has(s)) ?? null);

	let packageName = $state(data.store.androidPackageName ?? data.suggestedPackage);
	let fingerprints = $state(data.store.androidCertFingerprints.join('\n'));
	let playUrl = $state(data.store.androidPlayUrl ?? '');
	let busy = $state<string | null>(null);
	let confirmDisable = $state(false);
	let copied = $state<string | null>(null);

	let pkg = $derived(store.androidPackageName ?? data.suggestedPackage);
	let assetLinksUrl = $derived(`${data.storeUrl}/.well-known/assetlinks.json`);
	let pwaBuilderUrl = $derived(`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(data.storeUrl)}`);
	// Images are rendered per store by /manifest-icon; ?base= tells it which store from the admin origin
	let imgQuery = $derived(`base=${encodeURIComponent(`/store/${store.subdomain}`)}&v=${encodeURIComponent(store.faviconUrl ?? store.logoUrl ?? store.name)}`);

	let shortDescription = $derived(
		(store.description?.trim() || `Shop ${store.name} — browse products and order in a few taps.`).slice(0, 80)
	);
	let fullDescription = $derived(
		`${store.description?.trim() || `Welcome to ${store.name}!`}\n\nWith the ${store.name} app you can:\n• Browse our full range of products\n• Watch product videos\n• Order in a few taps and pay with cash on delivery or bank transfer\n• Track your orders\n\nQuestions? Contact us any time from the app.`
	);

	const checkLabels: Record<keyof PageData['checks'], { label: string; fix: string; href?: string }> = {
		ownOrigin: { label: 'Store is live at its own https address', fix: 'The app can only be linked to a live store address like yourstore.vendwiz.com.' },
		icon: { label: 'Logo or favicon uploaded (used as the app icon)', fix: 'Upload one in Settings → General.', href: '/admin/settings' },
		description: { label: 'Store description written (used in the Play listing)', fix: 'Add one in Settings → General.', href: '/admin/settings' },
		contactEmail: { label: 'Contact email set (Google shows it on your listing)', fix: 'Add one in Settings → Social.', href: '/admin/settings/social' },
		products: { label: 'At least one published product', fix: 'Google rejects empty apps.', href: '/admin/products' }
	};

	async function copy(text: string, key: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = key;
			setTimeout(() => copied === key && (copied = null), 1500);
		} catch {
			/* clipboard blocked — the value is still visible to select by hand */
		}
	}

	function submitting(key: string) {
		return () => {
			busy = key;
			return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
				await update({ reset: false });
				busy = null;
			};
		};
	}

	const steps: { id: AndroidStep; title: string; summary: string }[] = [
		{ id: 'account', title: 'Create a Google Play developer account', summary: 'One-time $25 fee, paid to Google' },
		{ id: 'package', title: 'Choose your app ID', summary: 'A unique name Android uses for your app' },
		{ id: 'build', title: 'Build your app with PWABuilder', summary: 'Free tool that turns your store into an Android app file' },
		{ id: 'fingerprint', title: 'Link your app to your store', summary: 'So the app opens full-screen, without a browser address bar' },
		{ id: 'listing', title: 'Create the app and its store listing', summary: 'Name, descriptions, icon and screenshots' },
		{ id: 'content', title: 'Answer Google’s app content questions', summary: 'Privacy policy, data safety, content rating' },
		{ id: 'testing', title: 'Upload your app and run a closed test', summary: 'New personal accounts: 12 testers for 14 days' },
		{ id: 'signing', title: 'Add Google’s signing fingerprint', summary: 'Keeps the app full-screen once Google signs it' },
		{ id: 'publish', title: 'Publish to production', summary: 'Apply for production, pass review, go live' }
	];
</script>

{#snippet copyField(label: string, value: string, key: string, multiline = false)}
	<div class="mb-3">
		<div class="flex items-center justify-between mb-1">
			<span class="text-xs font-medium text-[--color-text-muted]">{label}</span>
			<button type="button" class="text-xs text-[--color-accent] hover:underline" onclick={() => copy(value, key)}>
				{copied === key ? 'Copied ✓' : 'Copy'}
			</button>
		</div>
		{#if multiline}
			<pre class="text-xs whitespace-pre-wrap break-words bg-[--color-surface-2] border border-[--color-border] rounded-lg p-2 font-sans">{value}</pre>
		{:else}
			<code class="block text-xs break-all bg-[--color-surface-2] border border-[--color-border] rounded-lg px-2 py-1.5">{value}</code>
		{/if}
	</div>
{/snippet}

{#snippet message(action: string)}
	{#if form?.action === action && 'error' in form && form.error}
		<p class="text-sm text-red-600 mt-2">{form.error}</p>
	{:else if form?.action === action && 'success' in form && form.success}
		<p class="text-sm text-green-600 mt-2">Saved.</p>
	{/if}
{/snippet}

{#snippet fingerprintForm(id: string, hint: string)}
	<form method="POST" action="?/saveFingerprints" use:enhance={submitting('fp')} class="mt-3">
		<label for={id} class="block text-sm font-medium mb-1">SHA-256 fingerprints <span class="font-normal text-[--color-text-muted]">(one per line)</span></label>
		<textarea
			{id}
			name="fingerprints"
			rows="3"
			bind:value={fingerprints}
			class="w-full text-xs font-mono"
			placeholder="AB:CD:12:34:…"
		></textarea>
		<p class="text-xs text-[--color-text-muted] mt-1">{hint}</p>
		<div class="flex items-center gap-3 mt-2">
			<button type="submit" class="btn btn-primary btn-sm" disabled={busy === 'fp'}>{busy === 'fp' ? 'Saving…' : 'Save fingerprints'}</button>
		</div>
		{@render message('saveFingerprints')}
	</form>
{/snippet}

<div class="max-w-[760px]">
	<h1 class="text-2xl font-bold text-[--color-text] mb-1">Android App</h1>
	<p class="text-sm text-[--color-text-muted] mb-6">
		Optional — publish your store on Google Play as your own app. Your customers already get an installable web app
		from your store; this guide helps you list it on the Play Store too.
	</p>

	{#if !store.androidAppEnabled}
		<!-- ── Not started: explain what's involved ───────────────────────────── -->
		<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
			<h2 class="text-lg font-semibold mb-3">What you get</h2>
			<ul class="text-sm space-y-1.5 list-disc pl-5 mb-5">
				<li>Your own app on Google Play, under your store’s name and icon.</li>
				<li>It shows your live store, so products, prices and orders are always up to date — no app updates needed when you change your store.</li>
				<li>Customers can find you by searching on Google Play.</li>
			</ul>

			<h2 class="text-lg font-semibold mb-3">What it takes</h2>
			<ul class="text-sm space-y-1.5 list-disc pl-5 mb-5">
				<li><strong>$25 one-time fee</strong> paid to Google for a developer account, plus an ID check.</li>
				<li><strong>About 1–2 hours</strong> following the steps on this page. No coding.</li>
				<li>
					<strong>12 testers for 14 days</strong> — Google requires new personal developer accounts to test the app with at
					least 12 people (friends, family, staff with an Android phone) before it can go public. Organisation accounts skip this.
				</li>
				<li>Google’s review, which usually takes a few days.</li>
			</ul>
			<p class="text-xs text-[--color-text-muted]">
				The app is published from <strong>your own</strong> Google Play account, so you own the listing, the reviews and the
				customer relationship.
			</p>
		</section>

		<section class="border border-[--color-border] rounded-xl p-6 mb-6 bg-[--color-surface]">
			<h2 class="text-lg font-semibold mb-3">Is your store ready?</h2>
			<ul class="space-y-2">
				{#each Object.entries(data.checks) as [key, ok]}
					{@const c = checkLabels[key as keyof typeof checkLabels]}
					<li class="flex items-start gap-2 text-sm">
						<span class={ok ? 'text-green-600' : 'text-amber-600'}>{ok ? '✓' : '!'}</span>
						<span>
							{c.label}
							{#if !ok}
								<span class="block text-xs text-[--color-text-muted]">
									{c.fix}
									{#if c.href}<a href={c.href} class="underline">Fix this</a>{/if}
								</span>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
			<p class="text-xs text-[--color-text-muted] mt-3">You can start the guide now and fix these as you go.</p>
		</section>

		<form method="POST" action="?/enable" use:enhance={submitting('enable')} class="flex justify-end">
			<button type="submit" class="btn btn-primary" disabled={busy === 'enable'}>
				{busy === 'enable' ? 'Starting…' : 'Set up my Android app'}
			</button>
		</form>
	{:else}
		<!-- ── Guide ──────────────────────────────────────────────────────────── -->
		{#if !data.hasOwnOrigin}
			<div class="mb-5 rounded-lg px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-900">
				Your store is currently served from <strong>{data.storeUrl}</strong>. The app can only be linked to a live store
				at its own https address, so some steps below won’t work until it is.
			</div>
		{/if}

		<div class="mb-6">
			<div class="flex items-center justify-between text-sm mb-1.5">
				<span class="font-medium">{doneCount} of {ANDROID_STEPS.length} steps done</span>
				{#if store.androidPlayUrl}
					<a href={store.androidPlayUrl} target="_blank" rel="noopener" class="text-[--color-accent] hover:underline">View on Google Play ↗</a>
				{/if}
			</div>
			<div class="h-2 rounded-full bg-[--color-surface-2] overflow-hidden">
				<div class="h-full bg-green-500 transition-all" style="width: {(doneCount / ANDROID_STEPS.length) * 100}%"></div>
			</div>
		</div>

		<ol class="space-y-3">
			{#each steps as step, i (step.id)}
				{@const isDone = done.has(step.id)}
				<li>
					<details class="group border border-[--color-border] rounded-xl bg-[--color-surface]" open={step.id === current}>
						<summary class="flex items-center gap-3 px-5 py-4 cursor-pointer list-none">
							<span
								class="flex-none w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold
									{isDone ? 'bg-green-500 text-white' : 'bg-[--color-surface-2] text-[--color-text-muted]'}"
							>
								{isDone ? '✓' : i + 1}
							</span>
							<span class="flex-1 min-w-0">
								<span class="block font-medium {isDone ? 'text-[--color-text-muted]' : ''}">{step.title}</span>
								<span class="block text-xs text-[--color-text-muted]">{step.summary}</span>
							</span>
							<span class="text-[--color-text-muted] transition-transform group-open:rotate-90">›</span>
						</summary>

						<div class="px-5 pb-5 pt-1 text-sm leading-relaxed border-t border-[--color-border]">
							<div class="pt-4 space-y-3">
								{#if step.id === 'account'}
									<ol class="list-decimal pl-5 space-y-1.5">
										<li>Go to <a href="https://play.google.com/console/signup" target="_blank" rel="noopener" class="underline">play.google.com/console/signup</a> and sign in with the Google account you want to own the app.</li>
										<li>
											Choose the account type:
											<ul class="list-disc pl-5 mt-1 space-y-1">
												<li><strong>Personal</strong> — quickest. You’ll need a 14-day closed test with 12 testers before going public.</li>
												<li><strong>Organisation</strong> — for registered businesses. Needs a free D-U-N-S number, but skips the 12-tester rule.</li>
											</ul>
										</li>
										<li>Pay the one-time $25 fee and complete identity verification. This can take a few days.</li>
									</ol>
									<p class="text-xs text-[--color-text-muted]">Already have an account? Just mark this step done.</p>
								{:else if step.id === 'package'}
									<p>
										Every Android app has a unique ID. Customers never see it, but it <strong>can never be changed</strong> after you
										upload your app, so pick it now.
									</p>
									<form method="POST" action="?/savePackage" use:enhance={submitting('pkg')}>
										<label for="packageName" class="block text-sm font-medium mb-1">App ID (package name)</label>
										<div class="flex gap-2">
											<input id="packageName" name="packageName" type="text" maxlength="150" bind:value={packageName} class="flex-1 text-sm font-mono" />
											<button type="submit" class="btn btn-primary btn-sm" disabled={busy === 'pkg'}>{busy === 'pkg' ? 'Saving…' : 'Save'}</button>
										</div>
										<p class="text-xs text-[--color-text-muted] mt-1">Lowercase letters, numbers and dots, e.g. <code>com.mystore.app</code>.</p>
										{@render message('savePackage')}
									</form>
								{:else if step.id === 'build'}
									<ol class="list-decimal pl-5 space-y-1.5">
										<li>
											Open <a href={pwaBuilderUrl} target="_blank" rel="noopener" class="underline">PWABuilder with your store</a>
											and wait for it to finish checking your store.
										</li>
										<li>Click <strong>Package for stores</strong>, then <strong>Generate package</strong> under <strong>Android</strong>.</li>
										<li>Make sure <strong>Google Play</strong> is selected and fill in the options:</li>
									</ol>
									<div class="pl-5">
										{@render copyField('Package ID', pkg, 'pkg')}
										{@render copyField('App name', store.name, 'name')}
										{@render copyField('Launcher name (under the icon, short)', store.name.slice(0, 12), 'launcher')}
									</div>
									<ol class="list-decimal pl-5 space-y-1.5" start="4">
										<li>Leave the other options as they are. Under <strong>Signing key</strong> keep <strong>Create new</strong> and enter your name and business details.</li>
										<li>Click <strong>Download</strong>. You’ll get a ZIP file.</li>
									</ol>
									<div class="rounded-lg px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-900">
										<strong>Keep the ZIP safe and backed up.</strong> It contains <code>signing.keystore</code> and
										<code>signing-key-info.txt</code> (its passwords). You need them for every future update — if you lose
										them you’ll have to contact Google support to reset your upload key.
									</div>
									<p class="text-xs text-[--color-text-muted]">
										Inside the ZIP, <code>app-release-bundle.aab</code> is the file you upload to Google Play.
									</p>
								{:else if step.id === 'fingerprint'}
									<p>
										This proves the app belongs to your store. Without it the app shows a browser address bar at the top.
									</p>
									<ol class="list-decimal pl-5 space-y-1.5">
										<li>Open <code>assetlinks.json</code> (or <code>signing-key-info.txt</code>) from the PWABuilder ZIP.</li>
										<li>Copy the <strong>SHA-256</strong> fingerprint — it looks like <code class="break-all">AB:CD:12:…</code> (32 pairs).</li>
										<li>Paste it below and save. We publish it on your store automatically.</li>
									</ol>
									{@render fingerprintForm('fingerprints-own', 'You’ll add a second one from Google in step 8.')}
									<div class="mt-3 flex flex-wrap items-center gap-3">
										<form method="POST" action="?/verify" use:enhance={submitting('verify')}>
											<button type="submit" class="btn btn-secondary btn-sm" disabled={busy === 'verify'}>{busy === 'verify' ? 'Checking…' : 'Check link'}</button>
										</form>
										<a href={assetLinksUrl} target="_blank" rel="noopener" class="text-xs underline text-[--color-text-muted]">View published file</a>
									</div>
									{#if form?.action === 'verify' && 'message' in form}
										<p class="text-sm {form.verified ? 'text-green-600' : 'text-amber-700'}">{form.message}</p>
									{/if}
								{:else if step.id === 'listing'}
									<ol class="list-decimal pl-5 space-y-1.5">
										<li>In <a href="https://play.google.com/console" target="_blank" rel="noopener" class="underline">Play Console</a>, click <strong>Create app</strong>. Enter the app name, choose <strong>App</strong> and <strong>Free</strong>, accept the declarations.</li>
										<li>Go to <strong>Grow users → Store presence → Main store listing</strong> and fill it in. You can use or edit these:</li>
									</ol>
									<div class="pl-5">
										{@render copyField('App name (max 30 characters)', store.name.slice(0, 30), 'lname')}
										{@render copyField('Short description (max 80 characters)', shortDescription, 'short')}
										{@render copyField('Full description', fullDescription, 'full', true)}
									</div>
									<ol class="list-decimal pl-5 space-y-1.5" start="3">
										<li>
											Graphics — download and upload these:
											<ul class="list-disc pl-5 mt-1 space-y-1">
												<li><a href="/manifest-icon/512?{imgQuery}" download="app-icon-512.png" class="underline">App icon</a> (512 × 512)</li>
												<li><a href="/manifest-icon/feature?{imgQuery}" download="feature-graphic.png" class="underline">Feature graphic</a> (1024 × 500)</li>
											</ul>
										</li>
										<li>
											<strong>Phone screenshots</strong> (at least 2): open your store on your phone and take screenshots of the home page,
											a product and the cart. Real screenshots look best and help approval.
										</li>
										<li>Under <strong>Store settings</strong>, set the category to <strong>Shopping</strong> and add your contact details:</li>
									</ol>
									<div class="pl-5">
										{#if store.contactEmail}{@render copyField('Email', store.contactEmail, 'email')}{/if}
										{@render copyField('Website', data.storeUrl, 'web')}
									</div>
								{:else if step.id === 'content'}
									<p>In Play Console go to <strong>Policy and programs → App content</strong> and complete each section:</p>
									<div class="pl-0">
										{@render copyField('Privacy policy URL', `${data.storeUrl}/policies/privacy`, 'privacy')}
									</div>
									<p class="text-xs text-[--color-text-muted] -mt-1">
										Your store has a standard privacy policy already. You can edit it in
										<a href="/admin/settings/policies" class="underline">Settings → Policies</a>.
									</p>
									<ul class="list-disc pl-5 space-y-1.5">
										<li><strong>Ads:</strong> No, my app does not contain ads.</li>
										<li><strong>App access:</strong> All functionality is available without special access.</li>
										<li><strong>Content rating:</strong> category <em>All other app types</em>. Answer No to violence, sexual content, gambling etc. If your store shows customer reviews, say users can share content.</li>
										<li><strong>Target audience:</strong> 18 and over.</li>
										<li><strong>News app / Government app / Financial features / Health:</strong> No / None.</li>
										<li>
											<strong>Data safety:</strong>
											<ul class="list-disc pl-5 mt-1 space-y-1">
												<li>Does your app collect or share user data? <strong>Yes</strong>. Encrypted in transit? <strong>Yes</strong>.</li>
												<li>Account creation: <strong>My app does not allow users to create an account</strong>.</li>
												<li>
													Data collected (not shared), purpose <em>App functionality</em>:
													<strong>Personal info</strong> → Name, Email address, Phone number, Address;
													<strong>Financial info</strong> → Purchase history.
												</li>
												<li>Users can ask for their data to be deleted: <strong>Yes</strong> (via your contact details).</li>
											</ul>
										</li>
									</ul>
								{:else if step.id === 'testing'}
									<ol class="list-decimal pl-5 space-y-1.5">
										<li>Go to <strong>Test and release → Testing → Closed testing</strong> and create a track.</li>
										<li>Under <strong>Testers</strong>, create an email list with the Gmail addresses of at least 12 people with Android phones.</li>
										<li>Create a release and upload <code>app-release-bundle.aab</code> from the ZIP. When asked, let Google manage your app signing key (Play App Signing).</li>
										<li>Add a short release note (e.g. “First release”), then <strong>Review release → Start rollout</strong>.</li>
										<li>Share the <strong>opt-in link</strong> with your testers. They must join, install the app and stay opted in for <strong>14 days</strong>.</li>
									</ol>
									<p class="text-xs text-[--color-text-muted]">
										Organisation accounts can go straight to production, but a short internal test is still a good idea.
									</p>
								{:else if step.id === 'signing'}
									<p>
										Google re-signs your app with its own key, so the fingerprint from step 4 isn’t enough on its own. If you open the
										test app and see an address bar at the top, this step is missing.
									</p>
									<ol class="list-decimal pl-5 space-y-1.5">
										<li>In Play Console go to <strong>Test and release → Setup → App signing</strong>.</li>
										<li>Under <strong>App signing key certificate</strong>, copy the <strong>SHA-256 certificate fingerprint</strong>.</li>
										<li>Add it on a new line below (keep the first one) and save.</li>
									</ol>
									{@render fingerprintForm('fingerprints-google', 'Keep both: yours (step 4) and Google’s.')}
									<p class="text-xs text-[--color-text-muted]">Close and reopen the app after a few minutes — the address bar should be gone.</p>
								{:else if step.id === 'publish'}
									<ol class="list-decimal pl-5 space-y-1.5">
										<li>After the 14-day test, open the Play Console <strong>Dashboard</strong> and click <strong>Apply for production</strong>. Answer the short questions about your test.</li>
										<li>Once approved, create a <strong>Production</strong> release with the same <code>.aab</code> and roll it out.</li>
										<li>Google reviews it — usually a few days. You’ll get an email when it’s live.</li>
										<li>Paste your Play Store link below and we’ll add a “Get our Android app” link to your store’s footer.</li>
									</ol>
									<form method="POST" action="?/savePlayUrl" use:enhance={submitting('play')}>
										<label for="playUrl" class="block text-sm font-medium mb-1">Google Play link</label>
										<div class="flex gap-2">
											<input
												id="playUrl"
												name="playUrl"
												type="url"
												bind:value={playUrl}
												class="flex-1 text-sm"
												placeholder="https://play.google.com/store/apps/details?id={pkg}"
											/>
											<button type="submit" class="btn btn-primary btn-sm" disabled={busy === 'play'}>{busy === 'play' ? 'Saving…' : 'Save'}</button>
										</div>
										{@render message('savePlayUrl')}
									</form>
								{/if}

								<form method="POST" action="?/toggleStep" use:enhance={submitting(`step-${step.id}`)} class="pt-2 flex justify-end">
									<input type="hidden" name="step" value={step.id} />
									<input type="hidden" name="done" value={isDone ? 'false' : 'true'} />
									<button type="submit" class="btn btn-sm {isDone ? 'btn-secondary' : 'btn-success'}" disabled={busy === `step-${step.id}`}>
										{isDone ? 'Mark as not done' : 'Mark step as done'}
									</button>
								</form>
							</div>
						</div>
					</details>
				</li>
			{/each}
		</ol>

		<section class="border border-[--color-border] rounded-xl p-5 mt-6 bg-[--color-surface] text-sm">
			<h2 class="font-semibold mb-2">After you’re live</h2>
			<ul class="list-disc pl-5 space-y-1.5">
				<li>Changes to your products, prices, design and pages show up in the app straight away — no app update needed.</li>
				<li>
					You only need to build a new version if you change the app’s name or icon. Use PWABuilder again with the
					<strong>same package ID</strong>, choose to use your existing signing key (your saved
					<code>signing.keystore</code> and its passwords), and increase the version number.
				</li>
			</ul>
		</section>

		<div class="mt-6 flex justify-end">
			<button type="button" class="text-sm text-red-600 hover:underline" onclick={() => (confirmDisable = true)}>
				Turn off Android app
			</button>
		</div>

		<form id="disable-android" method="POST" action="?/disable" use:enhance={submitting('disable')} class="hidden"></form>
	{/if}
</div>

<ConfirmDialog
	open={confirmDisable}
	title="Turn off the Android app?"
	message="Your store will stop publishing the app link. If your app is already on Google Play it will keep working, but show a browser address bar. Your saved details are kept, so you can turn it back on later."
	confirmLabel="Turn off"
	cancelLabel="Cancel"
	variant="danger"
	onconfirm={() => {
		confirmDisable = false;
		(document.getElementById('disable-android') as HTMLFormElement | null)?.requestSubmit();
	}}
	oncancel={() => (confirmDisable = false)}
/>
