<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type OrderStatus = 'pending' | 'processing' | 'dispatched' | 'completed' | 'cancelled';

	// Capture initial prop values in plain variables before passing to $state
	// to avoid the "captures initial value of data" warning.
	const _initStatus = data.order.status as OrderStatus;
	const _initNotes = data.order.notes ?? '';

	let selectedStatus = $state<OrderStatus>(_initStatus);
	let notes = $state(_initNotes);
	let showCancelConfirm = $state(false);

	const STATUS_COLORS: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-800',
		processing: 'bg-blue-100 text-blue-800',
		dispatched: 'bg-indigo-100 text-indigo-800',
		completed: 'bg-green-100 text-green-800',
		cancelled: 'bg-red-100 text-red-800'
	};

	function statusColor(status: string) {
		return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
	}

	type OrderItemRow = typeof data.items[number];
	const items: OrderItemRow[] = data.items;

	function handleStatusChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value as OrderStatus;
		selectedStatus = val;
		showCancelConfirm = val === 'cancelled';
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<div class="mb-6 flex items-center gap-4">
		<a href="/admin/orders" class="text-indigo-600 hover:text-indigo-900 text-sm">← Back to Orders</a>
		<h1 class="text-2xl font-bold text-gray-900">Order #{data.order.orderNumber}</h1>
		<span class="px-3 py-1 rounded-full text-sm font-medium {statusColor(data.order.status)}">
			{data.order.status}
		</span>
	</div>

	{#if form?.error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
			Updated successfully.
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left column -->
		<div class="lg:col-span-2 space-y-6">

			<!-- Customer Info -->
			<div class="bg-white shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Customer</h2>
				<dl class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<dt class="text-gray-500">Name</dt>
						<dd class="font-medium">{data.order.customerName}</dd>
					</div>
					<div>
						<dt class="text-gray-500">Phone</dt>
						<dd>
							<a href="tel:{data.order.customerPhone}" class="text-indigo-600 hover:underline font-medium">
								{data.order.customerPhone}
							</a>
						</dd>
					</div>
					<div>
						<dt class="text-gray-500">Email</dt>
						<dd class="font-medium">{data.order.customerEmail}</dd>
					</div>
					<div class="col-span-2">
						<dt class="text-gray-500">Shipping Address</dt>
						<dd class="font-medium">{data.order.shippingAddress}</dd>
					</div>
				</dl>
			</div>

			<!-- Order Items -->
			<div class="bg-white shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Items</h2>
				<div class="divide-y divide-gray-200">
					{#each items as item}
						<div class="py-3 flex items-start gap-4">
							<div class="w-14 h-14 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
								No img
							</div>
							<div class="flex-1">
								<div class="font-medium text-gray-900">{item.productTitle}</div>
								{#if item.variantLabel}
									<div class="text-xs text-gray-500">{item.variantLabel}</div>
								{/if}
								<div class="text-sm text-gray-600 mt-1">
									Qty: {item.quantity} × PKR {item.unitPrice}
								</div>
							</div>
							<div class="font-medium text-gray-900">
								PKR {item.subtotal}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Pricing -->
			<div class="bg-white shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
				<dl class="space-y-2 text-sm">
					<div class="flex justify-between">
						<dt class="text-gray-500">Subtotal</dt>
						<dd>PKR {data.order.subtotal}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Shipping</dt>
						<dd>PKR {data.order.shippingFee}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-gray-500">Tax</dt>
						<dd>PKR {data.order.taxAmount}</dd>
					</div>
					{#if parseFloat(data.order.discountAmount) > 0}
						<div class="flex justify-between text-green-600">
							<dt>Discount {data.order.discountCodeId ? `(${data.order.discountCodeId})` : ''}</dt>
							<dd>-PKR {data.order.discountAmount}</dd>
						</div>
					{/if}
					<div class="flex justify-between font-bold text-base border-t pt-2 mt-2">
						<dt>Total</dt>
						<dd>PKR {data.order.total}</dd>
					</div>
				</dl>
			</div>

		</div>

		<!-- Right column -->
		<div class="space-y-6">

			<!-- Status Management -->
			<div class="bg-white shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
				{#if data.allowedNext.length > 0}
					<form method="POST" action="?/updateStatus">
						<input type="hidden" name="status" value={selectedStatus} />
						<select
							class="w-full rounded-md border-gray-300 shadow-sm text-sm mb-3 focus:ring-indigo-500 focus:border-indigo-500"
							value={selectedStatus}
							onchange={handleStatusChange}
						>
							{#each data.allowedNext as s}
								<option value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
							{/each}
						</select>

						{#if showCancelConfirm}
							<div class="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
								⚠️ Cancellation is irreversible. Confirm below.
							</div>
						{/if}

						<button
							type="submit"
							class="w-full px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
						>
							Update Status
						</button>
					</form>
				{:else}
					<p class="text-sm text-gray-500">No further transitions available.</p>
				{/if}
			</div>

			<!-- WhatsApp -->
			{#if data.waUrl}
				<div class="bg-white shadow rounded-lg p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">WhatsApp</h2>
					<a
						href={data.waUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="block w-full text-center px-4 py-2 bg-green-500 text-white text-sm rounded-md hover:bg-green-600"
					>
						📱 Open WhatsApp Notification
					</a>
				</div>
			{/if}

			<!-- Notes -->
			<div class="bg-white shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h2>
				<form method="POST" action="?/saveNotes">
					<textarea
						name="notes"
						rows="4"
						value={notes}
						oninput={(e) => (notes = (e.target as HTMLTextAreaElement).value)}
						class="w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 mb-3"
						placeholder="Add internal notes..."
					></textarea>
					<button
						type="submit"
						class="w-full px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-900"
					>
						Save Notes
					</button>
				</form>
			</div>

			<!-- Order Metadata -->
			<div class="bg-white shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Order Info</h2>
				<dl class="space-y-2 text-sm">
					<div>
						<dt class="text-gray-500">Placed</dt>
						<dd>{new Date(data.order.createdAt).toLocaleString()}</dd>
					</div>
					<div>
						<dt class="text-gray-500">Updated</dt>
						<dd>{new Date(data.order.updatedAt).toLocaleString()}</dd>
					</div>
					<div>
						<dt class="text-gray-500">WA Sent</dt>
						<dd>{data.order.whatsappSent ? 'Yes' : 'No'}</dd>
					</div>
				</dl>
			</div>

		</div>
	</div>
</div>
