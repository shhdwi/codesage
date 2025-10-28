export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface ChangedLine {
  newLineNumber: number;
  content: string;
  context: string; // surrounding lines for context
}

/**
 * Parse unified diff format (git diff)
 * Example: @@ -10,7 +10,6 @@ function example() {
 */
export function parseUnifiedDiff(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = patch.split('\n');
  
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      
      const oldStart = parseInt(hunkMatch[1]);
      const oldLines = hunkMatch[2] ? parseInt(hunkMatch[2]) : 1;
      const newStart = parseInt(hunkMatch[3]);
      const newLines = hunkMatch[4] ? parseInt(hunkMatch[4]) : 1;
      
      currentHunk = {
        oldStart,
        oldLines,
        newStart,
        newLines,
        lines: [],
      };
      
      oldLineNum = oldStart;
      newLineNum = newStart;
      continue;
    }

    if (!currentHunk) continue;

    // Parse diff lines
    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentHunk.lines.push({
        type: 'add',
        content: line.slice(1),
        newLineNumber: newLineNum++,
      });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentHunk.lines.push({
        type: 'delete',
        content: line.slice(1),
        oldLineNumber: oldLineNum++,
      });
    } else if (line.startsWith(' ')) {
      currentHunk.lines.push({
        type: 'context',
        content: line.slice(1),
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      });
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}

/**
 * Extract changed lines (added) with surrounding context
 */
export function selectChangedLines(hunks: DiffHunk[], contextLines: number = 3): ChangedLine[] {
  const changedLines: ChangedLine[] = [];

  for (const hunk of hunks) {
    const addedLines = hunk.lines.filter(l => l.type === 'add');
    
    for (const addedLine of addedLines) {
      if (!addedLine.newLineNumber) continue;

      // Get context: lines before and after
      const lineIndex = hunk.lines.indexOf(addedLine);
      const contextStart = Math.max(0, lineIndex - contextLines);
      const contextEnd = Math.min(hunk.lines.length, lineIndex + contextLines + 1);
      const contextArray = hunk.lines.slice(contextStart, contextEnd);
      
      const context = contextArray
        .map(l => l.content)
        .join('\n');

      changedLines.push({
        newLineNumber: addedLine.newLineNumber,
        content: addedLine.content,
        context,
      });
    }
  }

  return changedLines;
}

