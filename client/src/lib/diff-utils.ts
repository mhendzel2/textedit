import { Change } from "@shared/schema";

export interface DiffLine {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  originalIndex?: number;
  modifiedIndex?: number;
  content: string;
  originalContent?: string;
}

export function generateDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const diff: DiffLine[] = [];

  // Simple line-by-line diff implementation
  let originalIndex = 0;
  let modifiedIndex = 0;

  while (originalIndex < originalLines.length || modifiedIndex < modifiedLines.length) {
    const originalLine = originalLines[originalIndex];
    const modifiedLine = modifiedLines[modifiedIndex];

    if (originalIndex >= originalLines.length) {
      // Only modified lines left - insertions
      diff.push({
        type: 'insert',
        modifiedIndex,
        content: modifiedLine,
      });
      modifiedIndex++;
    } else if (modifiedIndex >= modifiedLines.length) {
      // Only original lines left - deletions
      diff.push({
        type: 'delete',
        originalIndex,
        content: originalLine,
      });
      originalIndex++;
    } else if (originalLine === modifiedLine) {
      // Lines are equal
      diff.push({
        type: 'equal',
        originalIndex,
        modifiedIndex,
        content: originalLine,
      });
      originalIndex++;
      modifiedIndex++;
    } else {
      // Lines are different - check if it's a replacement or separate insert/delete
      const nextOriginalLine = originalLines[originalIndex + 1];
      const nextModifiedLine = modifiedLines[modifiedIndex + 1];

      if (nextOriginalLine === modifiedLine) {
        // Current original line was deleted
        diff.push({
          type: 'delete',
          originalIndex,
          content: originalLine,
        });
        originalIndex++;
      } else if (nextModifiedLine === originalLine) {
        // Current modified line was inserted
        diff.push({
          type: 'insert',
          modifiedIndex,
          content: modifiedLine,
        });
        modifiedIndex++;
      } else {
        // Lines were replaced
        diff.push({
          type: 'replace',
          originalIndex,
          modifiedIndex,
          content: modifiedLine,
          originalContent: originalLine,
        });
        originalIndex++;
        modifiedIndex++;
      }
    }
  }

  return diff;
}

export function diffToChanges(diff: DiffLine[]): Change[] {
  const changes: Change[] = [];
  let changeId = 1;

  diff.forEach((line) => {
    if (line.type !== 'equal') {
      let changeType: 'addition' | 'deletion' | 'modification';
      let lineNumber: number;

      switch (line.type) {
        case 'insert':
          changeType = 'addition';
          lineNumber = (line.modifiedIndex || 0) + 1;
          break;
        case 'delete':
          changeType = 'deletion';
          lineNumber = (line.originalIndex || 0) + 1;
          break;
        case 'replace':
          changeType = 'modification';
          lineNumber = (line.modifiedIndex || 0) + 1;
          break;
        default:
          return;
      }

      changes.push({
        id: String(changeId++),
        type: changeType,
        lineNumber,
        content: line.content,
        originalContent: line.originalContent,
        status: 'pending',
      });
    }
  });

  return changes;
}

export function applyChanges(content: string, changes: Change[]): string {
  const lines = content.split('\n');
  const acceptedChanges = changes.filter(change => change.status === 'accepted');
  const rejectedChanges = changes.filter(change => change.status === 'rejected');

  // Apply accepted changes and remove rejected ones
  acceptedChanges.forEach(change => {
    const lineIndex = change.lineNumber - 1;
    if (change.type === 'deletion') {
      // Remove the line
      lines.splice(lineIndex, 1);
    }
  });

  rejectedChanges.forEach(change => {
    const lineIndex = change.lineNumber - 1;
    if (change.type === 'addition') {
      // Remove the added line
      lines.splice(lineIndex, 1);
    } else if (change.type === 'modification' && change.originalContent) {
      // Restore original content
      lines[lineIndex] = change.originalContent;
    }
  });

  return lines.join('\n');
}
