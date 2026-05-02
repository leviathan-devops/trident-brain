# Code Review Mode — Layer 3: Security Analysis

**Layer:** 3 of 5  
**Question:** "What vulnerabilities exist?"  

---

## Purpose

Layer 3 performs **security vulnerability detection** — identifying patterns that could lead to injection attacks, secret exposure, or other security issues.

## Outputs

| Output | Description |
|--------|-------------|
| `sqlInjection` | SQL injection vectors |
| `xssVectors` | Cross-site scripting risks |
| `commandInjection` | OS command injection |
| `evalUsage` | Dangerous eval patterns |
| `hardcodedSecrets` | API keys, passwords |
| `pathTraversal` | Path traversal risks |

## Detectors (6)

### SQLInjectionDetector
Finds SQL string concatenation.

**Patterns:**
```typescript
/['"`].*?SELECT.*?\+.*?['"`]/i,
/['"`].*?INSERT.*?\+.*?['"`]/i,
/['"`].*?UPDATE.*?\+.*?['"`]/i,
/['"`].*?DELETE.*?\+.*?['"`]/i,
/query\s*\(\s*['"`].*?\+/,
/execute\s*\(\s*['"`].*?\+/,
```

**Severity:** BLOCKER  
**Evidence:** `query = "SELECT * FROM " + table`

### XSSDetector
Finds XSS vulnerability patterns.

**Patterns:**
```typescript
/\.innerHTML\s*=/,
/document\.write\s*\(/,
/dangerouslySetInnerHTML\s*=/,
/v-html\s*=/,
/\.outerHTML\s*=/,
```

**Severity:** BLOCKER  
**Evidence:** `element.innerHTML = userInput`

### CommandInjectionDetector
Finds OS command injection.

**Patterns:**
```typescript
/exec\s*\(\s*`/,
/exec\s*\(\s*['"].*?\+/,
/spawn\s*\(\s*['"].*?\+/,
/execFile\s*\(\s*['"].*?\+/,
/\$ \(.*?\)/,  // shell expansion
```

**Severity:** BLOCKER  
**Evidence:** `exec("rm -rf " + userInput)`

### EvalUsageDetector
Finds dangerous dynamic code execution.

**Patterns:**
```typescript
/eval\s*\(/,
/new\s+Function\s*\(/,
/Function\s*\(\s*['"`]/,
/setTimeout\s*\(\s*['"`].*?['"`]\s*,/,
/setInterval\s*\(\s*['"`].*?['"`]\s*,/,
```

**Severity:** BLOCKER  
**Evidence:** `eval(userInput)`

### HardcodedSecretDetector
Finds hardcoded credentials.

**Patterns:**
```typescript
/api[_-]?key\s*[=:]\s*['"][a-zA-Z0-9]{20,}/i,
/password\s*[=:]\s*['"][^'"]{8,}/i,
/secret[_-]?key\s*[=:]\s*['"][a-zA-Z0-9]{20,}/i,
/token\s*[=:]\s*['"][a-zA-Z0-9_-]{20,}/i,
/private[_-]?key\s*[=:]\s*['"]-----BEGIN/i,
/AWS[_-]?SECRET/i,
```

**Severity:** BLOCKER  
**Evidence:** `const apiKey = "sk-1234567890abcdef..."`

### PathTraversalDetector
Finds path traversal risks.

**Patterns:**
```typescript
/readFile\s*\(\s*req\.params/,
/readFile\s*\(\s*userInput/,
/join\s*\(\s*basePath\s*,\s*userInput/,
/fs\.readFileSync\s*\(\s*path\.join.*userInput/,
```

**Severity:** WARNING  
**Evidence:** `readFile(req.body.filename)`

---

## Template

```markdown
## LAYER 3: SECURITY ANALYSIS

### SQL Injection Vectors
| Severity | File | Line | Evidence |
|----------|------|------|----------|
| BLOCKER | {file} | {n} | `query = "SELECT * FROM " + table` |

### XSS Vectors
| Severity | File | Line | Evidence |
|----------|------|------|----------|
| BLOCKER | {file} | {n} | `element.innerHTML = userInput` |

### Command Injection
| Severity | File | Line | Evidence |
|----------|------|------|----------|
| BLOCKER | {file} | {n} | `exec("rm -rf " + userInput)` |

### Dangerous Eval Usage
| Severity | File | Line | Evidence |
|----------|------|------|----------|
| BLOCKER | {file} | {n} | `eval(userInput)` |

### Hardcoded Secrets
| Severity | File | Line | Evidence |
|----------|------|------|----------|
| BLOCKER | {file} | {n} | `apiKey = "sk-1234..."` |

### Path Traversal Risks
| Severity | File | Line | Evidence |
|----------|------|------|----------|
| WARNING | {file} | {n} | `readFile(req.body.filename)` |

### Security Assessment
- **Critical (BLOCKER):** {n}
- **High (WARNING):** {n}
- **Total Vulnerabilities:** {n}
```

---

## Gate Criteria

To advance to Layer 4, MUST have:
- [ ] No BLOCKER vulnerabilities
- [ ] All WARNING vulnerabilities documented
- [ ] No eval() usage
- [ ] No hardcoded secrets

## Next Layer

**Layer 4:** Architecture Analysis — "How do components interact?"
