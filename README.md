# Gaia Code

A web application that uses LangChain with Claude Code agents to work on git projects.

## Features

- **Multiple Agents**: A main manager agent coordinates several sub-agents
- **Task Management**: Create and assign coding tasks to agents
- **Claude Code Integration**: Each agent can use Claude Code to build and modify code
- **Git Integration**: Automatically manages branches and commits for each task
- **Real-time Updates**: WebSocket-based real-time updates of agent progress
- Formats your query with a programming-specific prompt
- Auto-responds to confirmation prompts from Claude
- Provides helpful error messages if Claude CLI is not installed

## Architecture

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: React + Tailwind CSS
- **Agent System**: LangChain-based agent architecture
- **Tool Integration**: Claude Code CLI integration

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm run install:all
   ```
3. Create a `.env` file in the `backend` directory based on `.env.example`
4. Ensure Claude CLI is installed and accessible in your PATH

## Usage

1. Start the application:
   ```
   npm start
   ```
2. Open your browser to http://localhost:3000
3. Create tasks through the web interface
4. Watch as agents work on your git project

For CLI usage:
```bash
node ask_claude.js
```
When prompted, enter your programming question or task.

## Development

- Backend server runs on port 3001
- Frontend development server runs on port 3000
- Use `npm run dev` for development with hot-reloading

## Configuration

The following environment variables can be set in the backend `.env` file:

- `PORT`: Backend server port (default: 3001)
- `CLAUDE_API_KEY`: Your Claude API key
- `GIT_REPO_PATH`: Path to the git repository to work on
- `CLAUDE_CODE_PATH`: Path to the Claude Code script (optional)

## Requirements

- Node.js v14+
- Git
- Claude CLI