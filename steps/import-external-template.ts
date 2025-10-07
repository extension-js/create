//  ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
// ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
// ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
// ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
// ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
//  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝

import * as path from 'path'
import {fileURLToPath} from 'url'
import * as fs from 'fs/promises'
import * as os from 'os'
import axios from 'axios'
import AdmZip from 'adm-zip'
import goGitIt from 'go-git-it'
import * as messages from '../lib/messages'
import * as utils from '../lib/utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function importExternalTemplate(
  projectPath: string,
  projectName: string,
  template: string
) {
  const installationPath = path.dirname(projectPath)
  const templateName = path.basename(template)
  const examplesUrl =
    'https://github.com/extension-js/examples/tree/main/examples'
  const templateUrl = `${examplesUrl}/${template}`

  try {
    // Ensure the project path exists
    await fs.mkdir(projectPath, {recursive: true})

    if (process.env.EXTENSION_ENV === 'development') {
      console.log(messages.installingFromTemplate(projectName, template))

      const localTemplatePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'examples',
        templateName
      )

      // Copy directly to project path to avoid nested directories
      await utils.copyDirectoryWithSymlinks(localTemplatePath, projectPath)
    } else {
      // Create a temporary directory for fetching remote templates
      const tempRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), 'extension-js-create-')
      )
      const tempPath = path.join(tempRoot, projectName + '-temp')
      await fs.mkdir(tempPath, {recursive: true})

      const isHttp = /^https?:\/\//i.test(template)
      const isGithub = /^https?:\/\/github.com\//i.test(template)

      // Helper to suppress noisy go-git-it output (progress bars, version banner, rate limit notes)
      async function withFilteredOutput<T>(fn: () => Promise<T>) {
        const originalStdoutWrite = process.stdout.write.bind(process.stdout)
        const originalStderrWrite = process.stderr.write.bind(process.stderr)

        // Heuristics to hide only the two specified noisy lines
        const shouldFilter = (chunk: unknown): boolean => {
          const s =
            typeof chunk === 'string'
              ? chunk
              : ((chunk as any)?.toString?.() ?? '')
          if (!s) return false
          return (
            /Using git version/i.test(s) ||
            /GitHub API rate limit reached, continuing without connectivity check/i.test(
              s
            )
          )
        }

        process.stdout.write = (chunk: any, ...args: any[]) => {
          if (shouldFilter(chunk)) return true
          return originalStdoutWrite(chunk, ...args)
        }
        process.stderr.write = (chunk: any, ...args: any[]) => {
          if (shouldFilter(chunk)) return true
          return originalStderrWrite(chunk, ...args)
        }

        try {
          return await fn()
        } finally {
          // Restore
          process.stdout.write = originalStdoutWrite
          process.stderr.write = originalStderrWrite
        }
      }

      if (isGithub) {
        await withFilteredOutput(() =>
          goGitIt(
            template,
            tempPath,
            messages.installingFromTemplate(projectName, templateName)
          )
        )
        // If a subfolder exists matching the last path segment, use it; otherwise copy from tempPath
        const candidates = await fs.readdir(tempPath, {withFileTypes: true})
        const preferred = candidates.find(
          (d) => d.isDirectory() && d.name === templateName
        )
        const srcPath = preferred ? path.join(tempPath, templateName) : tempPath
        await utils.moveDirectoryContents(srcPath, projectPath)
      } else if (isHttp) {
        // Download zip and extract
        const {data, headers} = await axios.get(template, {
          responseType: 'arraybuffer',
          maxRedirects: 5
        })
        const contentType = String(headers?.['content-type'] || '')
        const looksZip =
          /zip|octet-stream/i.test(contentType) ||
          template.toLowerCase().endsWith('.zip')
        if (!looksZip) {
          throw new Error(
            `Remote template does not appear to be a ZIP archive: ${template}`
          )
        }
        const zip = new AdmZip(Buffer.from(data))
        zip.extractAllTo(tempPath, true)
        await utils.moveDirectoryContents(tempPath, projectPath)
      } else {
        // Default: built-in examples repo path
        await withFilteredOutput(() =>
          goGitIt(
            templateUrl,
            tempPath,
            messages.installingFromTemplate(projectName, templateName)
          )
        )
        const srcPath = path.join(tempPath, templateName)
        await utils.moveDirectoryContents(srcPath, projectPath)
      }

      // Cleanup temp
      await fs.rm(tempRoot, {recursive: true, force: true})
    }
  } catch (error: any) {
    console.error(
      messages.installingFromTemplateError(projectName, templateName, error)
    )
    throw error
  }
}
