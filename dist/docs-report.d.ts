export type DocsReporterType = 'api-extractor';
export interface DocsReport {
    reporter: DocsReporterType;
    errorsCount: number;
    warningsCount: number;
    messages: ReportMessage[];
}
export type MessageCategory = 'compiler' | 'docs' | 'extractor' | 'unknown';
export type MessageLevel = 'error' | 'warning' | 'info' | 'verbose' | 'none';
export interface ReportMessage {
    level: MessageLevel;
    category: MessageCategory;
    messageId: string;
    text: string;
    sourceFilePath?: string;
    sourceFileLine?: number;
    sourceFileColumn?: number;
    context?: string;
}
export declare const generateReport: (docsReport: DocsReporterType, apiConfig: string) => Promise<DocsReport>;
/**
 * Wait for a number of milliseconds.
 *
 * TODO: remove this function
 *
 * @param milliseconds The number of milliseconds to wait.
 * @returns {Promise<string>} Resolves with 'done!' after the wait is over.
 */
export declare function wait(milliseconds: number): Promise<string>;
