#!/usr/bin/env node

/**
 * This script tests GitHub workflows locally using act
 * (https://github.com/nektos/act)
 * 
 * Prerequisites:
 * - Docker installed and running
 * - act installed (brew install act or https://github.com/nektos/act#installation)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

// Check if act is installed
function checkActInstalled() {
  try {
    execSync('act --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if Docker is running
function checkDockerRunning() {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Find all workflow files
function findWorkflows() {
  const workflowDir = path.join(process.cwd(), '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) {
    return [];
  }
  
  return fs.readdirSync(workflowDir)
    .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map(file => path.join(workflowDir, file));
}

// Parse workflow to get job names
function parseWorkflowJobs(workflowPath) {
  const content = fs.readFileSync(workflowPath, 'utf8');
  const jobs = [];
  
  // Simple regex to find job names (this is a basic implementation)
  const jobMatches = content.match(/^\s*(\w+):\s*$/gm);
  if (jobMatches) {
    jobMatches.forEach(match => {
      const job = match.trim().replace(':', '');
      // Skip the "on" and "jobs" sections
      if (job !== 'on' && job !== 'jobs') {
        jobs.push(job);
      }
    });
  }
  
  return jobs;
}

// Run act for a specific workflow
function runActOnWorkflow(workflowFile, job = null) {
  return new Promise((resolve, reject) => {
    const workflowName = path.basename(workflowFile);
    console.log(`\n=== Testing workflow: ${workflowName} ${job ? `(job: ${job})` : ''} ===`);
    
    const args = [];
    // Add specific job if provided
    if (job) {
      args.push('--job', job);
    }
    
    // Add the workflow file
    args.push('--workflows', workflowFile);
    
    // Add secrets from .env file if it exists
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      console.log('Using secrets from .env file');
      args.push('--secret-file', envPath);
    }
    
    // Add verbose output
    args.push('--verbose');
    
    console.log(`Running: act ${args.join(' ')}`);
    
    const actProcess = spawn('act', args, {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let output = '';
    
    actProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      process.stdout.write(chunk);
      output += chunk;
    });
    
    actProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      process.stderr.write(chunk);
      output += chunk;
    });
    
    actProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Workflow ${workflowName} ${job ? `(job: ${job})` : ''} passed`);
        resolve({ success: true, output });
      } else {
        console.error(`\n❌ Workflow ${workflowName} ${job ? `(job: ${job})` : ''} failed with code ${code}`);
        resolve({ success: false, output });
      }
    });
    
    actProcess.on('error', (err) => {
      console.error(`Failed to run act: ${err.message}`);
      reject(err);
    });
  });
}

// Interactive CLI
async function promptForWorkflow(workflows) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log('\nAvailable workflows:');
    workflows.forEach((workflow, index) => {
      console.log(`${index + 1}. ${path.basename(workflow)}`);
    });
    console.log('0. Run all workflows');
    
    rl.question('\nSelect a workflow to test (0-' + workflows.length + '): ', (answer) => {
      rl.close();
      const selection = parseInt(answer.trim(), 10);
      
      if (isNaN(selection) || selection < 0 || selection > workflows.length) {
        console.error('Invalid selection. Exiting.');
        process.exit(1);
      }
      
      resolve(selection === 0 ? null : workflows[selection - 1]);
    });
  });
}

async function promptForJob(workflowPath) {
  const jobs = parseWorkflowJobs(workflowPath);
  
  if (jobs.length === 0) {
    console.log('No jobs found in the workflow file.');
    return null;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log('\nAvailable jobs:');
    jobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job}`);
    });
    console.log('0. Run all jobs');
    
    rl.question('\nSelect a job to test (0-' + jobs.length + '): ', (answer) => {
      rl.close();
      const selection = parseInt(answer.trim(), 10);
      
      if (isNaN(selection) || selection < 0 || selection > jobs.length) {
        console.error('Invalid selection. Exiting.');
        process.exit(1);
      }
      
      resolve(selection === 0 ? null : jobs[selection - 1]);
    });
  });
}

// Main function
async function main() {
  console.log('GitHub Actions Workflow Tester');
  console.log('==============================');
  
  // Check prerequisites
  if (!checkActInstalled()) {
    console.error('Error: "act" is not installed. Please install it first:');
    console.error('  brew install act (macOS)');
    console.error('  or visit https://github.com/nektos/act#installation');
    process.exit(1);
  }
  
  if (!checkDockerRunning()) {
    console.error('Error: Docker is not running. Please start Docker and try again.');
    process.exit(1);
  }
  
  // Find all workflows
  const workflows = findWorkflows();
  if (workflows.length === 0) {
    console.error('No workflow files found in the .github/workflows directory.');
    process.exit(1);
  }
  
  // Interactive mode
  const selectedWorkflow = await promptForWorkflow(workflows);
  
  // If all workflows selected
  if (!selectedWorkflow) {
    console.log('\nRunning all workflows...');
    for (const workflow of workflows) {
      await runActOnWorkflow(workflow);
    }
  } else {
    // Prompt for job
    const selectedJob = await promptForJob(selectedWorkflow);
    await runActOnWorkflow(selectedWorkflow, selectedJob);
  }
  
  console.log('\nAll tests completed!');
}

// Run the script
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}); 