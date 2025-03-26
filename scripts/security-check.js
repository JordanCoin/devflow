#!/usr/bin/env node

/**
 * This script performs security checks on the project:
 * 1. Verifies package integrity
 * 2. Checks for typosquatting in dependencies
 * 3. Identifies suspicious dependencies (malicious packages)
 * 4. Detects dependency confusion vulnerabilities
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const KNOWN_TYPOSQUATS = [
  { legit: 'lodash', typosquats: ['1odash', 'lodahs', 'loadsh'] },
  { legit: 'express', typosquats: ['expres', 'expresss', 'xpress'] },
  { legit: 'axios', typosquats: ['axious', 'axxios', '0xios'] },
  { legit: 'commander', typosquats: ['c0mmander', 'comander', 'communder'] },
  { legit: 'chalk', typosquats: ['cha1k', 'chal', 'ch4lk'] },
  { legit: 'inquirer', typosquats: ['inquier', 'inquierer', 'inquierr'] },
  { legit: 'dockerode', typosquats: ['dokerode', 'dock3rode', 'd0ckerode'] },
  { legit: 'dotenv', typosquats: ['dotend', 'dotenv-extended'] },
  { legit: 'ora', typosquats: ['oras', '0ra', 'oraa'] },
  { legit: 'yaml', typosquats: ['yamal', 'yamls', 'yeaml'] }
];

const MALICIOUS_PACKAGES = [
  'event-stream@4.0.0',
  'coa@2.0.3',
  'rc@1.2.9',
  '@npm/types',
  '@angular-devkit/build-optimizer@0.0.2',
  'electron-native-notify',
  'left-pad@2.0.0',
  'eslint-scope@3.7.2',
  'eslint-config-eslint@5.0.2',
  'create-react-app@5.0.2'
];

// Utility Functions
function calculateHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return hash;
}

function fetchNpmPackageData(packageName) {
  return new Promise((resolve, reject) => {
    const request = https.get(`https://registry.npmjs.org/${packageName}`, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', (error) => reject(error));
    request.end();
  });
}

// Security Checks
async function verifyPackageIntegrity() {
  console.log('🔍 Verifying package integrity...');
  try {
    // Check package.json and package-lock.json for consistency
    const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (fs.existsSync('package-lock.json')) {
      const pkgLockJson = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
      
      // Verify package-lock.json lockfileVersion
      if (pkgLockJson.lockfileVersion < 2) {
        console.warn('⚠️  Warning: Using outdated package-lock.json format. Consider upgrading to npm >=7.');
      }
      
      console.log('✅ Package lock file exists and is valid JSON.');
    } else {
      console.warn('⚠️  Warning: package-lock.json not found. It is recommended to commit this file for reproducible builds.');
    }
    
    // Check for integrity hashes in package-lock.json
    if (fs.existsSync('package-lock.json')) {
      const pkgLockJson = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
      let hasIntegrityChecks = false;
      
      if (pkgLockJson.packages) {
        hasIntegrityChecks = Object.values(pkgLockJson.packages).some(pkg => pkg && pkg.integrity);
      } else if (pkgLockJson.dependencies) {
        hasIntegrityChecks = Object.values(pkgLockJson.dependencies).some(dep => dep && dep.integrity);
      }
      
      if (!hasIntegrityChecks) {
        console.warn('⚠️  Warning: Package integrity checks not found in package-lock.json.');
      } else {
        console.log('✅ Package integrity checks are present in package-lock.json');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Package integrity verification failed:', error.message);
    return false;
  }
}

async function checkForTyposquatting() {
  console.log('🔍 Checking for typosquatting in dependencies...');
  try {
    const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...pkgJson.dependencies || {},
      ...pkgJson.devDependencies || {}
    };
    
    let potentialTyposquats = [];
    
    for (const dep of Object.keys(allDeps)) {
      // Check if the dependency name is similar to a known package
      for (const knownPkg of KNOWN_TYPOSQUATS) {
        if (knownPkg.typosquats.includes(dep)) {
          potentialTyposquats.push({
            suspicious: dep,
            legitimate: knownPkg.legit
          });
        }
      }
      
      // Levenshtein distance check for similar package names
      for (const knownPkg of KNOWN_TYPOSQUATS) {
        if (dep !== knownPkg.legit && levenshteinDistance(dep, knownPkg.legit) <= 2) {
          potentialTyposquats.push({
            suspicious: dep,
            legitimate: knownPkg.legit
          });
        }
      }
    }
    
    if (potentialTyposquats.length > 0) {
      console.warn('⚠️  Potential typosquatting detected:');
      potentialTyposquats.forEach(pkg => {
        console.warn(`   - ${pkg.suspicious} might be impersonating ${pkg.legitimate}`);
      });
    } else {
      console.log('✅ No typosquatting detected in dependencies.');
    }
    
    return potentialTyposquats.length === 0;
  } catch (error) {
    console.error('❌ Typosquatting check failed:', error.message);
    return false;
  }
}

async function checkForMaliciousPackages() {
  console.log('🔍 Checking for known malicious packages...');
  try {
    const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...pkgJson.dependencies || {},
      ...pkgJson.devDependencies || {}
    };
    
    let maliciousFound = [];
    
    for (const [dep, version] of Object.entries(allDeps)) {
      const depWithVersion = `${dep}@${version.replace(/^\^|~/, '')}`;
      if (MALICIOUS_PACKAGES.includes(dep) || MALICIOUS_PACKAGES.includes(depWithVersion)) {
        maliciousFound.push(depWithVersion);
      }
    }
    
    if (maliciousFound.length > 0) {
      console.error('❌ Known malicious packages detected:');
      maliciousFound.forEach(pkg => {
        console.error(`   - ${pkg}`);
      });
    } else {
      console.log('✅ No known malicious packages detected.');
    }
    
    return maliciousFound.length === 0;
  } catch (error) {
    console.error('❌ Malicious package check failed:', error.message);
    return false;
  }
}

async function checkForDependencyConfusion() {
  console.log('🔍 Checking for dependency confusion vulnerabilities...');
  try {
    const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...pkgJson.dependencies || {},
      ...pkgJson.devDependencies || {}
    };
    
    let vulnerableDeps = [];
    let recommendScoping = [];
    let hasNpmrc = fs.existsSync('.npmrc');
    let correctScopeConfig = false;
    
    // Check if .npmrc exists and has proper scope configuration
    if (hasNpmrc) {
      const npmrcContent = fs.readFileSync('.npmrc', 'utf8');
      correctScopeConfig = npmrcContent.includes('@jordanjackson:registry=');
      if (!correctScopeConfig) {
        console.warn('⚠️  .npmrc file exists but doesn\'t have proper scope configuration.');
        console.warn('   Consider adding: @jordanjackson:registry=https://npm.pkg.github.com/');
      }
    } else {
      console.warn('⚠️  No .npmrc file found. This is recommended for preventing dependency confusion attacks.');
    }
    
    // Check for package name proper scoping
    if (!pkgJson.name.startsWith('@')) {
      console.warn('⚠️  Package name is not scoped. Consider using a scoped name like @jordanjackson/devflow');
    }
    
    for (const dep of Object.keys(allDeps)) {
      if (dep.startsWith('@')) {
        // Skip checking for scoped packages as they're generally safer
        continue;
      }
      
      try {
        // Check if the package exists on npm
        const npmData = await fetchNpmPackageData(dep);
        
        // If package exists and is not maintained by expected maintainer, flag it
        if (npmData && npmData.maintainers && 
            !npmData.maintainers.some(m => m.name === pkgJson.author || m.email === pkgJson.author)) {
          
          // This is a legitimate public package, but we should consider scoping our own dependencies
          if (dep.indexOf('/') === -1) { // Not already scoped
            recommendScoping.push(dep);
          }
        }
      } catch (error) {
        // If package doesn't exist on npm, it might be internal/private
        // This is potentially vulnerable to dependency confusion
        if (error.message.includes('404')) {
          vulnerableDeps.push(dep);
        }
      }
    }
    
    if (vulnerableDeps.length > 0) {
      console.warn('⚠️  Potential dependency confusion vulnerabilities detected:');
      vulnerableDeps.forEach(pkg => {
        console.warn(`   - ${pkg} may be vulnerable to dependency confusion`);
      });
      console.warn('   Consider using scoped packages (@jordanjackson/package) for private dependencies.');
    } else {
      console.log('✅ No immediate dependency confusion vulnerabilities detected.');
    }
    
    if (recommendScoping.length > 0) {
      console.warn('⚠️  Consider scoping these dependencies for better security:');
      recommendScoping.forEach(pkg => {
        console.warn(`   - ${pkg} -> @jordanjackson/${pkg}`);
      });
    }
    
    if (!hasNpmrc || !correctScopeConfig) {
      console.log('ℹ️  RECOMMENDATION: Create or update .npmrc file to protect against dependency confusion.');
      return false;
    }
    
    return vulnerableDeps.length === 0;
  } catch (error) {
    console.error('❌ Dependency confusion check failed:', error.message);
    return false;
  }
}

// Helper Functions
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

// Run all checks
async function runAllChecks() {
  try {
    console.log('🔒 Running security checks...');
    
    const integrityOk = await verifyPackageIntegrity();
    const typosquattingOk = await checkForTyposquatting();
    const maliciousOk = await checkForMaliciousPackages();
    const confusionOk = await checkForDependencyConfusion();
    
    console.log('\n📊 Security Check Results:');
    console.log(`   Package Integrity:    ${integrityOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Typosquatting:        ${typosquattingOk ? '✅ PASS' : '⚠️ WARNING'}`);
    console.log(`   Malicious Packages:   ${maliciousOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Dependency Confusion: ${confusionOk ? '✅ PASS' : '⚠️ WARNING'}`);
    
    const overallResult = integrityOk && maliciousOk && (typosquattingOk || confusionOk);
    console.log(`\n🏁 Overall Result: ${overallResult ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!overallResult) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Security check failed:', error.message);
    process.exit(1);
  }
}

// Execute all security checks
runAllChecks(); 