import { App, AbstractInputSuggest, TFolder } from "obsidian";

/**
 * Folder suggestions for settings inputs.
 * Shows "/" (root) and all folders in the vault.
 * Optionally accepts an onSelect callback to handle immediate actions on pick.
 */
export class FolderSuggest extends AbstractInputSuggest<string> {
	private folders: string[];
	private onSelectCb?: (value: string) => void;
	protected inputEl: HTMLInputElement;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		onSelect?: (value: string) => void
	) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.folders = this.collectFolderPaths(app.vault.getRoot());
		this.onSelectCb = onSelect;
	}

	private collectFolderPaths(root: TFolder): string[] {
		const paths = new Set<string>(["/"]);
		const visit = (folder: TFolder) => {
			if (folder.path) {
				paths.add(folder.path);
			}

			for (const child of folder.children) {
				if (child instanceof TFolder) {
					visit(child);
				}
			}
		};

		visit(root);
		return Array.from(paths);
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
