# Gaia Code Project Guidelines

## GaiaScript Translation and Encoding Table

### Encoding Table
#### Words
```
Code    Word
w₈₀     build
w₈₁     execution
w₈₂     commands
w₈₃     GaiaScript
w₈₄     language
w₈₅     requirements
w₈₆     always
w₈₇     use
w₈₈     code
w₈₉     style
w₉₀     guidelines
w₉₁     imports
w₉₂     formatting
w₉₃     naming
w₉₄     state
w₉₅     declaration
w₉₆     functions
w₉₇     UI
w₉₈     components
w₉₉     styles
w₁₀₀    variable
w₁₀₁    interpolation
w₁₀₂    error
w₁₀₃    handling
w₁₀₄    standard
w₁₀₅    project
w₁₀₆    structure
w₁₀₇    ecosystem
w₁₀₈    technical
w₁₀₉    specification
w₁₁₀    system
w₁₁₁    description
w₁₁₂    features
w₁₁₃    tech
w₁₁₄    syntax
w₁₁₅    numbers
w₁₁₆    operations
w₁₁₇    layers
w₁₁₈    testing
w₁₁₉    install
w₁₂₀    dependencies
w₁₂₁    development
w₁₂₂    mode
w₁₂₃    compiler
w₁₂₄    location
```

#### Phrases
```
Code    Phrase
s₂₀     Install dependencies: npm install or npm run install:all (all packages)
s₂₁     Start server: npm start (both backend and frontend)
s₂₂     Development mode: npm run dev (with hot-reloading)
s₂₃     Run CLI: node ask_claude.js or ./ask_claude.js (if executable)
s₂₄     GaiaScript build: cd gaiascript && node build-gaia-code.js
s₂₅     ALWAYS USE GAIASCRIPT: All code in this project must be written in GaiaScript syntax, not JavaScript, HTML, or other languages
s₂₆     Compiler Location: The GaiaScript compiler is located at /Users/pascaldisse/gaia/.gaia/gaia/gaia
s₂₇     Imports: Use N⟨UI, Utils, JsSystem⟩ namespace imports pattern
s₂₈     State Declaration: Use S⟨variable1: value1, variable2: value2⟩
s₂₉     Functions: Use F⟨functionName, param1, param2⟩...⟨/F⟩ pattern
s₃₀     UI Components: Declare with UI⟨✱⟩...⟨/UI⟩ and proper styling
s₃₁     UI Styles: Use □{styles}⟦Content⟧ for styled elements
s₃₂     Variable Interpolation: Use ${...} for dynamic content
s₃₃     JavaScript Formatting: 2-space indentation, 80 chars line length, semicolons
s₃₄     Group imports: 1. Node.js built-in, 2. External dependencies, 3. Local modules
s₃₅     Naming: camelCase for variables/functions, PascalCase for classes/components
s₃₆     Error Handling: Use try/catch for async, handle process events, log with context
s₃₇     React Best Practices: Use functional components, single responsibility, proper state
s₃₈     Run all tests: npm test
s₃₉     Run specific test: cd frontend && npm test -- --testPathPattern=path/to/test
s₄₀     Alternative test: cd frontend && npx jest path/to/test.js
s₄₁     Run linting: cd frontend && npm run lint
s₄₂     Main File: /Users/pascaldisse/gaia/gaia-code/gaiascript/main.gaia
s₄₃     Backend: Node.js server with agent management
s₄₄     Frontend: React-based UI
s₄₅     GaiaScript: Custom code for the GaiaScript integration
```

#### Symbols
```
Symbol  Meaning
⊕       Concatenation
→       Flow
N       Network
S       State
F       Function
UI      UI Component
□       Styled Element
```

## Build/Execution Commands
- Install dependencies: `npm install` or `npm run install:all` (all packages)
- Start server: `npm start` (both backend and frontend)
- Development mode: `npm run dev` (with hot-reloading)
- Run CLI: `node ask_claude.js` or `./ask_claude.js` (if executable)
- GaiaScript build: `cd gaiascript && node build-gaia-code.js`

## GaiaScript Language Requirements
- **ALWAYS USE GAIASCRIPT**: All code in this project must be written in GaiaScript syntax, not JavaScript, HTML, or other languages
- **Compiler Location**: The GaiaScript compiler is located at `/Users/pascaldisse/gaia/.gaia/gaia/gaia`

## Code Style Guidelines
- **GaiaScript Syntax**:
  - **Imports**: Use `N⟨UI, Utils, JsSystem⟩` namespace imports pattern
  - **State Declaration**: Use `S⟨variable1: value1, variable2: value2⟩`
  - **Functions**: Use `F⟨functionName, param1, param2⟩...⟨/F⟩` pattern
  - **UI Components**: Declare with `UI⟨✱⟩...⟨/UI⟩` and proper styling
  - **UI Styles**: Use `□{styles}⟦Content⟧` for styled elements
  - **Variable Interpolation**: Use `${...}` for dynamic content

- **JavaScript Formatting** (for non-GaiaScript files): 
  - 2-space indentation
  - Max line length of 80 characters
  - Use semicolons at the end of statements
  
- **Imports**: Group imports:
  1. Node.js built-in modules (e.g., fs, path)
  2. External dependencies (e.g., express, socket.io)
  3. Local modules (relative paths)
  
- **Naming**: 
  - camelCase for variables, functions and methods
  - PascalCase for classes and React components
  - Use descriptive names that indicate purpose
  
- **Error Handling**: 
  - Use try/catch for async operations
  - Handle process events properly (data, close, error)
  - Log errors with appropriate context
  
- **React Best Practices**:
  - Use functional components with hooks
  - Keep components focused on a single responsibility
  - Manage state appropriately (local vs. global)

## Testing Guidelines
- Run all tests: `npm test`
- Run specific test file: `cd frontend && npm test -- --testPathPattern=path/to/test`
- Alternative specific test: `cd frontend && npx jest path/to/test.js`
- Run linting: `cd frontend && npm run lint`

## Project Structure
- **Main File**: `/Users/pascaldisse/gaia/gaia-code/gaiascript/main.gaia`
- **Backend**: Node.js server with agent management
- **Frontend**: React-based UI
- **GaiaScript**: Custom code for the GaiaScript integration

## GaiaScript Encoding

D⟨O⟨
  title:T⟨Gaia Code Project Guidelines⟩,
  sections:L⟨
    O⟨name:T⟨w₈₀/w₈₁ w₈₂⟩, content:L⟨s₂₀, s₂₁, s₂₂, s₂₃, s₂₄⟩⟩,
    O⟨name:T⟨w₈₃ w₈₄ w₈₅⟩, content:L⟨s₂₅, s₂₆⟩⟩,
    O⟨name:T⟨w₈₈ w₈₉ w₉₀⟩, content:L⟨
      P⟨w₈₃ w₁₁₄:L⟨s₂₇, s₂₈, s₂₉, s₃₀, s₃₁, s₃₂⟩⟩,
      P⟨JavaScript w₉₂:L⟨s₃₃⟩⟩,
      P⟨w₉₁:L⟨s₃₄⟩⟩,
      P⟨w₉₃:L⟨s₃₅⟩⟩,
      P⟨w₁₀₂ w₁₀₃:L⟨s₃₆⟩⟩,
      P⟨React Best Practices:L⟨s₃₇⟩⟩
    ⟩⟩,
    O⟨name:T⟨w₁₁₈ Guidelines⟩, content:L⟨s₃₈, s₃₉, s₄₀, s₄₁⟩⟩,
    O⟨name:T⟨w₁₀₅ w₁₀₆⟩, content:L⟨s₄₂, s₄₃, s₄₄, s₄₅⟩⟩
  ⟩
⟩⟩