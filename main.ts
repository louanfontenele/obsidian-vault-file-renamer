import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	normalizePath,
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

		// Rename all existing files on plugin load
		await this.standardizeAllFiles();

		// Listen for new file creation
		this.registerEvent(
			this.app.vault.on("create", async (item: TAbstractFile) => {
				if (item instanceof TFile) {
					// Use a small delay to allow the file creation to settle
					setTimeout(() => this.standardizeFile(item), 50);
				}
			})
		);

		// Listen for file rename events (manual edits)
		this.registerEvent(
			this.app.vault.on(
				"rename",
				async (item: TAbstractFile, oldPath: string) => {
					if (item instanceof TFile) {
						setTimeout(() => this.standardizeFile(item), 50);
					}
				}
			)
		);

		// Ribbon icon (optional)
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Vault File Renamer",
			() => {
				new Notice("Vault File Renamer is active!");
			}
		);
		ribbonIconEl.addClass("vault-file-renamer-ribbon");

		// Add settings tab
		this.addSettingTab(new VaultFileRenamerSettingTab(this.app, this));
	}

	onunload() {
		// Resources are cleaned up automatically via registerEvent
	}

	async standardizeAllFiles() {
		const files = this.app.vault.getFiles();
		for (const file of files) {
			await this.standardizeFile(file);
		}
	}

	async standardizeFile(file: TFile) {
		// Prevent duplicate renaming operations
		if (this.renamingInProgress.has(file.path)) return;

		// Generate a standardized file name
		const newBaseName = this.generateStandardName(file.name);
		const folderPath = file.parent ? file.parent.path : "";
		const newPath = normalizePath(
			folderPath ? `${folderPath}/${newBaseName}` : newBaseName
		);

		if (file.path === newPath) return;

		// Avoid renaming if a file with the new name already exists
		const existing = this.app.vault.getAbstractFileByPath(newPath);
		if (existing && existing !== file) {
			new Notice(
				`A file with the name "${newBaseName}" already exists. Skipping rename.`
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

	generateStandardName(originalName: string): string {
		// Separate the extension (if any) to preserve it
		const dotIndex = originalName.lastIndexOf(".");
		let base = originalName;
		let extension = "";
		if (dotIndex > 0) {
			base = originalName.substring(0, dotIndex);
			extension = originalName.substring(dotIndex).toLowerCase();
		}

		// Convert to lowercase
		base = base.toLowerCase();
		// Remove accents
		base = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		// Replace spaces with dashes
		base = base.replace(/\s+/g, "-");
		// Allow only: lowercase letters, numbers, dash (-), underscore (_), and period (.)
		base = base.replace(/[^a-z0-9\-_.]/g, "-");

		return base + extension;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
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

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// According to guidelines, avoid a top-level heading in the settings tab
		new Setting(containerEl)
			.setName("Automatic renaming")
			.setDesc(
				"Files are automatically renamed on creation and manual renaming."
			)
			.addToggle((toggle) =>
				toggle.setValue(true).onChange(async (value: boolean) => {
					new Notice(
						"Automatic renaming is always enabled in this version."
					);
				})
			);
	}
}
