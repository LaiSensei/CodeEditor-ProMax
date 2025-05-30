// List of potentially dangerous patterns to check for
export const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /Function\s*\(/i,
  /setTimeout\s*\(/i,
  /setInterval\s*\(/i,
  /new\s+Function/i,
  /document\./i,
  /window\./i,
  /localStorage\./i,
  /sessionStorage\./i,
  /indexedDB\./i,
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /WebSocket/i,
  /Worker/i,
  /import\s*\(/i,
  /require\s*\(/i,
  /process\./i,
  /__dirname/i,
  /__filename/i,
  /global\./i,
  /module\./i,
  /exports\./i
]

export function isCodeSafe(code: string): boolean {
  return !DANGEROUS_PATTERNS.some(pattern => pattern.test(code));
}

export interface SanitizationResult {
  isValid: boolean
  sanitizedCode: string
  errors: string[]
}

export const sanitizeCode = (code: string, language: string): SanitizationResult => {
  const errors: string[] = []
  let sanitizedCode = code

  // Check for dangerous patterns
  DANGEROUS_PATTERNS.forEach(pattern => {
    if (pattern.test(code)) {
      errors.push(`Potentially dangerous pattern detected: ${pattern.toString()}`)
    }
  })

  // Language-specific sanitization
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript':
      // Remove any import statements
      sanitizedCode = sanitizedCode.replace(/import\s+.*?from\s+['"].*?['"]/g, '')
      // Remove any require statements
      sanitizedCode = sanitizedCode.replace(/require\s*\(['"].*?['"]\)/g, '')
      break

    case 'python':
      // Remove any import statements except for allowed modules
      const allowedPythonImports = ['math', 'random', 'datetime', 'collections']
      sanitizedCode = sanitizedCode.replace(
        /import\s+([a-zA-Z0-9_]+)/g,
        (match, module) => {
          if (!allowedPythonImports.includes(module)) {
            errors.push(`Import of module '${module}' is not allowed`)
            return ''
          }
          return match
        }
      )
      break

    case 'java':
      // Remove any import statements except for allowed packages
      const allowedJavaImports = ['java.util', 'java.lang', 'java.math']
      sanitizedCode = sanitizedCode.replace(
        /import\s+([a-zA-Z0-9_.]+);/g,
        (match, pkg) => {
          if (!allowedJavaImports.some(allowed => pkg.startsWith(allowed))) {
            errors.push(`Import of package '${pkg}' is not allowed`)
            return ''
          }
          return match
        }
      )
      break

    case 'cpp':
      // Remove any include statements except for allowed headers
      const allowedCppHeaders = ['iostream', 'string', 'vector', 'algorithm']
      sanitizedCode = sanitizedCode.replace(
        /#include\s+[<"]([^>"]+)[>"]/g,
        (match, header) => {
          if (!allowedCppHeaders.includes(header)) {
            errors.push(`Include of header '${header}' is not allowed`)
            return ''
          }
          return match
        }
      )
      break
  }

  // Remove any comments that might contain malicious code
  sanitizedCode = sanitizedCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')

  // Remove any empty lines
  sanitizedCode = sanitizedCode.replace(/^\s*[\r\n]/gm, '')

  return {
    isValid: errors.length === 0,
    sanitizedCode,
    errors
  }
} 