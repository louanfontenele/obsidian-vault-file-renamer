import {
	App,
	PluginSettingTab,
	Setting,
	Notice,
	normalizePath,
} from "obsidian";
import VaultFileRenamerPlugin from "./main";
import { FolderSuggest } from "./folder-suggest";
import { FileSuggest } from "./file-suggest";
import { RenamingRule } from "./types";

export class VaultFileRenamerSettingTab extends PluginSettingTab {
	plugin: VaultFileRenamerPlugin;

	constructor(app: App, plugin: VaultFileRenamerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("vfr-settings-container");

		containerEl.createEl("h2", { text: "Vault File Renamer – Settings" });

		// -- Main Controls --
		new Setting(containerEl)
			.setName("Automatically rename")
			.setDesc(
				"When enabled, files and folders will be standardized on create/rename."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
						new Notice(
							value
								? "Auto-rename enabled."
								: "Auto-rename disabled."
						);
					})
			);

		new Setting(containerEl)
			.setName("Standardize everything now")
			.setDesc("Run an immediate sweep across the whole vault.")
			.addButton((btn) =>
				btn.setButtonText("Run").onClick(async () => {
					await this.plugin.renamingService.standardizeAll();
					new Notice("Sweep completed.");
				})
			);

		// -- Extensions --
		containerEl.createEl("h3", { text: "Extensions" });
		new Setting(containerEl)
			.setName("Target extensions (allow-list)")
			.setDesc("Extensions to rename. Empty = all.")
			.addText((text) => {
				text.setPlaceholder("md, canvas, png")
					.setValue(this.plugin.settings.targetExtensions.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.targetExtensions = value
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Excluded extensions")
			.setDesc("Extensions to NEVER rename.")
			.addText((text) => {
				text.setPlaceholder("tmp, xml")
					.setValue(
						this.plugin.settings.excludedExtensions.join(", ")
					)
					.onChange(async (value) => {
						this.plugin.settings.excludedExtensions = value
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean);
						await this.plugin.saveSettings();
					});
			});

		// -- Renaming Rules --
		containerEl.createEl("h3", { text: "Renaming Rules" });
		containerEl.createEl("p", {
			text: "Rules are applied in order. You can use valid JavaScript Regex. Default is: lowercase -> NFD normalization -> My Rules.",
		});

		const rulesContainer = containerEl.createDiv({ cls: "vfr-rules-list" });
		this.renderRulesList(rulesContainer);

		new Setting(containerEl).setName("Add new rule").addButton((btn) =>
			btn.setButtonText("Add Rule").onClick(async () => {
				this.plugin.settings.rules.push({
					name: "New Rule",
					pattern: "",
					replace: "",
					active: true,
				});
				await this.plugin.saveSettings();
				this.renderRulesList(rulesContainer);
			})
		);

		// -- Variables --
		containerEl.createEl("h3", { text: "Variables" });
		new Setting(containerEl)
			.setName("Enable {{DATE}} variable")
			.setDesc(
				"If enabled, you can use {{DATE}} in your rule replacements to insert the file creation date."
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.useCreationDate)
					.onChange(async (v) => {
						this.plugin.settings.useCreationDate = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Date format")
			.setDesc("Moment.js format (e.g. YYYY-MM-DD).")
			.addText((t) =>
				t
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (v) => {
						this.plugin.settings.dateFormat = v;
						await this.plugin.saveSettings();
					})
			);

		// -- Blacklists --
		containerEl.createEl("h3", { text: "Blacklists" });

		// Folder
		const folderBlock = containerEl.createDiv();
		let folderSearchInput: any = null; // Store reference to access value

		new Setting(folderBlock)
			.setName("Add folder to blacklist")
			.setDesc(
				"Search to add existing folders, or type a name and click 'Add' manually."
			)
			.addSearch((search) => {
				folderSearchInput = search;
				new FolderSuggest(this.app, search.inputEl, async (picked) => {
					this.addBlacklistFolder(picked, folderBlock);
					search.setValue("");
				});
			})
			.addButton((btn) => {
				btn.setButtonText("Add")
					.setTooltip("Add manually")
					.onClick(async () => {
						if (folderSearchInput) {
							this.addBlacklistFolder(
								folderSearchInput.getValue(),
								folderBlock
							);
							folderSearchInput.setValue("");
						}
					});
			});
		this.renderFolderBlacklistList(folderBlock);

		// File
		const fileBlock = containerEl.createDiv();
		let fileSearchInput: any = null;

		new Setting(fileBlock)
			.setName("Add file to blacklist")
			.setDesc(
				"Search to add existing files, or type a name and click 'Add' manually."
			)
			.addSearch((search) => {
				fileSearchInput = search;
				new FileSuggest(this.app, search.inputEl, async (picked) => {
					this.addBlacklistFile(picked, fileBlock);
					search.setValue("");
				});
			})
			.addButton((btn) => {
				btn.setButtonText("Add")
					.setTooltip("Add manually")
					.onClick(async () => {
						if (fileSearchInput) {
							this.addBlacklistFile(
								fileSearchInput.getValue(),
								fileBlock
							);
							fileSearchInput.setValue("");
						}
					});
			});
		this.renderFileBlacklistList(fileBlock);
	}

	private renderRulesList(container: HTMLElement) {
		container.empty();

		this.plugin.settings.rules.forEach((rule, index) => {
			const row = container.createDiv({ cls: "vfr-rule-row" });
			row.style.display = "flex";
			row.style.alignItems = "center";
			row.style.gap = "10px";
			row.style.marginBottom = "10px";
			row.style.padding = "10px";
			row.style.border = "1px solid var(--background-modifier-border)";
			row.style.borderRadius = "5px";

			// Active Toggle
			const toggleDiv = row.createDiv();
			const toggle = new Setting(toggleDiv).addToggle((t) =>
				t.setValue(rule.active).onChange(async (v) => {
					rule.active = v;
					await this.plugin.saveSettings();
				})
			);
			// Remove the empty setting info/name to make it compact
			toggle.settingEl.style.border = "none";
			toggle.settingEl.style.padding = "0";

			// Name
			const nameInput = row.createEl("input", {
				type: "text",
				value: rule.name,
			});
			nameInput.placeholder = "Rule Name";
			nameInput.style.width = "120px";
			nameInput.onchange = async () => {
				rule.name = nameInput.value;
				await this.plugin.saveSettings();
			};

			// Pattern
			const patternInput = row.createEl("input", {
				type: "text",
				value: rule.pattern,
			});
			patternInput.placeholder = "Regex Pattern";
			patternInput.style.flex = "1";
			patternInput.onchange = async () => {
				rule.pattern = patternInput.value;
				await this.plugin.saveSettings();
			};

			// Arrow
			row.createEl("span", { text: "→" });

			// Replace
			const replaceInput = row.createEl("input", {
				type: "text",
				value: rule.replace,
			});
			replaceInput.placeholder = "Replacement";
			replaceInput.style.width = "100px";
			replaceInput.onchange = async () => {
				rule.replace = replaceInput.value;
				await this.plugin.saveSettings();
			};

			// Delete
			const delBtn = row.createEl("button", { text: "🗑️" });
			delBtn.onclick = async () => {
				this.plugin.settings.rules.splice(index, 1);
				await this.plugin.saveSettings();
				this.renderRulesList(container);
			};
		});
	}

	private renderFolderBlacklistList(containerEl: HTMLElement) {
		const listId = "vfr-folder-list";
		let list = containerEl.querySelector(`.${listId}`) as HTMLElement;
		if (!list) list = containerEl.createDiv({ cls: listId });
		list.empty();

		if (this.plugin.settings.blacklistedFolders.length === 0) return;

		this.plugin.settings.blacklistedFolders.forEach((p) => {
			this.createBlacklistRow(list, p, async () => {
				this.plugin.settings.blacklistedFolders =
					this.plugin.settings.blacklistedFolders.filter(
						(x) => x !== p
					);
				await this.plugin.saveSettings();
				this.renderFolderBlacklistList(containerEl);
			});
		});
	}

	private renderFileBlacklistList(containerEl: HTMLElement) {
		const listId = "vfr-file-list";
		let list = containerEl.querySelector(`.${listId}`) as HTMLElement;
		if (!list) list = containerEl.createDiv({ cls: listId });
		list.empty();

		if (this.plugin.settings.blacklistedFiles.length === 0) return;

		this.plugin.settings.blacklistedFiles.forEach((p) => {
			this.createBlacklistRow(list, p, async () => {
				this.plugin.settings.blacklistedFiles =
					this.plugin.settings.blacklistedFiles.filter(
						(x) => x !== p
					);
				await this.plugin.saveSettings();
				this.renderFileBlacklistList(containerEl);
			});
		});
	}

	// Helper for uniform rows
	private createBlacklistRow(
		parent: HTMLElement,
		text: string,
		onDelete: () => void
	) {
		new Setting(parent)
			.setName(text)
			.addButton((btn) => btn.setButtonText("Remove").onClick(onDelete));
	}

	private async addBlacklistFolder(raw: string, container: HTMLElement) {
		const norm = normalizePath(raw);
		if (!norm || norm === "/") return;
		if (this.plugin.settings.blacklistedFolders.includes(norm)) return;

		this.plugin.settings.blacklistedFolders.push(norm);
		await this.plugin.saveSettings();
		this.renderFolderBlacklistList(container);
	}

	private async addBlacklistFile(raw: string, container: HTMLElement) {
		const norm = normalizePath(raw);
		if (!norm) return;
		if (this.plugin.settings.blacklistedFiles.includes(norm)) return;

		this.plugin.settings.blacklistedFiles.push(norm);
		await this.plugin.saveSettings();
		this.renderFileBlacklistList(container);
	}
}
