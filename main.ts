import { Plugin, TAbstractFile, TFile, TFolder, Notice } from "obsidian";
import { VaultFileRenamerSettings } from "./types";
import { DEFAULT_SETTINGS } from "./defaults";
import { RenamingService } from "./renaming-service";
import { VaultFileRenamerSettingTab } from "./settings-tab";

export default class VaultFileRenamerPlugin extends Plugin {
	settings!: VaultFileRenamerSettings;
	renamingService!: RenamingService;

	async onload() {
		await this.loadSettings();

		// Initialize Service
		this.renamingService = new RenamingService(
			this.app,
			this.settings,
			this.saveSettings.bind(this)
		);

		// Events
		this.registerEvent(
			this.app.vault.on("create", async (item: TAbstractFile) => {
				if (!this.settings.enabled) return;
				if (item instanceof TFile) {
					// Debounce slightly to allow Obsidian to finish write
					setTimeout(
						() => this.renamingService.standardizeFile(item),
						100
					);
				} else if (item instanceof TFolder) {
					setTimeout(
						() => this.renamingService.standardizeFolder(item),
						100
					);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", async (item: TAbstractFile) => {
				if (!this.settings.enabled) return;
				if (item instanceof TFile) {
					setTimeout(
						() => this.renamingService.standardizeFile(item),
						100
					);
				} else if (item instanceof TFolder) {
					setTimeout(
						() => this.renamingService.standardizeFolder(item),
						100
					);
				}
			})
		);

		// Commands
		this.addCommand({
			id: "vfr-standardize-all-now",
			name: "Standardize everything now",
			callback: async () => {
				await this.renamingService.standardizeAll();
				new Notice("Vault File Renamer: sweep completed.");
			},
		});

		// Ribbon
		this.addRibbonIcon("dice", "Vault File Renamer", () => {
			new Notice(
				this.settings.enabled
					? "Vault File Renamer is ACTIVE."
					: "Vault File Renamer is DISABLED."
			);
		});

		// Settings
		this.addSettingTab(new VaultFileRenamerSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		// Ensure rules exist if upgrading from old version
		if (!this.settings.rules) {
			this.settings.rules = DEFAULT_SETTINGS.rules;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update service with new settings
		if (this.renamingService) {
			this.renamingService.updateSettings(this.settings);
		}
	}
}
