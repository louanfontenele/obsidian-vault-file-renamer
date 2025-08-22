import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	TFolder,
	normalizePath,
} from "obsidian";
import { FolderSuggest } from "./folder-suggest";
import { FileSuggest } from "./file-suggest";

interface VaultFileRenamerSettings {
	/** If true, the plugin automatically renames items (disabled by default). */
	enabled: boolean;
	/** File extensions to target (without the dot). Empty = all file types. */
	targetExtensions: string[];
	/** File extensions that are NEVER renamed. Highest priority (overrides allow-list). */
	excludedExtensions: string[];
	/** Folder paths (relative to the vault) where NOTHING is renamed (recursive). */
	blacklistedFolders: string[];
	/** File paths (relative to the vault) that are NEVER renamed (exact matches). */
	blacklistedFiles: string[];
}

const DEFAULT_SETTINGS: VaultFileRenamerSettings = {
	enabled: false,
	// Safer default: only .md. Users can expand this list.
	targetExtensions: ["md"],
	// When targetExtensions is empty (i.e., all), exclude none by default.
	excludedExtensions: [],
	// Avoid touching Obsidian internals by default.
	blacklistedFolders: [".obsidian"],
	// No file-level blacklist by default.
	blacklistedFiles: [],
};

export default class VaultFileRenamerPlugin extends Plugin {
	settings!: VaultFileRenamerSettings;
	private renamingInProgress: Set<string> = new Set();

	async onload() {
		await this.loadSettings();

		// Events: creation and rename — both respect the "enabled" toggle and the blacklists.
		this.registerEvent(
			this.app.vault.on("create", async (item: TAbstractFile) => {
				if (!this.settings.enabled) return;
				if (item instanceof TFile) {
					setTimeout(() => this.standardizeFile(item), 50);
				} else if (item instanceof TFolder) {
					setTimeout(() => this.standardizeFolder(item), 50);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", async (item: TAbstractFile) => {
				if (!this.settings.enabled) return;
				if (item instanceof TFile) {
					setTimeout(() => this.standardizeFile(item), 50);
				} else if (item instanceof TFolder) {
					setTimeout(() => this.standardizeFolder(item), 50);
				}
			})
		);

		// Manual command to standardize everything (independent from the "enabled" toggle).
		this.addCommand({
			id: "vfr-standardize-all-now",
			name: "Standardize everything now",
			callback: async () => {
				await this.standardizeAll();
				new Notice("Vault File Renamer: sweep completed.");
			},
		});

		// Ribbon (informational)
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Vault File Renamer",
			() => {
				new Notice(
					this.settings.enabled
						? "Vault File Renamer is ACTIVE (auto-rename)."
						: "Vault File Renamer is DISABLED."
				);
			}
		);
		ribbonIconEl.addClass("vault-file-renamer-ribbon");

		// Settings
		this.addSettingTab(new VaultFileRenamerSettingTab(this.app, this));
	}

	onunload() {
		// Automatic cleanup via registerEvent/commands.
	}

	/** Sweep the entire vault (respects blacklists and extensions). */
	async standardizeAll() {
		// Folders first (top-down), then files.
		await this.standardizeAllFolders(this.app.vault.getRoot());

		const files = this.app.vault.getFiles();
		for (const file of files) {
			await this.standardizeFile(file);
		}
	}

	private async standardizeAllFolders(folder: TFolder) {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				await this.standardizeAllFolders(child);
				await this.standardizeFolder(child);
			}
		}
	}

	private isUnderBlacklistedFolder(pathInVault: string): boolean {
		const normalizedTarget = normalizePath(pathInVault);
		const blacklisted = this.settings.blacklistedFolders.map((p) =>
			normalizePath(p)
		);

		return blacklisted.some((blk) => {
			// If user enters "/" (root), that would block everything — avoid that.
			if (blk === "" || blk === "/") return false;
			// Same folder or one of its descendants?
			return (
				normalizedTarget === blk ||
				normalizedTarget.startsWith(blk + "/")
			);
		});
	}

	private isBlacklistedFile(pathInVault: string): boolean {
		const normalizedTarget = normalizePath(pathInVault);
		const files = this.settings.blacklistedFiles.map((p) =>
			normalizePath(p)
		);
		return files.includes(normalizedTarget);
	}

	/**
	 * Decide whether a file extension is eligible for renaming.
	 * Priority order:
	 * 1) If extension is in excludedExtensions => NEVER rename (wins over allow-list).
	 * 2) If targetExtensions (allow-list) is non-empty => only rename if included.
	 * 3) If allow-list is empty => rename ALL except excluded (handled in #1).
	 */
	private isAllowedFileType(file: TFile): boolean {
		const allowList = this.settings.targetExtensions
			.map((e) => e.trim().toLowerCase())
			.filter(Boolean);
		const excludeList = this.settings.excludedExtensions
			.map((e) => e.trim().toLowerCase())
			.filter(Boolean);
		const ext = (file.extension || "").toLowerCase();

		// Highest priority: excluded extensions always win
		if (excludeList.includes(ext)) return false;

		// If allow list has items, only those are allowed
		if (allowList.length > 0) {
			return allowList.includes(ext);
		}

		// Allow-list is empty: everything is allowed (since not excluded above)
		return true;
	}

	async standardizeFile(file: TFile) {
		if (this.renamingInProgress.has(file.path)) return;
		if (this.isUnderBlacklistedFolder(file.path)) return;
		if (this.isBlacklistedFile(file.path)) return;
		if (!this.isAllowedFileType(file)) return;

		const newBaseName = this.generateStandardName(file.name); // keep extension
		const folderPath = file.parent ? file.parent.path : "";
		const newPath = normalizePath(
			folderPath ? `${folderPath}/${newBaseName}` : newBaseName
		);
		if (file.path === newPath) return;

		// Prevent collisions
		const existing = this.app.vault.getAbstractFileByPath(newPath);
		if (existing && existing !== file) {
			new Notice(
				`A file named "${newBaseName}" already exists. Skipping.`
			);
			return;
		}

		this.renamingInProgress.add(file.path);
		try {
			await this.app.vault.rename(file, newPath);
		} catch (error) {
			console.error(`Error renaming file ${file.path}:`, error);
		} finally {
			this.renamingInProgress.delete(file.path);
		}
	}

	async standardizeFolder(folder: TFolder) {
		if (this.renamingInProgress.has(folder.path)) return;
		// If this folder or any ancestor is blacklisted, do not rename it.
		if (this.isUnderBlacklistedFolder(folder.path)) return;

		const newBaseName = this.generateStandardNameForFolder(folder.name);
		const parentPath = folder.parent ? folder.parent.path : "";
		const newPath = normalizePath(
			parentPath ? `${parentPath}/${newBaseName}` : newBaseName
		);
		if (folder.path === newPath) return;

		// Prevent collisions
		const existing = this.app.vault.getAbstractFileByPath(newPath);
		if (existing && existing !== folder) {
			new Notice(
				`A folder named "${newBaseName}" already exists. Skipping.`
			);
			return;
		}

		this.renamingInProgress.add(folder.path);
		try {
			await this.app.vault.rename(folder, newPath);
		} catch (error) {
			console.error(`Error renaming folder ${folder.path}:`, error);
		} finally {
			this.renamingInProgress.delete(folder.path);
		}
	}

	// Standardizes file names (keeps extension)
	generateStandardName(originalName: string): string {
		const dotIndex = originalName.lastIndexOf(".");
		let base = originalName;
		let extension = "";
		if (dotIndex > 0) {
			base = originalName.substring(0, dotIndex);
			extension = originalName.substring(dotIndex).toLowerCase();
		}

		base = base.toLowerCase();
		base = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		base = base.replace(/\s+/g, "-");
		base = base.replace(/[^a-z0-9\-_.]/g, "-");

		return base + extension;
	}

	// Standardizes folder names
	generateStandardNameForFolder(originalName: string): string {
		let base = originalName.toLowerCase();
		base = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		base = base.replace(/\s+/g, "-");
		base = base.replace(/[^a-z0-9\-_.]/g, "-");
		return base;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		// Sanitize inputs
		this.settings.blacklistedFolders = Array.from(
			new Set(
				(this.settings.blacklistedFolders || [])
					.map((p) => p.trim())
					.filter((p) => p !== "/" && p !== "")
			)
		);
		this.settings.targetExtensions = Array.from(
			new Set(
				(this.settings.targetExtensions || [])
					.map((e) => e.trim().toLowerCase())
					.filter(Boolean)
			)
		);
		this.settings.excludedExtensions = Array.from(
			new Set(
				(this.settings.excludedExtensions || [])
					.map((e) => e.trim().toLowerCase())
					.filter(Boolean)
			)
		);
		this.settings.blacklistedFiles = Array.from(
			new Set(
				(this.settings.blacklistedFiles || [])
					.map((p) => p.trim())
					.filter(Boolean)
			)
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class VaultFileRenamerSettingTab extends PluginSettingTab {
	plugin: VaultFileRenamerPlugin;

	constructor(app: App, plugin: VaultFileRenamerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private renderFolderBlacklistList(containerEl: HTMLElement) {
		// Clear existing list container, if present
		const existing = containerEl.querySelector(".vfr-blacklist-list");
		if (existing) existing.remove();

		const list = containerEl.createDiv({ cls: "vfr-blacklist-list" });

		if (this.plugin.settings.blacklistedFolders.length === 0) {
			list.createEl("div", { text: "No folders in the blacklist." });
			return;
		}

		for (const p of this.plugin.settings.blacklistedFolders) {
			const row = list.createDiv({ cls: "vfr-bl-row" });
			row.createEl("code", { text: p });
			const btn = row.createEl("button", { text: "Remove" });
			btn.onclick = async () => {
				this.plugin.settings.blacklistedFolders =
					this.plugin.settings.blacklistedFolders.filter(
						(x) => x !== p
					);
				await this.plugin.saveSettings();
				this.renderFolderBlacklistList(containerEl);
			};
		}
	}

	private renderFileBlacklistList(containerEl: HTMLElement) {
		const existing = containerEl.querySelector(".vfr-file-blacklist-list");
		if (existing) existing.remove();

		const list = containerEl.createDiv({ cls: "vfr-file-blacklist-list" });

		if (this.plugin.settings.blacklistedFiles.length === 0) {
			list.createEl("div", { text: "No files in the blacklist." });
			return;
		}

		for (const p of this.plugin.settings.blacklistedFiles) {
			const row = list.createDiv({ cls: "vfr-bl-row" });
			row.createEl("code", { text: p });
			const btn = row.createEl("button", { text: "Remove" });
			btn.onclick = async () => {
				this.plugin.settings.blacklistedFiles =
					this.plugin.settings.blacklistedFiles.filter(
						(x) => x !== p
					);
				await this.plugin.saveSettings();
				this.renderFileBlacklistList(containerEl);
			};
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Vault File Renamer – Settings" });

		// Main toggle
		new Setting(containerEl)
			.setName("Automatically rename")
			.setDesc(
				"When enabled, files and folders will be standardized on create/rename."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value: boolean) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
						new Notice(
							value
								? "Auto-rename enabled."
								: "Auto-rename disabled."
						);
					})
			);

		// Extensions (allow-list)
		new Setting(containerEl)
			.setName("Target extensions (allow-list)")
			.setDesc(
				"Which file types to rename. Comma-separated. Example: md, canvas, png. Empty = all."
			)
			.addText((text) => {
				text.setPlaceholder("md, canvas, png")
					.setValue(this.plugin.settings.targetExtensions.join(", "))
					.onChange(async (value) => {
						const parts = value
							.split(",")
							.map((s) => s.trim().toLowerCase())
							.filter(Boolean);
						this.plugin.settings.targetExtensions = Array.from(
							new Set(parts)
						);
						await this.plugin.saveSettings();
					});
			});

		// Extensions (exclude-list) — highest priority
		new Setting(containerEl)
			.setName("Excluded extensions (highest priority)")
			.setDesc(
				"These extensions are NEVER renamed. They override the allow-list. Example: tmp, xml"
			)
			.addText((text) => {
				text.setPlaceholder("tmp, xml")
					.setValue(
						this.plugin.settings.excludedExtensions.join(", ")
					)
					.onChange(async (value) => {
						const parts = value
							.split(",")
							.map((s) => s.trim().toLowerCase())
							.filter(Boolean);
						this.plugin.settings.excludedExtensions = Array.from(
							new Set(parts)
						);
						await this.plugin.saveSettings();
					});
			});

		// Manual execution button
		new Setting(containerEl)
			.setName("Standardize everything now")
			.setDesc(
				"Run an immediate sweep across the whole vault (respects blacklists/extensions)."
			)
			.addButton((btn) =>
				btn.setButtonText("Run").onClick(async () => {
					await this.plugin.standardizeAll();
					new Notice("Sweep completed.");
				})
			);

		// Folder blacklist (with suggestions)
		containerEl.createEl("h3", { text: "Folder blacklist" });

		const folderBlock = containerEl.createDiv();

		new Setting(folderBlock)
			.setName("Add folder to blacklist")
			.setDesc(
				"Files and subfolders under these paths will NOT be renamed."
			)
			.addSearch((search) => {
				search
					.setPlaceholder("e.g., Personal Area/Private")
					.setValue("")
					.onChange((_) => {
						/* input-only */
					});

				// Suggest folders; clicking a suggestion adds and saves immediately.
				new FolderSuggest(this.app, search.inputEl, async (picked) => {
					const normalized = normalizePath(picked);
					if (!normalized || normalized === "/") {
						new Notice("Invalid folder.");
						return;
					}
					if (
						this.plugin.settings.blacklistedFolders.includes(
							normalized
						)
					) {
						new Notice("This folder is already in the blacklist.");
						return;
					}
					this.plugin.settings.blacklistedFolders.push(normalized);
					await this.plugin.saveSettings();
					this.renderFolderBlacklistList(folderBlock);
					search.setValue("");
					new Notice(`Added to blacklist: ${normalized}`);
				});

				// Manual add button (typed path)
				const addBtn = createEl("button", { text: "Add" });
				addBtn.style.marginLeft = "8px";
				addBtn.onclick = async () => {
					let raw = search.getValue().trim();
					if (!raw) return;

					const normalized = normalizePath(raw);
					if (!normalized || normalized === "/") {
						new Notice("Invalid folder.");
						return;
					}
					if (
						this.plugin.settings.blacklistedFolders.includes(
							normalized
						)
					) {
						new Notice("This folder is already in the blacklist.");
						return;
					}

					this.plugin.settings.blacklistedFolders.push(normalized);
					await this.plugin.saveSettings();
					search.setValue("");
					this.renderFolderBlacklistList(folderBlock);
					new Notice(`Added to blacklist: ${normalized}`);
				};

				search.inputEl.parentElement?.appendChild(addBtn);
			});

		// Current folder list
		this.renderFolderBlacklistList(folderBlock);

		// File blacklist (with suggestions)
		containerEl.createEl("h3", { text: "File blacklist" });

		const fileBlock = containerEl.createDiv();

		new Setting(fileBlock)
			.setName("Add file to blacklist")
			.setDesc(
				"These files will NEVER be renamed (exact path match). Useful for files without extension."
			)
			.addSearch((search) => {
				search
					.setPlaceholder("e.g., Settings/README or Config")
					.setValue("")
					.onChange((_) => {
						/* input-only */
					});

				// Suggest files; clicking a suggestion adds and saves immediately.
				new FileSuggest(this.app, search.inputEl, async (picked) => {
					const normalized = normalizePath(picked);
					if (!normalized) {
						new Notice("Invalid file path.");
						return;
					}
					if (
						this.plugin.settings.blacklistedFiles.includes(
							normalized
						)
					) {
						new Notice("This file is already in the blacklist.");
						return;
					}
					this.plugin.settings.blacklistedFiles.push(normalized);
					await this.plugin.saveSettings();
					this.renderFileBlacklistList(fileBlock);
					search.setValue("");
					new Notice(`Added to blacklist: ${normalized}`);
				});

				// Manual add button (typed path)
				const addBtn = createEl("button", { text: "Add" });
				addBtn.style.marginLeft = "8px";
				addBtn.onclick = async () => {
					let raw = search.getValue().trim();
					if (!raw) return;

					const normalized = normalizePath(raw);
					if (!normalized) {
						new Notice("Invalid file path.");
						return;
					}
					if (
						this.plugin.settings.blacklistedFiles.includes(
							normalized
						)
					) {
						new Notice("This file is already in the blacklist.");
						return;
					}

					this.plugin.settings.blacklistedFiles.push(normalized);
					await this.plugin.saveSettings();
					search.setValue("");
					this.renderFileBlacklistList(fileBlock);
					new Notice(`Added to blacklist: ${normalized}`);
				};

				search.inputEl.parentElement?.appendChild(addBtn);
			});

		// Current file list
		this.renderFileBlacklistList(fileBlock);

		// Tip
		const tip = containerEl.createEl("p");
		tip.setText(
			"Tip: for safety, the plugin ignores '.obsidian' by default. You may remove it if you wish."
		);
	}
}
