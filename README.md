# FinCmd

# Overview
A desktop financial planning assistant that combines budgeting, tax-aware income modeling, investment forecasting, and AI-generated insights in a single native app experience. It helps users translate current financial choices into long-term outcomes with clear visual breakdowns and actionable guidance.

# Screenshots
### Main Page
<img width="1512" height="982" alt="Screenshot 2026-03-01 at 12 43 05 AM" src="https://github.com/user-attachments/assets/c45863ba-ea61-4e40-9553-a70c38f89773" />

### Investments Page
<img width="1512" height="982" alt="Screenshot 2026-03-01 at 12 43 20 AM" src="https://github.com/user-attachments/assets/a73745ba-9602-4375-8f4d-b1ee8074c52d" />

### Graphs Preview
<img width="1512" height="982" alt="Screenshot 2026-03-01 at 12 43 34 AM" src="https://github.com/user-attachments/assets/42166187-4ce1-4f3a-ad95-42529376322e" />


# Table of Contents
- [Project Title](#fincmd)
- [Overview](#overview)
- [Screenshots](#screenshots)
- [Table of Contents](#table-of-contents)
- [List of Features](#list-of-features)
- [Installation Guide](#installation-guide)
- [Quick Start / Usage](#quick-start--usage)
- [Credits](#credits)
- [License](#license)

# List of Features
- Budgeting inputs for compensation, savings, expenses, wants, and career context
- Tax-aware calculations for federal, state, and FICA estimates
- Investment forecasting with configurable time horizon and return assumptions
- AI-generated financial and career insights from the saved profile
- Desktop UI built with Wails and a cyberpunk HUD-inspired interface

# Installation Guide
## Prerequisites
- Go (version 1.23 or later)
- Node.js and npm
- Wails CLI

## Install Dependencies
1. Install Go dependencies:
   ```bash
   go mod tidy
   ```
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

# Quick Start / Usage
## Development
1. Build frontend assets:
   ```bash
   cd frontend
   npm run build
   ```
2. Run in development mode:
   ```bash
   wails dev
   ```

## Production Build
```bash
wails build
```

# Credits
- Wails framework
- OpenAI (if applicable)
- Google Gemini API (if applicable)
- Add any additional contributors or assets here

# License
MIT License (placeholder). Replace with your project’s actual license.
