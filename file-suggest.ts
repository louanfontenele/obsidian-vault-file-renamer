import { App, AbstractInputSuggest } from "obsidian";

/**
 * File suggestions for settings inputs.
 * Lists all files in the vault (including extensionless files).
 * Accepts an optional onSelect callback to handle immediate actions on pick.
 */
export class FileSuggest extends AbstractInputSuggest<string> {
	private files: string[];
	private onSelectCb?: (value: string) => void;
	protected inputEl: HTMLInputElement;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		onSelect?: (value: string) => void
	) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.files = app.vault.getFiles().map((f) => f.path);
		this.onSelectCb = onSelect;
	}

	getSuggestions(inputStr: string): string[] {
		const q = (inputStr || "").toLowerCase();
		return this.files.filter((f) => f.toLowerCase().includes(q));
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
