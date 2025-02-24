import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
} from "obsidian";

interface VaultFileRenamerSettings {
	// Future settings can be added here
}

const DEFAULT_SETTINGS: VaultFileRenamerSettings = {
	// Defaults (none for now)
};

export default class VaultFileRenamerPlugin extends Plugin {
	settings!: VaultFileRenamerSettings;
	// Um conjunto para evitar renomeações duplicadas simultâneas
	private renamingInProgress: Set<string> = new Set();

	async onload() {
		console.log("Vault File Renamer Plugin loaded");
		await this.loadSettings();

		// Renomeia todos os arquivos existentes ao carregar
		await this.standardizeAllFiles();

		// Escuta criação de novos arquivos
		this.registerEvent(
			this.app.vault.on("create", async (item: TAbstractFile) => {
				if (item instanceof TFile) {
					// Delay pequeno para garantir que o arquivo foi criado
					setTimeout(() => this.standardizeFile(item), 50);
				}
			})
		);

		// Escuta eventos de renomeação (edição manual)
		this.registerEvent(
			this.app.vault.on(
				"rename",
				async (item: TAbstractFile, oldPath: string) => {
					if (item instanceof TFile) {
						// Delay para permitir que a renomeação manual seja concluída
						setTimeout(() => this.standardizeFile(item), 50);
					}
				}
			)
		);

		// Ribbon icon (opcional)
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Vault File Renamer",
			() => {
				new Notice("Vault File Renamer is active!");
			}
		);
		ribbonIconEl.addClass("vault-file-renamer-ribbon");

		// Aba de configurações
		this.addSettingTab(new VaultFileRenamerSettingTab(this.app, this));
	}

	onunload() {
		console.log("Vault File Renamer Plugin unloaded");
	}

	async standardizeAllFiles() {
		const files = this.app.vault.getFiles();
		for (const file of files) {
			await this.standardizeFile(file);
		}
	}

	async standardizeFile(file: TFile) {
		// Se já estiver em processo de renomeação, pula
		if (this.renamingInProgress.has(file.path)) return;

		// Gera o novo nome padronizado para o arquivo
		const newBaseName = this.generateStandardName(file.name);
		const folderPath = file.parent ? file.parent.path : "";
		const newPath = folderPath
			? `${folderPath}/${newBaseName}`
			: newBaseName;

		// Se o nome já estiver padronizado, não faz nada
		if (file.path === newPath) return;

		// Verifica se já existe um arquivo com esse caminho para evitar duplicatas
		const existing = this.app.vault.getAbstractFileByPath(newPath);
		if (existing && existing !== file) {
			new Notice(
				`A file with the name "${newBaseName}" already exists. Skipping rename.`
			);
			return;
		}

		// Marca o arquivo como em renomeação
		this.renamingInProgress.add(file.path);
		try {
			await this.app.vault.rename(file, newPath);
			console.log(`Renamed file to: ${newPath}`);
		} catch (error) {
			console.error(`Error renaming file ${file.path}:`, error);
		} finally {
			this.renamingInProgress.delete(file.path);
		}
	}

	generateStandardName(originalName: string): string {
		// Separa a extensão, se houver
		const dotIndex = originalName.lastIndexOf(".");
		let base = originalName;
		let extension = "";
		if (dotIndex > 0) {
			base = originalName.substring(0, dotIndex);
			extension = originalName.substring(dotIndex).toLowerCase();
		}

		// Converte para minúsculas
		base = base.toLowerCase();
		// Remove acentos
		base = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		// Substitui espaços por traço
		base = base.replace(/\s+/g, "-");
		// Permite apenas: letras minúsculas, números, traço (-), underline (_) e ponto (.)
		// Qualquer outro caractere é convertido para traço
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

		containerEl.createEl("h2", { text: "Vault File Renamer Settings" });

		new Setting(containerEl)
			.setName("Automatic Renaming")
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
