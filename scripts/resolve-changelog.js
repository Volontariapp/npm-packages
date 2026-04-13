#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

/**
 * resolve-changelog.js
 *
 * This script identifies multiple version headers added to a CHANGELOG.md file
 * and collapses them into a single (highest) version header, merging the content.
 * This avoids multiple version bumps for the same package in a single PR
 * caused by cascading dependency updates.
 */

const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

// Determine base branch for comparison
let baseSha = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main';

try {
  execSync(`git rev-parse ${baseSha}`, { stdio: 'ignore' });
} catch (e) {
  try {
    execSync('git rev-parse main', { stdio: 'ignore' });
    baseSha = 'main';
  } catch (e2) {
    // If we can't find main, use HEAD~1 as a fallback for local commits
    baseSha = 'HEAD~1';
  }
}

console.log(`[resolve-changelog] Comparing against ${baseSha}`);

files.forEach((file) => {
  if (!file.endsWith('CHANGELOG.md')) return;
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;

  const currentContent = fs.readFileSync(fullPath, 'utf8');
  let baseContent = '';
  try {
    // Get the version of the file in the base branch
    baseContent = execSync(`git show ${baseSha}:${file}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch (e) {
    // Likely a new file or doesn't exist in base branch, nothing to collapse
    return;
  }

  // Find the first version header in the base file
  const baseLines = baseContent.split('\n');
  const firstBaseHeader = baseLines.find((line) => line.startsWith('## '));

  if (!firstBaseHeader) {
    // No headers in base file? Just exit.
    return;
  }

  // Find where this header appears in the current content
  const firstBaseHeaderIndex = currentContent.indexOf(firstBaseHeader);
  if (firstBaseHeaderIndex === -1) {
    // Header not found in current content? The file might have been heavily modified.
    return;
  }

  // The "new" section is everything from the beginning to the first header that was already in main
  const newSection = currentContent.substring(0, firstBaseHeaderIndex);
  const oldSection = currentContent.substring(firstBaseHeaderIndex);

  // Parse all version headers in the new section
  const versionRegex = /^## (\d+\.\d+\.\d+)/gm;
  const versions = [];
  let match;
  while ((match = versionRegex.exec(newSection)) !== null) {
    versions.push({
      version: match[1],
      index: match.index,
      fullMatch: match[0],
      fullLength: match[0].length,
    });
  }

  // If there's 0 or 1 version, no need to collapse
  if (versions.length <= 1) return;

  const firstNewHeaderIndex = versions[0].index;
  const prefix = newSection.substring(0, firstNewHeaderIndex);

  console.log(
    `[resolve-changelog] Found ${versions.length} consecutive versions in ${file}. Merging into one...`,
  );

  // Sort versions to find the highest
  const sortedVersions = [...versions].sort((a, b) => {
    const va = a.version.split('.').map(Number);
    const vb = b.version.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (va[i] !== vb[i]) return vb[i] - va[i];
    }
    return 0;
  });

  const highestVersion = sortedVersions[0].version;

  // Extract content parts between headers
  const contentParts = [];
  for (let i = 0; i < versions.length; i++) {
    const start = versions[i].index + versions[i].fullLength;
    const end = i + 1 < versions.length ? versions[i + 1].index : newSection.length;
    contentParts.push(newSection.substring(start, end).trim());
  }

  // Group content by sub-headers (e.g., ### Patch Changes)
  const mergedContentMap = new Map();
  contentParts.forEach((part) => {
    const lines = part.split('\n');
    let currentSubHeader = 'Default';
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        currentSubHeader = trimmed;
        if (!mergedContentMap.has(currentSubHeader)) mergedContentMap.set(currentSubHeader, []);
      } else if (trimmed) {
        if (!mergedContentMap.has(currentSubHeader)) mergedContentMap.set(currentSubHeader, []);
        // Check for duplicates to avoid repeating the same change
        if (!mergedContentMap.get(currentSubHeader).includes(line)) {
          mergedContentMap.get(currentSubHeader).push(line);
        }
      }
    });
  });

  // Reconstruct the new section
  let resolvedNewSection = prefix;
  resolvedNewSection += `## ${highestVersion}\n\n`;

  const standardOrder = ['### Major Changes', '### Minor Changes', '### Patch Changes'];
  const handledHeaders = new Set();

  standardOrder.forEach((h) => {
    if (mergedContentMap.has(h)) {
      resolvedNewSection += `${h}\n\n`;
      resolvedNewSection += mergedContentMap.get(h).join('\n') + '\n\n';
      handledHeaders.add(h);
    }
  });

  mergedContentMap.forEach((lines, h) => {
    if (!handledHeaders.has(h) && h !== 'Default') {
      resolvedNewSection += `${h}\n\n`;
      resolvedNewSection += lines.join('\n') + '\n\n';
    }
  });

  if (mergedContentMap.has('Default')) {
    resolvedNewSection += mergedContentMap.get('Default').join('\n') + '\n\n';
  }

  // Write the file back
  fs.writeFileSync(fullPath, resolvedNewSection + oldSection);

  console.log(`[resolve-changelog] Successfully resolved ${file} to version ${highestVersion}`);
});
