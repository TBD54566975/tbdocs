export declare interface DocsReport {
    reporter: DocsReporterType;
    errorsCount: number;
    warningsCount: number;
    messages: ReportMessage[];
}

export declare type DocsReporterType = 'api-extractor';

export declare const generateReport: (docsReport: DocsReporterType, apiConfig: string) => Promise<DocsReport>;

export declare type MessageCategory = 'compiler' | 'docs' | 'extractor' | 'unknown';

export declare type MessageLevel = 'error' | 'warning' | 'info' | 'verbose' | 'none';

export declare interface ReportMessage {
    level: MessageLevel;
    category: MessageCategory;
    messageId: string;
    text: string;
    sourceFilePath?: string;
    sourceFileLine?: number;
    sourceFileColumn?: number;
    context?: string;
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export declare function run(): Promise<void>;

/**
 * Wait for a number of milliseconds.
 *
 * TODO: remove this function
 *
 * @param milliseconds The number of milliseconds to wait.
 * @returns {Promise<string>} Resolves with 'done!' after the wait is over.
 */
export declare function wait(milliseconds: number): Promise<string>;

export { }
