// Promise wrapper for chrome.runtime.sendMessage to avoid
// 'Receiving end does not exist' unhandled promise rejections
export function sendRuntimeMessage(message) {
	return new Promise((resolve) => {
		try {
			chrome.runtime.sendMessage(message, (response) => {
				// Swallow lastError and resolve undefined so callers can handle gracefully
				// eslint-disable-next-line no-unused-expressions
				void chrome.runtime.lastError;
				resolve(response);
			});
		} catch (e) {
			resolve(undefined);
		}
	});
}


