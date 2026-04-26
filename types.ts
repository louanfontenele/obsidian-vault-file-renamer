export interface RenamingRule {
	name: string;
	pattern: string;
	replace: string;
	active: boolean;
	description?: string;
}

export interface VaultFileRenamerSettings {
	/** If true, the plugin automatically renames items (disabled by default). */
	enabled: boolean;
	/** File extensions to target (without the dot). Empty = all file types. */
	targetExtensions: string[];
	/** File extensions that are never renamed. Highest priority (overrides allow-list). */
	excludedExtensions: string[];
	/** Folder paths (relative to the vault) where nothing is renamed (recursive). */
	blacklistedFolders: string[];
	/** File paths (relative to the vault) that are never renamed (exact matches). */
	blacklistedFiles: string[];
	/** Custom renaming rules applied in order. */
	rules: RenamingRule[];

	/** Whether to use the creation date variable {{DATE}} in rule replacements. */
	useCreationDate: boolean;
	dateFormat: string;
}
