/**
 * @file aiLogger.ts
 * @module lib/aiLogger
 * @description
 * Wrapper utility around fetch that intercepts AI API responses, extracts token usage
 * and latency metrics, and stores logging telemetry in local storage for the dashboard.
 * 
 * JSDOC SECTION: 7
 * Compliant with strict function annotations.
 */

export interface AiLogRecord {
  id: string;
  timestamp: string;
  endpoint: string;
  status: number;
  latencyMs: number;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
}

/**
 * @function trackedAiFetch
 * @description Wrapped fetch client that records latency, response status, and token usage metadata.
 * @param url {string} Target API url
 * @param options {RequestInit} Request configurations
 * @returns {Promise<Response>} API Response
 */
export async function trackedAiFetch(url: string, options?: RequestInit): Promise<Response> {
  const startTime = Date.now();
  let response: Response;
  
  try {
    response = await fetch(url, options);
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    logToLocalStorage(url, options?.method || 'GET', 0, latencyMs, 0, 0, 0);
    throw err;
  }

  const latencyMs = Date.now() - startTime;
  const clone = response.clone();
  try {
    const data = await clone.json();
    const usage = data.usageMetadata;
    const promptTokens = usage?.promptTokens || usage?.promptTokenCount || 0;
    const completionTokens = usage?.completionTokens || usage?.candidatesTokenCount || 0;
    const totalTokens = usage?.totalTokens || usage?.totalTokenCount || (promptTokens + completionTokens) || 0;

    logToLocalStorage(url, options?.method || 'GET', response.status, latencyMs, totalTokens, promptTokens, completionTokens);
  } catch (e) {
    logToLocalStorage(url, options?.method || 'GET', response.status, latencyMs, 0, 0, 0);
  }

  return response;
}

/**
 * @function logToLocalStorage
 * @description Saves logging data and increments usage stats inside browser local storage
 * @param endpoint {string} Clean API endpoint path
 * @param method {string} HTTP request method
 * @param status {number} Response HTTP status code
 * @param latencyMs {number} Total execution duration in milliseconds
 * @param tokensUsed {number} Sum of input and output token counts
 * @param promptTokens {number} Total request input tokens
 * @param completionTokens {number} Total candidate output tokens
 */
function logToLocalStorage(
  endpoint: string,
  method: string,
  status: number,
  latencyMs: number,
  tokensUsed: number,
  promptTokens: number,
  completionTokens: number
) {
  if (typeof window === 'undefined') return;

  try {
    const timestamp = new Date().toISOString();
    const cleanEndpoint = endpoint.replace(/^(https?:\/\/[^\/]+)/, '');

    const newRecord: AiLogRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      endpoint: `${method} ${cleanEndpoint}`,
      status,
      latencyMs,
      tokensUsed,
      promptTokens,
      completionTokens
    };

    const rawLogs = localStorage.getItem('xeno_ai_logs');
    const logs: AiLogRecord[] = rawLogs ? JSON.parse(rawLogs) : [];
    logs.unshift(newRecord);
    if (logs.length > 100) logs.pop();
    localStorage.setItem('xeno_ai_logs', JSON.stringify(logs));

    const currentCallCount = parseInt(localStorage.getItem('xeno_ai_call_count') || '0', 10);
    localStorage.setItem('xeno_ai_call_count', String(currentCallCount + 1));

    const currentTokenTotal = parseInt(localStorage.getItem('xeno_token_total') || '0', 10);
    localStorage.setItem('xeno_token_total', String(currentTokenTotal + tokensUsed));

    const rawTokenLog = localStorage.getItem('xeno_token_log');
    const tokenLog: { timestamp: string; tokens: number }[] = rawTokenLog ? JSON.parse(rawTokenLog) : [];
    tokenLog.push({ timestamp, tokens: tokensUsed });
    if (tokenLog.length > 50) tokenLog.shift();
    localStorage.setItem('xeno_token_log', JSON.stringify(tokenLog));

  } catch (err) {
    console.error('Failed to log AI metrics to localStorage:', err);
  }
}
