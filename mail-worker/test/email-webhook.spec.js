import { describe, expect, it } from 'vitest';
import { matchesLike } from '../src/service/email-webhook-service';

describe('email webhook matching', () => {
	it('matches SQL-like recipient and sender patterns', () => {
		expect(matchesLike('123456789a@example.com', '%@example.com')).toBe(true);
		expect(matchesLike('notification@service.bank.example.org', '%@%.%.example.org')).toBe(true);
		expect(matchesLike('notification@service.example.org', '%@%.%.example.org')).toBe(false);
	});

	it('supports comma-separated patterns and case-insensitive matching', () => {
		expect(matchesLike('A@example.com', 'x@example.com, %@EXAMPLE.COM')).toBe(true);
		expect(matchesLike('a@example.net', 'x@example.com, %@example.org')).toBe(false);
	});
});
