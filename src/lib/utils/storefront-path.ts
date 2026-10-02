/** Returns "/store/<slug>" when pathname starts with that prefix (path-based
 *  LAN access), or "" for normal subdomain access.
 */
export function deriveBasePath(pathname: string): string {
	const m = pathname.match(/^(\/store\/[^/]+)/);
	return m ? m[1] : '';
}
