"use strict";
/**
 * @file types.ts
 * @module channel-services/shared
 * @description
 * Shared type definitions used across all three MCP channel servers.
 * Defines the send payload, callback payload, and delivery event shapes.
 *
 * ARCHITECTURE NOTE:
 * All three MCP servers share identical input/output contracts so the
 * CRM client can call any of them interchangeably using the same
 * callTool() invocation shape.
 */
Object.defineProperty(exports, "__esModule", { value: true });
