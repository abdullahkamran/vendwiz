import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Already authenticated → go straight to admin
	if (locals.user) {
		redirect(302, '/admin');
	}
	return {};
};
