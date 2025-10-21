/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
let coepCredentialless = false;
if (typeof window === "undefined") {
	self.addEventListener("install", () => self.skipWaiting());
	self.addEventListener("activate", (event) =>
		event.waitUntil(self.clients.claim()),
	);

	self.addEventListener("fetch", function (event) {
		const request = event.request;
		if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
			return;
		}

		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.status === 0) {
						return response;
					}

					const newHeaders = new Headers(response.headers);
					newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
					newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

					return new Response(response.body, {
						status: response.status,
						statusText: response.statusText,
						headers: newHeaders,
					});
				})
				.catch((e) => console.error(e)),
		);
	});
} else {
	(() => {
		const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
		window.sessionStorage.removeItem("coiReloadedBySelf");
		const coepDegrading =
			(reloadedBySelf == "coep:require-corp") &&
			!window.crossOriginIsolated;
		const coepCredentiallessNotSupported =
			(reloadedBySelf == "coep:credentialless") &&
			!window.crossOriginIsolated;

		if (!coepDegrading && !coepCredentiallessNotSupported) {
			coepCredentialless = !coepDegrading;
			window.sessionStorage.setItem(
				"coiReloadedBySelf",
				`coep:${coepCredentialless ? "credentialless" : "require-corp"}`,
			);

			navigator.serviceWorker
				.register(window.document.currentScript.src)
				.then(
					(registration) => {
						registration.addEventListener("updatefound", () => {
							registration.installing.addEventListener("statechange", () => {
								if (registration.waiting) {
									registration.waiting.addEventListener("statechange", () => {
										if (registration.active) {
											window.location.reload();
										}
									});

									registration.waiting.postMessage({ type: "SKIP_WAITING" });
								}
							});
						});

						if (!window.crossOriginIsolated) {
							if (registration.active && !registration.waiting) {
								window.location.reload();
							}
						}
					},
					(err) => {
						console.error("COOP/COEP Service Worker failed to register:", err);
					},
				);
		}
	})();
}
