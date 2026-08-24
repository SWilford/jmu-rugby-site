import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const workflowsDirectory = path.join(projectRoot, '.github', 'workflows')

async function readProjectFile(...segments) {
  return readFile(path.join(projectRoot, ...segments), 'utf8')
}

test('GitHub Actions use explicit permissions and immutable action revisions', async () => {
  const workflowFiles = (await readdir(workflowsDirectory))
    .filter((filename) => filename.endsWith('.yml'))
    .sort()

  assert.deepEqual(workflowFiles, [
    'ci.yml',
    'codeql.yml',
    'dependency-review.yml',
    'nightly.yml',
  ])

  for (const workflowFile of workflowFiles) {
    const workflow = await readProjectFile(
      '.github',
      'workflows',
      workflowFile,
    )

    assert.match(workflow, /permissions:\r?\n  contents: read/)
    assert.doesNotMatch(workflow, /pull_request_target:/)

    const actionReferences = [...workflow.matchAll(/uses:\s*([^\s#]+)/g)].map(
      (match) => match[1],
    )

    for (const actionReference of actionReferences) {
      assert.match(
        actionReference,
        /^[^@\s]+@[0-9a-f]{40}$/,
        `${workflowFile} contains a mutable action reference: ${actionReference}`,
      )
    }
  }
})

test('repository security automation and private reporting guidance are present', async () => {
  const dependabot = await readProjectFile('.github', 'dependabot.yml')
  const securityPolicy = await readProjectFile('SECURITY.md')
  const dependencyReview = await readProjectFile(
    '.github',
    'workflows',
    'dependency-review.yml',
  )
  const codeql = await readProjectFile('.github', 'workflows', 'codeql.yml')

  assert.match(dependabot, /package-ecosystem: npm/)
  assert.match(dependabot, /package-ecosystem: github-actions/)
  assert.match(dependabot, /interval: weekly/g)
  assert.match(dependencyReview, /fail-on-severity: moderate/)
  assert.match(codeql, /security-events: write/)
  assert.match(codeql, /languages: javascript-typescript/)
  assert.match(securityPolicy, /private vulnerability reporting/i)
  assert.doesNotMatch(securityPolicy, /@[a-z0-9.-]+\.[a-z]{2,}/i)
})
