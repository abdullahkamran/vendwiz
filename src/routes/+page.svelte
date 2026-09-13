<script lang="ts">
	// Landing page — redirects to /login if no store, or /admin if authenticated
</script>

<main class="landing">
	<div class="hero">
		<h1>🛍️ VendWiz</h1>
		<p>Instant no-payment e-commerce stores. Claim your subdomain and start selling in minutes.</p>
		<div class="cta-buttons">
			<a href="/register" class="btn-primary">Get Started Free</a>
			<a href="/login" class="btn-secondary">Sign In</a>
		</div>
	</div>
</main>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
		color: white;
	}
	.hero {
		text-align: center;
		padding: 2rem;
		max-width: 600px;
	}
	h1 {
		font-size: 3rem;
		font-weight: 800;
		margin: 0 0 1rem;
	}
	p {
		font-size: 1.2rem;
		opacity: 0.85;
		margin: 0 0 2rem;
		line-height: 1.6;
	}
	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}
	.btn-primary {
		background: #e94560;
		color: white;
		padding: 0.875rem 2rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1rem;
		transition: opacity 0.2s;
	}
	.btn-primary:hover { opacity: 0.9; }
	.btn-secondary {
		background: rgba(255,255,255,0.15);
		color: white;
		padding: 0.875rem 2rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1rem;
		border: 1px solid rgba(255,255,255,0.3);
		transition: background 0.2s;
	}
	.btn-secondary:hover { background: rgba(255,255,255,0.25); }
</style>
