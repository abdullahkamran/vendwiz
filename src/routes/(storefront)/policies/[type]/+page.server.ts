import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { storePolicies } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/server/markdown';

const VALID_TYPES = ['return', 'shipping', 'terms', 'faq'] as const;
type PolicyType = (typeof VALID_TYPES)[number];

export const load: PageServerLoad = async ({ locals, params }) => {
  const type = params.type as PolicyType;

  if (!VALID_TYPES.includes(type)) {
    throw error(404, 'Policy not found');
  }

  const [policy] = await db
    .select()
    .from(storePolicies)
    .where(and(eq(storePolicies.storeId, locals.store!.id), eq(storePolicies.type, type)))
    .limit(1);

  if (!policy || !policy.content) {
    throw error(404, 'Policy not found');
  }

  const titles: Record<PolicyType, string> = {
    return: 'Return Policy',
    shipping: 'Shipping Info',
    terms: 'Terms & Conditions',
    faq: 'FAQ'
  };

  // Render markdown to HTML so **bold** → <strong> and pipe tables → <table>
  const html = renderMarkdown(policy.content);

  if (type === 'faq') {
    const faqItems: { question: string; answer: string }[] = [];
    const lines = policy.content.split('\n');
    let currentQuestion: string | null = null;
    const answerLines: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^##\s+(.+)/);
      if (headingMatch) {
        if (currentQuestion !== null) {
          faqItems.push({ question: currentQuestion, answer: answerLines.join('\n').trim() });
          answerLines.length = 0;
        }
        currentQuestion = headingMatch[1].trim();
      } else if (currentQuestion !== null) {
        answerLines.push(line);
      }
    }
    if (currentQuestion !== null) {
      faqItems.push({ question: currentQuestion, answer: answerLines.join('\n').trim() });
    }

    return { policy, html, title: titles[type], faqItems };
  }

  return { policy, html, title: titles[type] };
};
