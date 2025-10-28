import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff, selectChangedLines } from '@/server/diff';

describe('diff parser', () => {
  it('should parse unified diff hunks', () => {
    const patch = `@@ -10,7 +10,6 @@ function example() {
 const a = 1;
 const b = 2;
-const c = 3;
+const c = 4;
 const d = 5;`;

    const hunks = parseUnifiedDiff(patch);
    
    expect(hunks).toHaveLength(1);
    expect(hunks[0].oldStart).toBe(10);
    expect(hunks[0].newStart).toBe(10);
    expect(hunks[0].lines.length).toBeGreaterThan(0);
  });

  it('should identify added lines', () => {
    const patch = `@@ -1,3 +1,4 @@
 const a = 1;
+const b = 2;
 const c = 3;`;

    const hunks = parseUnifiedDiff(patch);
    const changedLines = selectChangedLines(hunks);
    
    expect(changedLines.length).toBeGreaterThan(0);
    expect(changedLines[0].content).toContain('const b = 2');
    expect(changedLines[0].newLineNumber).toBe(2);
  });

  it('should provide context around changed lines', () => {
    const patch = `@@ -1,5 +1,6 @@
 const a = 1;
 const b = 2;
+const c = 3;
 const d = 4;
 const e = 5;`;

    const hunks = parseUnifiedDiff(patch);
    const changedLines = selectChangedLines(hunks, 2);
    
    expect(changedLines[0].context).toBeTruthy();
    expect(changedLines[0].context).toContain('const a = 1');
    expect(changedLines[0].context).toContain('const d = 4');
  });

  it('should handle multiple hunks', () => {
    const patch = `@@ -1,3 +1,4 @@
 const a = 1;
+const b = 2;
 const c = 3;
@@ -10,3 +11,4 @@
 const x = 10;
+const y = 11;
 const z = 12;`;

    const hunks = parseUnifiedDiff(patch);
    expect(hunks).toHaveLength(2);
    
    const changedLines = selectChangedLines(hunks);
    expect(changedLines.length).toBe(2);
  });

  it('should handle empty patches', () => {
    const hunks = parseUnifiedDiff('');
    expect(hunks).toHaveLength(0);
    
    const changedLines = selectChangedLines(hunks);
    expect(changedLines).toHaveLength(0);
  });
});

