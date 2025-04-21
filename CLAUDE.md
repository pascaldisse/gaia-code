# Gaia Code Project Guidelines

## Build and Execution
- `npm install` - Install dependencies
- `node ask_claude.js` - Run the main application
- `chmod +x ask_claude.js` - Make script executable (first time only)
- `./ask_claude.js` - Run script as executable
- Note: Requires the `claude` CLI to be installed and in your PATH

## Testing
- `npm test` - Run all tests
- `npm test -- --testPathPattern=path/to/test` - Run specific test file
- `npx jest path/to/test.js` - Alternative way to run specific test

## Code Style Guidelines
- **Imports**: Group imports:
  1. Node.js built-in modules
  2. External dependencies
  3. Local modules
- **Formatting**: 
  - 2-space indentation
  - Max line length of 80 characters
- **Naming**: 
  - camelCase for variables and functions
  - PascalCase for classes
- **Error Handling**: 
  - Use try/catch for async operations
  - Handle stderr output appropriately
- **Async Operations**: 
  - Prefer modern async/await over callbacks
  - Handle process events properly (data, close, error)