const ALLOWED_TABLES = ['Customer', 'Order', 'Campaign', 'Communication'];

const ALLOWED_CUSTOMER_FIELDS = [
  'id', 'name', 'email', 'phone', 'totalSpends', 'createdAt', 'updatedAt',
  'orders', 'communications', 'AND', 'OR', 'NOT'
];

const ALLOWED_ORDER_FIELDS = [
  'id', 'customerId', 'amount', 'itemCount', 'category', 'createdAt',
  'AND', 'OR', 'NOT'
];

const ALLOWED_OPERATORS = [
  'gt', 'gte', 'lt', 'lte', 'equals', 'not', 'in', 'notIn',
  'contains', 'startsWith', 'endsWith', 'mode', 'some', 'every', 'none', 'is', 'isNot'
];

/**
 * Validates that a raw SQL query starts with SELECT, executes strictly read-only
 * operations, and only targets whitelisted tables.
 */
export function validateSqlQuery(sql: string): { valid: boolean; error?: string } {
  if (!sql || typeof sql !== 'string') {
    return { valid: false, error: 'SQL query must be a non-empty string.' };
  }

  const normalized = sql.trim().toUpperCase();

  // 1. Must start with SELECT (ignoring leading whitespace and inline comments)
  const cleanSql = sql.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '').trim();
  if (!cleanSql.toUpperCase().startsWith('SELECT')) {
    return { valid: false, error: 'SQL query must be a SELECT statement.' };
  }

  // 2. Reject modifying SQL keywords
  const forbiddenKeywords = [
    'DROP', 'ALTER', 'TRUNCATE', 'UPDATE', 'INSERT', 'DELETE',
    'CREATE', 'REPLACE', 'MERGE', 'GRANT', 'REVOKE', 'RENAME', 'EXECUTE'
  ];

  for (const keyword of forbiddenKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(cleanSql)) {
      return {
        valid: false,
        error: `SQL query contains forbidden modifying keyword: "${keyword}". Only read-only SELECT operations are allowed.`
      };
    }
  }

  // 3. Enforce whitelisted tables ONLY in FROM/JOIN clauses
  const tableRefRegex = /(?:FROM|JOIN)\s+(?:public\.)?([a-zA-Z0-9_"\.]+)/gi;
  let match;
  const tablesFound: string[] = [];

  while ((match = tableRefRegex.exec(cleanSql)) !== null) {
    let tableName = match[1].replace(/["']/g, ''); // strip quotes
    if (tableName.includes('.')) {
      tableName = tableName.split('.')[1]; // get table after schema prefix
    }
    tablesFound.push(tableName);
  }

  for (const table of tablesFound) {
    const isAllowed = ALLOWED_TABLES.some(t => t.toLowerCase() === table.toLowerCase());
    if (!isAllowed) {
      return {
        valid: false,
        error: `SQL query references unauthorized table or relation: "${table}".`
      };
    }
  }

  return { valid: true };
}

/**
 * Validates a Prisma where-clause object to ensure it only queries whitelisted
 * fields, uses whitelisted operators, and contains no SQL/Prisma injection payloads.
 */
export function validatePrismaWhere(where: any): { valid: boolean; error?: string } {
  if (!where || typeof where !== 'object') {
    return { valid: true };
  }

  const keys = Object.keys(where);
  for (const key of keys) {
    // Check if key is a whitelisted customer field
    if (!ALLOWED_CUSTOMER_FIELDS.includes(key)) {
      return { valid: false, error: `Prisma query references unauthorized field: "${key}".` };
    }

    const value = where[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const subKeys = Object.keys(value);
      for (const subKey of subKeys) {
        if (key === 'orders') {
          // If referencing the "orders" relation, ensure the operator is whitelisted
          if (!['some', 'every', 'none'].includes(subKey)) {
            return { valid: false, error: `Prisma relation operator "${subKey}" is not allowed for "orders".` };
          }
          
          const nestedResult = validatePrismaOrderWhere(value[subKey]);
          if (!nestedResult.valid) {
            return nestedResult;
          }
        } else if (ALLOWED_OPERATORS.includes(subKey)) {
          // Regular filter operator (e.g. gt, lte)
          const opVal = value[subKey];
          if (typeof opVal === 'string') {
            const normalizedOp = opVal.toUpperCase();
            if (normalizedOp.includes('DROP') || normalizedOp.includes('DELETE') || normalizedOp.includes('TRUNCATE')) {
              return { valid: false, error: 'Malicious payload detected in query value filter.' };
            }
          }
        } else {
          return { valid: false, error: `Prisma operator "${subKey}" is not whitelisted.` };
        }
      }
    } else if (Array.isArray(value)) {
      // Handles logical operators: AND, OR, NOT
      for (const item of value) {
        const itemResult = validatePrismaWhere(item);
        if (!itemResult.valid) {
          return itemResult;
        }
      }
    } else if (typeof value === 'string') {
      const normalizedVal = value.toUpperCase();
      if (normalizedVal.includes('DROP') || normalizedVal.includes('DELETE') || normalizedVal.includes('TRUNCATE')) {
        return { valid: false, error: 'Malicious payload detected in query value filter.' };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates nested Order filters in Prisma queries.
 */
function validatePrismaOrderWhere(where: any): { valid: boolean; error?: string } {
  if (!where || typeof where !== 'object') {
    return { valid: true };
  }

  const keys = Object.keys(where);
  for (const key of keys) {
    if (!ALLOWED_ORDER_FIELDS.includes(key)) {
      return { valid: false, error: `Prisma order query references unauthorized field: "${key}".` };
    }

    const value = where[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const subKeys = Object.keys(value);
      for (const subKey of subKeys) {
        if (!ALLOWED_OPERATORS.includes(subKey)) {
          return { valid: false, error: `Prisma operator "${subKey}" is not whitelisted for Order filters.` };
        }
      }
    }
  }

  return { valid: true };
}
