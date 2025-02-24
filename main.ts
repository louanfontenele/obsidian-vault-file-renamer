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
  // Futuras configurações podem ser adicionadas aqui
}

const DEFAULT_SETTINGS: VaultFileRenamerSettings = {
  // Configurações padrão (nenhuma por enquanto)
};

export default class VaultFileRenamerPlugin extends Plugin {
  settings!: VaultFileRenamerSettings;

  async onload() {
    console.log("Vault File Renamer Plugin loaded");
    await this.loadSettings();

    // Renomeia todos os arquivos existentes no vault ao carregar o plugin
    await this.standardizeAllFiles();

    // Monitora a criação de novos arquivos e os renomeia
    this.registerEvent(
      this.app.vault.on("create", async (item: TAbstractFile) => {
        if (item instanceof TFile) {
          await this.standardizeFile(item);
        }
      })
    );

    // Adiciona um ícone na ribbon (opcional)
    const ribbonIconEl = this.addRibbonIcon(
      "dice",
      "Vault File Renamer",
      () => {
        new Notice("Vault File Renamer is active!");
      }
    );
    ribbonIconEl.addClass("vault-file-renamer-ribbon");

    // Adiciona a aba de configurações
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
    // Gera o novo nome padrão para o arquivo
    const newBaseName = this.generateStandardName(file.name);
    // Verifica se o arquivo tem um pai (pasta) e obtém seu caminho
    const folderPath = file.parent ? file.parent.path : "";
    // Reconstrói o novo caminho completo mantendo a localização original
    const newPath = folderPath ? `${folderPath}/${newBaseName}` : newBaseName;

    if (file.path !== newPath) {
      try {
        await this.app.vault.rename(file, newPath);
        console.log(`Renamed file: ${file.path} -> ${newPath}`);
      } catch (error) {
        console.error(`Error renaming file ${file.path}:`, error);
      }
    }
  }

  generateStandardName(originalName: string): string {
    // Preserva a extensão se houver
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
    // Se encontrar outro caractere, substitui por traço
    base = base.replace(/[^a-z0-9\-_.]/g, "-");

    return base + extension;
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

    containerEl.createEl("h2", { text: "Vault File Renamer Settings" });

    new Setting(containerEl)
      .setName("Automatic Renaming")
      .setDesc(
        "Files are automatically renamed on creation and on plugin load."
      )
      .addToggle((toggle) =>
        toggle.setValue(true).onChange(async (value: boolean) => {
          new Notice("Automatic renaming is always enabled in this version.");
        })
      );
  }
}
