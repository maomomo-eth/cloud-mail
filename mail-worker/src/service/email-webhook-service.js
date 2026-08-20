const emailWebhookService = {

	config(setting) {
		if (!setting || Number(setting.emailWebhookStatus) !== 0) {
			return null;
		}

		const url = String(setting.emailWebhookUrl || '').trim();
		const secret = String(setting.emailWebhookSecret || '').trim();
		const toLike = String(setting.emailWebhookToLike || '').trim();
		const sendLike = String(setting.emailWebhookSendLike || '').trim();

		if (!url || !secret || !toLike || !sendLike) {
			console.error('邮件 Webhook 配置不完整，需要同时配置地址、密钥、收件人规则和发件人规则');
			return null;
		}

		return { url, secret, toLike, sendLike };
	},

	matches(config, emailRow) {
		return matchesLike(emailRow.toEmail, config.toLike) && matchesLike(emailRow.sendEmail, config.sendLike);
	},

	async notify(config, emailRow) {
		const payload = {
			event: 'email.received',
			emailId: emailRow.emailId,
			sendEmail: emailRow.sendEmail || '',
			sendName: emailRow.name || '',
			subject: emailRow.subject || '',
			toEmail: emailRow.toEmail || '',
			toName: emailRow.toName || '',
			createTime: emailRow.createTime || '',
			content: emailRow.content || '',
			text: emailRow.text || '',
			messageId: emailRow.messageId || '',
			type: emailRow.type ?? 0,
			isDel: emailRow.isDel ?? 0
		};

		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				const response = await fetch(config.url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Cloud-Mail-Webhook-Secret': config.secret,
						'X-Cloud-Mail-Event-ID': String(emailRow.emailId)
					},
					body: JSON.stringify(payload)
				});

				if (response.ok) {
					return true;
				}

				const detail = (await response.text()).slice(0, 500);
				if (response.status < 500 && response.status !== 429) {
					console.error(`邮件 webhook 返回 HTTP ${response.status}: ${detail}`);
					return false;
				}
				throw new Error(`HTTP ${response.status}: ${detail}`);
			} catch (error) {
				if (attempt === 3) {
					console.error(`邮件 webhook 投递失败 email_id=${emailRow.emailId}: ${error.message}`);
					return false;
				}
				await delay(attempt * 250);
			}
		}

		return false;
	}
};

export function matchesLike(value, pattern) {
	const normalizedValue = String(value || '').trim();
	const patterns = String(pattern || '')
		.split(',')
		.map(item => item.trim())
		.filter(Boolean);

	return patterns.some(item => {
		let source = '^';
		for (const character of item) {
			if (character === '%' || character === '*') {
				source += '.*';
			} else if (character === '_') {
				source += '.';
			} else {
				source += escapeRegExpCharacter(character);
			}
		}
		source += '$';
		return new RegExp(source, 'i').test(normalizedValue);
	});
}

function escapeRegExpCharacter(character) {
	return '\\^$+?.()|{}[]'.includes(character) ? `\\${character}` : character;
}

function delay(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export default emailWebhookService;
