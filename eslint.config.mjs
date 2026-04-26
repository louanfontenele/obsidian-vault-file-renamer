import js from "@eslint/js";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["node_modules/**", "main.js", "esbuild.config.mjs"],
	},
	{
		files: ["*.mjs"],
		languageOptions: {
			globals: {
				process: "readonly",
			},
		},
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			obsidianmd,
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
			"no-console": ["error", { allow: ["warn", "error"] }],
			"no-restricted-globals": [
				"error",
				{
					name: "app",
					message:
						"Avoid using the global app object. Use this.app from the plugin instance.",
				},
				{
					name: "fetch",
					message:
						"Use requestUrl from obsidian instead of fetch for plugin network requests.",
				},
			],
			...Object.fromEntries(
				Object.keys(obsidianmd.rules).map((ruleName) => [
					`obsidianmd/${ruleName}`,
					"error",
				])
			),
			"obsidianmd/sample-names": "off",
			"obsidianmd/ui/sentence-case": "off",
		},
	}
);
