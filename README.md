# Vault File Renamer

**Vault File Renamer** automatically standardizes vault file and folder names. It converts names to lowercase, removes accents, applies configurable replacement rules, and preserves user-defined exceptions.

---

## Features

-   **Automatic Renaming (toggleable):**  
     When enabled, standardizes names on file/folder **create** and **manual rename** events.
-   **Consistent Naming Rules:**  
     Lowercase and accent removal are built in. Custom regex rules run afterward and can be edited, disabled, removed, or reordered by changing the list.
-   **Path Preservation:**  
     Keeps items in their original folders—no moves, just safe renames.
-   **Link updates:**  
     Uses Obsidian's file manager rename flow so internal links are updated when notes and folders are renamed.
-   **Allow-list for Extensions:**  
     **Target extensions** (e.g., `md, canvas, png`). If set, only these are renamed.
-   **Excluded Extensions (highest priority):**  
     **Never** rename these extensions—even if they are in the allow-list. If the allow-list is empty (meaning _all_), excluded extensions are still skipped.
-   **Folder Blacklist (recursive):**  
     Nothing inside listed folders is renamed. Pick from suggestions and **one-click to add**.
-   **File Blacklist (exact path):**  
     Specific files are never renamed (great for **extensionless** files). Pick from suggestions and **one-click to add**.
-   **Manual “Sweep” command:**  
     `Standardize everything now` runs an explicit pass over the entire vault (respects all blacklists and rules).
-   **Duplicate safety:**  
     If a target path already exists, the plugin appends a numeric suffix such as `-2`.
-   **Safe defaults:**  
     Starts **disabled**; the current vault configuration folder is blacklisted by default.

---

## Installation

1. **Clone or download** this repository.
2. Run `npm install` in the plugin folder to install dependencies.
3. Build the plugin using:

    ```bash
    npm run build
    ```

4. Copy the generated `main.js`, `manifest.json`, and `styles.css` to your Obsidian plugins folder (usually `.obsidian/plugins/vault-file-renamer`).
5. Open Obsidian, go to **Settings → Community Plugins**, and enable **Vault File Renamer**.

---

## Usage

-   **Enable the toggle:**  
     In **Settings → Vault File Renamer**, turn on **Automatically rename**. From now on, new creations and manual renames will be standardized.

-   **Configure file types:**

    -   **Target extensions (allow-list):** Set a comma-separated list (e.g., `md, canvas`). If this list is **empty**, the plugin treats it as **all extensions**.
    -   **Excluded extensions (highest priority):** These are **never** renamed—even if also present in the allow-list. Example: allow-list `md`, excluded `xml` → `xml` files are still skipped.

-   **Blacklist what you don’t want touched:**

    -   **Folder blacklist:** Nothing inside those folders (recursively) is renamed. Use the search field to **pick from suggestions** and **click to add**.
    -   **File blacklist:** Exact file paths that are never renamed—ideal for **files without extensions**. Also supports **click-to-add** from suggestions.

-   **Run a full pass on demand:**  
     Use the command **“Standardize everything now”** to sweep the entire vault once, respecting all blacklists and extension rules.

-   **Customize renaming rules:**  
     Rules use JavaScript regular expressions. For example, keeping spaces requires disabling the default spaces-to-dashes rule and allowing whitespace in the special-character rule.

Enjoy a tidier vault with standardized filenames.

---

## Development

To set up the development environment:

1. **Install Dependencies:**

    ```bash
    npm install
    ```

2. **Watch for Changes (Development Mode):**

    ```bash
    npm run watch
    ```

3. **Lint and type-check:**

    ```bash
    npm run lint
    npx tsc --noEmit
    ```

4. **Build for Production:**

    ```bash
    npm run build
    ```

Feel free to contribute and open issues if you find any bugs or have feature requests!

---

## Credits

Developed by [Louan Fontenele](https://github.com/louanfontenele).  
Inspired by the [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
