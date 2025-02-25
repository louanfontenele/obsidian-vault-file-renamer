import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	TFolder,
	normalizePath
} from "obsidian";

interface VaultFileRenamerSettings {
	// Future settings can be added here
}

const DEFAULT_SETTINGS: VaultFileRenamerSettings = {
	// Defaults (none for now)
};

export default class VaultFileRenamerPlugin extends Plugin {
	settings!: VaultFileRenamerSettings;
	private renamingInProgress: Set<string> = new Set();

	async onload() {
		await this.loadSettings();

		// Standardize all existing files and folders on plugin load
		await this.standardizeAll();

		// Listen for creation events for both files and folders
		this.registerEvent(
			this.app.vault.on("create", async (item: TAbstractFile) => {
				if (item instanceof TFile) {
					setTimeout(() => this.standardizeFile(item), 50);
				} else if (item instanceof TFolder) {
					setTimeout(() => this.standardizeFolder(item), 50);
				}
			})
		);

		// Listen for rename events (manual edits) for both files and folders
		this.registerEvent(
			this.app.vault.on("rename", async (item: TAbstractFile, oldPath: string) => {
				if (item instanceof TFile) {
					setTimeout(() => this.standardizeFile(item), 50);
				} else if (item instanceof TFolder) {
					setTimeout(() => this.standardizeFolder(item), 50);
				}
			})
		);

		// Optional ribbon icon
		const ribbonIconEl = this.addRibbonIcon("dice", "Vault File Renamer", () => {
			new Notice("Vault File Renamer is active!");
		});
		ribbonIconEl.addClass("vault-file-renamer-ribbon");

		// Add settings tab
		this.addSettingTab(new VaultFileRenamerSettingTab(this.app, this));
	}

	onunload() {
		// Resources are automatically cleaned up via registerEvent.
	}

	async standardizeAll() {
		// Standardize files
		const files = this.app.vault.getFiles();
		for (const file of files) {
			await this.standardizeFile(file);
		}
		// Standardize folders recursively, starting from the vault root
		await this.standardizeAllFolders(this.app.vault.getRoot());
	}

	async standardizeAllFolders(folder: TFolder) {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				await this.standardizeAllFolders(child);
				await this.standardizeFolder(child);
			}
		}
	}

	async standardizeFile(file: TFile) {
		if (this.renamingInProgress.has(file.path)) return;

		const newBaseName = this.generateStandardName(file.name); // Preserves file extension
		const folderPath = file.parent ? file.parent.path : "";
		const newPath = normalizePath(folderPath ? `${folderPath}/${newBaseName}` : newBaseName);
		if (file.path === newPath) return;

		// Prevent duplicate files
		const existing = this.app.vault.getAbstractFileByPath(newPath);
		if (existing && existing !== file) {
			new Notice(`A file with the name "${newBaseName}" already exists. Skipping rename.`);
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

		const newBaseName = this.generateStandardNameForFolder(folder.name);
		const parentPath = folder.parent ? folder.parent.path : "";
		const newPath = normalizePath(parentPath ? `${parentPath}/${newBaseName}` : newBaseName);
		if (folder.path === newPath) return;

		// Prevent duplicate folders
		const existing = this.app.vault.getAbstractFileByPath(newPath);
		if (existing && existing !== folder) {
			new Notice(`A folder with the name "${newBaseName}" already exists. Skipping rename.`);
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

	// Standardizes file names (preserves extension)
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

	// Standardizes folder names (no extension handling)
	generateStandardNameForFolder(originalName: string): string {
		let base = originalName.toLowerCase();
		base = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		base = base.replace(/\s+/g, "-");
		base = base.replace(/[^a-z0-9\-_.]/g, "-");
		return base;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Automatic renaming")
			.setDesc("Files and folders are automatically renamed on creation and manual renaming.")
			.addToggle(toggle =>
				toggle
					.setValue(true)
					.onChange(async (value: boolean) => {
						new Notice("Automatic renaming is always enabled in this version.");
					})
			);
	}
}
