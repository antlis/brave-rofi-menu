# Brave Rofi Menu

[![npm](https://img.shields.io/npm/v/brave-rofi-menu)](https://www.npmjs.com/package/brave-rofi-menu)
[![GitHub release](https://img.shields.io/github/release/antlis/brave-rofi-menu)](https://github.com/antlis/brave-rofi-menu/releases)
[![License](https://img.shields.io/github/license/antlis/brave-rofi-menu)](https://github.com/antlis/brave-rofi-menu/blob/master/LICENSE)

A powerful tool to switch Brave browser tabs using **i3** and **rofi**. This script allows you to manage Brave tabs directly from your terminal or desktop menu, making it perfect for productivity and automation workflows.

---

## Features

- **Switch Brave Tabs**: Quickly switch between open Brave tabs using `rofi`.
- **Focus Brave Window**: Automatically focus the Brave window using `i3`.
- **Search in Brave**: Open new tabs with search queries directly from the menu.
- **Bookmarks**: Launch your Brave bookmarks using a custom script.
- **Incognito Mode**: Open incognito search sessions.
- **Close Tabs**: Close selected tabs directly from the menu.

---

## Installation

### Prerequisites

- **Node.js**: Ensure Node.js is installed on your system. Download it from [nodejs.org](https://nodejs.org/).
- **Brave Browser**: This tool is designed for Brave. Install it from [brave.com](https://brave.com/). Run brave in debug mode `brave --remote-debugging-port=9222`
- **rofi**: Install the menu utility:
  ```bash
  sudo apt install rofi
