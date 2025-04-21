const simpleGit = require('simple-git');

class GitTool {
  constructor(repoPath) {
    this.git = simpleGit(repoPath);
  }
  
  async status() {
    return this.git.status();
  }
  
  async createBranch(branchName) {
    // Get current branch to return to later if needed
    const currentBranch = await this.getCurrentBranch();
    
    // Check if branch exists
    const branches = await this.git.branch();
    const branchExists = branches.all.includes(branchName);
    
    if (branchExists) {
      // Checkout existing branch
      await this.git.checkout(branchName);
    } else {
      // Create and checkout new branch
      await this.git.checkoutLocalBranch(branchName);
    }
    
    return { previousBranch: currentBranch, branchName };
  }
  
  async getCurrentBranch() {
    const status = await this.git.status();
    return status.current;
  }
  
  async commitChanges(message) {
    await this.git.add('.');
    const status = await this.git.status();
    
    // Only commit if there are changes
    if (status.files.length > 0) {
      return this.git.commit(message);
    } else {
      return { summary: { changes: 0, insertions: 0, deletions: 0 } };
    }
  }
  
  async pullChanges() {
    return this.git.pull();
  }
  
  async pushChanges() {
    const currentBranch = await this.getCurrentBranch();
    return this.git.push('origin', currentBranch, ['--set-upstream']);
  }
  
  async diffSummary() {
    return this.git.diffSummary(['--staged']);
  }
  
  async switchBranch(branchName) {
    return this.git.checkout(branchName);
  }
  
  async createPullRequest(title, body) {
    // This is a placeholder - actual implementation would use GitHub/GitLab API
    console.log(`Would create PR: ${title}`);
    return { title, body, url: 'https://github.com/example/repo/pull/123' };
  }
}

module.exports = { GitTool };