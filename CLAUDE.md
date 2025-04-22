# Gaia Code Project Guidelines

## Build and Execution
- `npm install` - Install dependencies
- `npm run install:all` - Install dependencies for all packages
- `npm start` - Start both backend and frontend servers
- `npm run dev` - Start both servers in development mode with hot-reloading
- `node ask_claude.js` - Run the CLI application
- `chmod +x ask_claude.js` - Make script executable (first time only)
- `./ask_claude.js` - Run as executable

## Testing
- `npm test` - Run all tests
- `cd frontend && npm test -- --testPathPattern=path/to/test` - Run specific test file
- `cd frontend && npx jest path/to/test.js` - Alternative way to run specific test

## Linting and Building
- `cd frontend && npm run lint` - Run linting on frontend code
- `cd frontend && npm run build` - Build the frontend application (includes linting)

## Code Style Guidelines
- **Imports**: Group imports:
  1. Node.js built-in modules (e.g., fs, path)
  2. External dependencies (e.g., express, socket.io)
  3. Local modules (relative paths)
- **Formatting**: 
  - 2-space indentation
  - Max line length of 80 characters
  - Use semicolons at the end of statements
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
- **Git Workflow**:
  - Each task should be on a separate branch
  - Follow semantic commit message format
  - Request code reviews before merging