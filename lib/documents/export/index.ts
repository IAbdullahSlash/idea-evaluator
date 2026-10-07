import type { DocumentSpec } from '@/lib/documents/template'
import { downloadBlob } from '@/lib/handoff'
import { toModel } from '@/lib/documents/export/model'

/**
 * Download a document as a PDF or a Word file. Both are built in the browser
 * from the same model; each writer and its library load only when needed.
 */

export type ExportFormat = 'pdf' | 'docx'

export async function downloadDocument(spec: DocumentSpec, format: ExportFormat, basename: string): Promise<void> {
  const model = toModel(spec)
  const blob =
    format === 'pdf'
      ? await (await import('@/lib/documents/export/pdf')).renderPdf(model)
      : await (await import('@/lib/documents/export/docx')).renderDocx(model)
  downloadBlob(`${basename}.${format}`, blob)
}
