import {
	App,
	Notice,
	TAbstractFile,
	TFile,
	TFolder,
	normalizePath,
	moment,
} from "obsidian";
import { VaultFileRenamerSettings } from "./types";

export class RenamingService {
	private app: App;
	private settings: VaultFileRenamerSettings;
	public renamingInProgress: Set<string> = new Set();
	private saveSettingsCallback: () => Promise<void>;

	constructor(
		app: App,
		settings: VaultFileRenamerSettings,
		saveSettingsCallback: () => Promise<void>
	) {
		this.app = app;
		this.settings = settings;
		this.saveSettingsCallback = saveSettingsCallback;
	}

	updateSettings(newSettings: VaultFileRenamerSettings) {
		this.settings = newSettings;
	}

	async standardizeAll() {
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

	async standardizeFile(file: TFile) {
		if (this.renamingInProgress.has(file.path)) return;
		if (this.isUnderBlacklistedFolder(file.path)) return;
		if (this.isBlacklistedFile(file.path)) return;
		if (!this.isAllowedFileType(file)) return;

		const dotIndex = file.name.lastIndexOf(".");
		let nameNoExt = file.name;
		let ext = "";
		if (dotIndex > 0) {
			nameNoExt = file.name.substring(0, dotIndex);
			ext = file.name.substring(dotIndex); // includes dot
		}

		// Strip "Untitled 1", "Untitled 2" logic
		let nameToProcess = nameNoExt;
		const obsidianDuplicateRegex = /^(.*?)(\s\d+)$/;
		const match = nameToProcess.match(obsidianDuplicateRegex);
		if (match) {
			nameToProcess = match[1];
		}

		const standardizedNameNoExt = this.applyRules(
			nameToProcess,
			file.stat.ctime
		);
		const standardizedExt = ext.toLowerCase();

		const finalName = standardizedNameNoExt + standardizedExt;

		const folderPath = file.parent ? file.parent.path : "";
		const newPath = normalizePath(
			folderPath ? `${folderPath}/${finalName}` : finalName
		);

		if (file.path === newPath) return;

		const uniquePath = this.getUniquePath(newPath, file);

		if (uniquePath === file.path) return;

		const oldPath = file.path;
		this.renamingInProgress.add(oldPath);
		this.renamingInProgress.add(uniquePath);

		try {
			await this.app.vault.rename(file, uniquePath);
		} catch (error) {
			console.error(`Error renaming file ${oldPath}:`, error);
		} finally {
			this.renamingInProgress.delete(oldPath);
			setTimeout(() => this.renamingInProgress.delete(uniquePath), 1000);
		}
	}

	async standardizeFolder(folder: TFolder) {
		if (this.renamingInProgress.has(folder.path)) return;
		if (this.isUnderBlacklistedFolder(folder.path)) return;

		const standardizedName = this.applyRules(folder.name, Date.now());
		const parentPath = folder.parent ? folder.parent.path : "";
		const newPath = normalizePath(
			parentPath ? `${parentPath}/${standardizedName}` : standardizedName
		);

		if (folder.path === newPath) return;

		const uniquePath = this.getUniquePath(newPath, folder);

		if (uniquePath === folder.path) return;

		const oldPath = folder.path;
		this.renamingInProgress.add(oldPath);
		this.renamingInProgress.add(uniquePath);

		try {
			await this.app.vault.rename(folder, uniquePath);
		} catch (error) {
			console.error(`Error renaming folder ${folder.path}:`, error);
		} finally {
			this.renamingInProgress.delete(oldPath);
			setTimeout(() => this.renamingInProgress.delete(uniquePath), 1000);
		}
	}

	private getUniquePath(desiredPath: string, item: TAbstractFile): string {
		let collisionFreePath = desiredPath;
		let counter = 2; // Start at 2 for duplicates

		const isFile = item instanceof TFile;
		let base = "";
		let ext = "";

		if (isFile) {
			const name = desiredPath.split("/").pop() || "";
			const dotIndex = name.lastIndexOf(".");
			if (dotIndex > 0) {
				base = desiredPath.substring(0, desiredPath.lastIndexOf("."));
				ext = desiredPath.substring(desiredPath.lastIndexOf("."));
			} else {
				base = desiredPath;
				ext = "";
			}
		} else {
			base = desiredPath;
			ext = "";
		}

		while (
			this.app.vault.getAbstractFileByPath(collisionFreePath) &&
			this.app.vault.getAbstractFileByPath(collisionFreePath) !== item
		) {
			collisionFreePath = normalizePath(`${base}-${counter}${ext}`);
			counter++;
		}

		return collisionFreePath;
	}

	private applyRules(
		originalName: string,
		fileCreationTime?: number
	): string {
		// 1. Built-in normalization
		let name = originalName.toLowerCase();
		name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

		// 2. Custom Rules
		for (const rule of this.settings.rules) {
			if (!rule.active) continue;
			try {
				const regex = new RegExp(rule.pattern, "g");
				let replacement = rule.replace;

				// Variable Parsing
				if (
					this.settings.useCreationDate &&
					replacement.includes("{{DATE}}")
				) {
					const format = this.settings.dateFormat || "YYYY-MM-DD";
					const dateStr = (moment as any)(
						fileCreationTime || Date.now()
					).format(format);
					replacement = replacement.replace(/{{DATE}}/g, dateStr);
				}

				name = name.replace(regex, replacement);
			} catch (e) {
				console.warn(`Invalid regex in rule "${rule.name}":`, e);
			}
		}

		if (name.trim() === "") return "unnamed";
		return name;
	}

	// ... Blacklist checks ...
	private isUnderBlacklistedFolder(pathInVault: string): boolean {
		const normalizedTarget = normalizePath(pathInVault);
		const blacklisted = this.settings.blacklistedFolders.map((p) =>
			normalizePath(p)
		);
		return blacklisted.some((blk) => {
			if (blk === "" || blk === "/") return false;
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

	private isAllowedFileType(file: TFile): boolean {
		const allowList = this.settings.targetExtensions
			.map((e) => e.trim().toLowerCase())
			.filter(Boolean);
		const excludeList = this.settings.excludedExtensions
			.map((e) => e.trim().toLowerCase())
			.filter(Boolean);
		const ext = (file.extension || "").toLowerCase();

		if (excludeList.includes(ext)) return false;
		if (allowList.length > 0) return allowList.includes(ext);
		return true;
	}
}
