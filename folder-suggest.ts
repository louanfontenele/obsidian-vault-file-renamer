import { App, AbstractInputSuggest } from "obsidian";

/**
 * Folder suggestions for settings inputs.
 * Uses the native AbstractInputSuggest (Obsidian ≥ 1.4.10).
 * Shows "/" (root) and all folders in the vault.
 * Optionally accepts an onSelect callback to handle immediate actions on pick.
 */
export class FolderSuggest extends AbstractInputSuggest<string> {
	private folders: string[];
	private onSelectCb?: (value: string) => void;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		onSelect?: (value: string) => void
	) {
		super(app, inputEl);
		// Include root and all loaded folders.
		// getAllFolders(includeRoot?: boolean) is available in recent API builds.
		const vaultFolders = app.vault.getAllFolders(true).map((f) => f.path);
		this.folders = Array.from(new Set<string>(["/"].concat(vaultFolders)));
		this.onSelectCb = onSelect;
	}

	getSuggestions(inputStr: string): string[] {
		const q = (inputStr || "").toLowerCase();
		return this.folders.filter((f) => f.toLowerCase().includes(q));
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.createEl("div", { text: value });
	}

	selectSuggestion(value: string): void {
		if (this.onSelectCb) {
			this.onSelectCb(value);
			this.close();
			return;
		}
		// Default behavior: set the input value.
		this.inputEl.value = value;
		const ev = new Event("input");
		this.inputEl.dispatchEvent(ev);
		this.close();
	}
}
