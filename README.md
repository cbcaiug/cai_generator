# CAI Score Manager

CAI Score Manager is a modern, responsive web application designed for educators and administrators to manage, calculate, and analyze learner scores. It provides a comprehensive suite of tools for processing standard continuous assessments and performing reverse calculations.

## Key Features

- **Standard Score Sheet:** Easily track and manage learner scores across multiple assessment levels, with automatic calculations for CAI Totals.
- **Reverse Calculation:** Perform reverse score analysis based on target percentages and derived scores.
- **Dynamic Custom Columns:** Add custom columns with specific data types (Text, Number, Percentage, and Formula). Use custom mathematical formulas to evaluate metrics on the fly.
- **Column Locking:** Secure your configuration by locking specific columns from accidental edits.
- **Advanced Export:** Export your assessment data, calculated fields, and custom columns directly to an Excel Spreadsheet (`.xlsx`).
- **Responsive Design:** Fully optimized for both desktop and mobile viewing with an adaptable interface and collapsible sidebar navigation.
- **Local Auto-Save:** Data is automatically saved to your browser's local storage, ensuring you never lose your progress.

## Tech Stack

- **Framework:** [React 18](https://react.dev/) via [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Animations:** [Motion](https://motion.dev/)
- **Data Export:** [ExcelJS](https://github.com/exceljs/exceljs)

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation & Setup

1. Install the project dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000` to start using the CAI Score Manager.
