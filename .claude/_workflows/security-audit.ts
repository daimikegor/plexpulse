export const meta = {
  name: 'plexpulse-security-audit',
  description: 'Comprehensive security audit of PlexPulse app',
  phases: [
    { title: 'Discovery', detail: 'Map attack surfaces and identify all relevant files' },
    { title: 'Deep Review', detail: 'Parallel deep audits per subsystem' },
    { title: 'Verify & Synthesize', detail: 'Adversarial verification of findings' },
  ],
};

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          category: { type: 'string' },
          description: { type: 'string' },
          remediation: { type: 'string' },
        },
        required: ['file', 'severity', 'description', 'remediation'],
      },
    },
  },
  required: ['findings'],
};

const FILES_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      category: { type: 'string', enum: ['auth', 'input', 'secret', 'api', 'integrity'] },
      notes: { type: 'string' },
    },
    required: ['path', 'category', 'notes'],
  },
};

phase('Discovery')

const DIRS = [
  '/home/mike/Desktop/plexpulse/app/api',
  '/home/mike/Desktop/plexpulse/lib',
  '/home/mike/Desktop/plexpulse/components',
]

const ALL_FILES = await pipeline(
  DIRS,
  function(dir) {
    return agent(
      'List all files in ' + dir + ' and note any that handle auth, user input, secrets, or external API calls. Return as JSON array matching this schema: [{"path": "...", "category": "auth|input|secret|api|integrity", "notes": "..."}]. Only include files with at least one category match.',
      { phase: 'Discovery', schema: FILES_SCHEMA }
    )
  }
)

const TARGET_FILES = ALL_FILES.flat().filter(Boolean)
log('Found ' + TARGET_FILES.length + ' files across all attack surfaces')

var AUTH_FILES = ''
var INPUT_FILES = ''
var API_FILES = ''
var SECRET_FILES = ''
TARGET_FILES.forEach(function(f) {
  var line = '  - ' + f.path
  if (f.category === 'auth') AUTH_FILES += line + '\n'
  if (f.category === 'input') INPUT_FILES += line + '\n'
  if (f.category === 'api') API_FILES += line + '\n'
  if (f.category === 'secret') SECRET_FILES += line + '\n'
})

if (!AUTH_FILES) AUTH_FILES = '(none found)'
if (!INPUT_FILES) INPUT_FILES = '(none found)'
if (!API_FILES) API_FILES = '(none found)'
if (!SECRET_FILES) SECRET_FILES = '(none found)'

phase('Deep Review')

var AUTH_AUDIT
try {
  AUTH_AUDIT = await agent(
    'SECURITY AUDIT - Authentication and Session Management\n\nReview these files for security vulnerabilities. Check for:\n- Hardcoded secrets or keys in source code (not env vars)\n- NEXT_PUBLIC_ prefixed secrets leaking to client bundle\n- Missing or bypassable auth checks on API routes\n- Session fixation/rotation vulnerabilities\n- Cookie security issues (Secure, SameSite, HttpOnly flags)\n- Token storage and transmission issues\n- OAuth flow integrity (redirect URI validation, state parameter)\n- POST/CORS misconfigurations\n- Missing CSRF protection on state-changing endpoints\n- Auth exit paths (logout/cleanup) gaps\n- Redis session store vs in-memory inconsistencies\n- Race conditions between token generation and validation\n\nFiles to review:\n' + AUTH_FILES + '\n\nReturn findings as JSON matching this schema: {"findings": [{"file": "path", "line": 42, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "auth", "description": "...", "remediation": "..."}]}',
    { phase: 'Deep Review', schema: FINDINGS_SCHEMA }
  )
} catch(e) { log('AUTH_AUDIT error: ' + e.message) }

var INPUT_AUDIT
try {
  INPUT_AUDIT = await agent(
    'SECURITY AUDIT - Input Validation and Injection Vectors\n\nReview these files for injection vulnerabilities. Check for:\n- XSS vectors (unsanitized user input rendered with dangerouslySetInnerHTML, innerHTML)\n- SQL/SQLite injection via raw queries or Drizzle misuse\n- URL/redirect URL validation on auth redirects and links\n- Path traversal in file operations or dynamic imports\n- Command injection via child_process or shell commands\n- Template literal injection in strings sent to external APIs\n- Client-side URL construction from untrusted parameters\n- Sanitization gaps in search input, form data, query params\n- Content-Security-Policy headers (or lack thereof)\n- Helmet/security headers configuration\n\nFiles to review:\n' + INPUT_FILES + '\n\nReturn findings as JSON matching this schema: {"findings": [{"file": "path", "line": 42, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "input", "description": "...", "remediation": "..."}]}',
    { phase: 'Deep Review', schema: FINDINGS_SCHEMA }
  )
} catch(e) { log('INPUT_AUDIT error: ' + e.message) }

var API_AUDIT
try {
  API_AUDIT = await agent(
    'SECURITY AUDIT - External API Calls and Data Integrity\n\nReview these files for API security issues. Check for:\n- Missing rate limiting on external API calls (TMDB, Plex, Radarr/Sonarr)\n- Secret key leakage in logs, URLs, or error messages\n- SSL/TLS certificate validation gaps\n- Request smuggling or parameter pollution\n- Insufficient response validation (trusting external API responses)\n- Insecure direct object references (IDOR) on media endpoints\n- Missing auth on TMDB cache write/read endpoints\n- Rate limiting bypass via session/token manipulation\n- Cache poisoning via user-controlled query parameters\n- Overly permissive CORS on internal endpoints\n\nFiles to review:\n' + API_FILES + '\n\nReturn findings as JSON matching this schema: {"findings": [{"file": "path", "line": 42, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "api", "description": "...", "remediation": "..."}]}',
    { phase: 'Deep Review', schema: FINDINGS_SCHEMA }
  )
} catch(e) { log('API_AUDIT error: ' + e.message) }

var INTEGRITY_AUDIT
try {
  INTEGRITY_AUDIT = await agent(
    'SECURITY AUDIT - Configuration and Infrastructure Security\n\nReview these files for infrastructure security issues. Check for:\n- Docker Compose / deployment misconfigurations\n- Sensitive env vars in .env.example or documentation\n- Missing Redis auth in production config\n- Default credentials or weak passwords\n- Insecure Redis configuration (bind 0.0.0.0, no password)\n- Database file permissions and backup exposure\n- TLS/HTTPS enforcement gaps\n- Logging of sensitive data (tokens, passwords, keys)\n- Missing error boundaries that could leak stack traces\n- Development-only code in production builds\n- Outdated dependencies with known CVEs\n\nFiles to review:\n' + SECRET_FILES + '\nAlso review: docker-compose.yml, Dockerfile, .env.example, package.json\n\nReturn findings as JSON matching this schema: {"findings": [{"file": "path", "line": 42, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "config", "description": "...", "remediation": "..."}]}',
    { phase: 'Deep Review', schema: FINDINGS_SCHEMA }
  )
} catch(e) { log('INTEGRITY_AUDIT error: ' + e.message) }

var ROUTE_AUDIT
try {
  ROUTE_AUDIT = await agent(
    'SECURITY AUDIT - All API Route Handlers (Next.js App Router)\n\nExamine ALL files under /home/mike/Desktop/plexpulse/app/api/**/*.ts for each route handler. Check for:\n1. POST/PUT/PATCH without any auth check?\n2. Origin/referer validation missing on state-changing requests?\n3. Request body validated before being used anywhere (DB, external API)?\n4. Errors exposing sensitive internals in the response?\n5. Content-type checking to prevent JSON injection?\n6. Proper handling of unauthenticated access attempts?\n\nReturn findings as JSON matching this schema: {"findings": [{"file": "path", "line": 42, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "route", "description": "...", "remediation": "..."}]}',
    { phase: 'Deep Review', schema: FINDINGS_SCHEMA }
  )
} catch(e) { log('ROUTE_AUDIT error: ' + e.message) }

var CLIENT_AUDIT
try {
  CLIENT_AUDIT = await agent(
    'SECURITY AUDIT - Client-Side Code (React Components)\n\nExamine ALL files under /home/mike/Desktop/plexpulse/components/ and client-side code in /home/mike/Desktop/plexpulse/app/** for:\n1. dangerouslySetInnerHTML with user-controlled content?\n2. localStorage/sessionStorage storing sensitive data (tokens, session IDs)?\n3. Client-side URLs built from untrusted parameters?\n4. Inline event handlers or unsafe HTML?\n5. Missing Content-Security-Policy concerns in meta tags?\n6. Console logs of sensitive data in production builds?\n\nReturn findings as JSON matching this schema: {"findings": [{"file": "path", "line": 42, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "client", "description": "...", "remediation": "..."}]}',
    { phase: 'Deep Review', schema: FINDINGS_SCHEMA }
  )
} catch(e) { log('CLIENT_AUDIT error: ' + e.message) }

log('All deep reviews complete, compiling report...')

var ALL_FINDINGS = []
[AUTH_AUDIT, INPUT_AUDIT, API_AUDIT, INTEGRITY_AUDIT, ROUTE_AUDIT, CLIENT_AUDIT].forEach(function(f) {
  if (f && f.findings) {
    f.findings.forEach(function(finding) { ALL_FINDINGS.push(finding) })
  }
})

log('Collected ' + ALL_FINDINGS.length + ' preliminary findings')

var REPORT
try {
  REPORT = await agent(
    'You have collected security audit findings from a PlexPulse Next.js application (self-hosted media discovery app using TMDB, Plex OAuth, Radarr/Sonarr).\n\nHere are all findings:\n' + JSON.stringify(ALL_FINDINGS, null, 2) + '\n\nTASKS:\n1. Deduplicate findings (same root cause reported multiple ways)\n2. Rate severity: CRITICAL/HIGH/MEDIUM/LOW\n3. For each finding provide: title, file path, line range, description, severity, remediation\n4. Note any high-risk missing checks that were NOT found but should have been checked\n5. Prioritize by exploitability (what can be attacked remotely first)\n\nReturn as a structured markdown security audit report with executive summary, findings table, and detailed per-finding sections.',
    { phase: 'Verify & Synthesize' }
  )
} catch(e) { log('REPORT error: ' + e.message) }

log('Audit complete')
