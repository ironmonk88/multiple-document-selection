import { i18n } from "./multiple-directory-selection.js";

export const registerSettings = function () {
    // Register any custom module settings here
	let modulename = "multiple-directory-selection";

	const debouncedReload = foundry.utils.debounce(function () { window.location.reload(); }, 100);

	game.settings.register(modulename, "long-press", {
		name: i18n("MultipleDirectorySelection.long-press.name"),
		hint: i18n("MultipleDirectorySelection.long-press.hint"),
		scope: "world",
		config: true,
		default: 1.5,
		type: Number,
	});
}