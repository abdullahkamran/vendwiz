import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// About Us is edited on the Policies page now
export const load: PageServerLoad = () => {
	throw redirect(307, '/admin/settings/policies');
};
