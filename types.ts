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
	/** File extensions that are NEVER renamed. Highest priority (overrides allow-list). */
	excludedExtensions: string[];
	/** Folder paths (relative to the vault) where NOTHING is renamed (recursive). */
	blacklistedFolders: string[];
	/** File paths (relative to the vault) that are NEVER renamed (exact matches). */
	blacklistedFiles: string[];
	/** Custom renaming rules applied in order. */
	rules: RenamingRule[];
	/** Application of rules case-sensitivity or other flags? For now, we assume global. */

	/** Whether to use the creation date variable {{DATE}} feature (to be implemented). */
	useCreationDate: boolean;
	dateFormat: string;
}
