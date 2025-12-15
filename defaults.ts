import { VaultFileRenamerSettings } from "./types";

export const DEFAULT_SETTINGS: VaultFileRenamerSettings = {
	enabled: false,
	// Safer default: only .md. Users can expand this list.
	targetExtensions: ["md"],
	// When targetExtensions is empty (i.e., all), exclude none by default.
	excludedExtensions: [],
	// Avoid touching Obsidian internals by default.
	blacklistedFolders: [".obsidian"],
	// No file-level blacklist by default.
	blacklistedFiles: [],
	// Default rules matching the original behavior:
	// 1. Normalize NFD (accents) -> Handled in code, or we can make it a rule?
	// For now, we will treat the original normalization as a "Built-in Standardizer"
	// but we'll add the custom rules array for users to override/append.
	rules: [
		{
			name: "Spaces to Dashes",
			pattern: "\\s+",
			replace: "-",
			active: true,
			description: "Replaces all spaces with dashes.",
		},
		{
			name: "Remove Special Chars",
			pattern: "[^a-z0-9\\-_.]",
			replace: "",
			active: true,
			description:
				"Removes anything that isn't a letter, number, dash, underscore, or dot.",
		},
	],
	useCreationDate: false,
	dateFormat: "YYYY-MM-DD",
};
