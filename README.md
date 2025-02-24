# Vault File Renamer 🔧🚀

**Vault File Renamer** is an Obsidian plugin that automatically standardizes the names of your vault files! It converts filenames to lowercase, removes accents, and ensures a consistent naming style that matches GitHub's conventions.

---

## ✨ Features

-   **Automatic Renaming:**  
     Automatically renames files when created or renamed manually.
-   **Consistent Naming:**  
     Converts filenames to lowercase, removes accents, and replaces spaces with dashes (`-`).
-   **Customizable Format:**  
     Only allows lowercase letters, numbers, and the symbols `-`, `_`, and `.`. Any disallowed character is converted to a dash.
-   **Path Preservation:**  
     Keeps your files in their original folders, so no work is lost!

---

## 📥 Installation

1. **Clone or download** this repository.
2. Run `npm install` in the plugin folder to install dependencies.
3. Build the plugin using:

    ```bash
    npm run build production
    ```

4. Copy the generated `main.js` and `manifest.json` to your Obsidian plugins folder (usually located at `.obsidian/plugins/vault-file-renamer`).
5. Open Obsidian, go to **Settings → Community Plugins**, and enable **Vault File Renamer**.

---

## 🚀 Usage

-   **Automatic Standardization:**  
     The plugin will automatically rename all existing files in your vault when activated and apply the same renaming rules for new files or manual renames.

-   **No More Duplicates:**  
     It checks for duplicates and avoids creating empty or duplicate files.

Enjoy a tidier vault with standardized filenames! 🎉

---

## 🛠️ Development

To set up the development environment:

1. **Install Dependencies:**

    ```bash
    npm install
    ```

2. **Watch for Changes (Development Mode):**

    ```bash
    npm run watch
    ```

3. **Build for Production:**

    ```bash
    npm run build production
    ```

Feel free to contribute and open issues if you find any bugs or have feature requests!

---

## 🙏 Credits

Developed with ❤️ by [Louan Fontenele](https://github.com/louanfontenele).  
Inspired by the [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
