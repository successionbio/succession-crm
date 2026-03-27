import { isObject } from '@sniptt/guards';
import camelCase from 'lodash.camelcase';
import { AggregateOperations } from 'twenty-shared/types';

import { STANDARD_ERROR_MESSAGE } from 'src/engine/api/common/common-query-runners/errors/standard-error-message.constant';
import {
  GraphqlDirectExecutionException,
  GraphqlDirectExecutionExceptionCode,
} from 'src/engine/api/graphql/direct-execution/errors/graphql-direct-execution.exception';
import { RESOLVER_METHOD_NAMES } from 'src/engine/api/graphql/workspace-resolver-builder/constants/resolver-method-names';

const CONNECTION_ALLOWED_KEYS = new Set([
  'edges',
  'pageInfo',
  'totalCount',
  '__typename',
]);

const GROUP_BY_CONNECTION_ALLOWED_KEYS = new Set([
  'edges',
  'pageInfo',
  'totalCount',
  'groupByDimensionValues',
  '__typename',
]);

const EDGES_ALLOWED_KEYS = new Set(['node', 'cursor', '__typename']);

const PAGE_INFO_ALLOWED_KEYS = new Set([
  'hasNextPage',
  'hasPreviousPage',
  'startCursor',
  'endCursor',
  '__typename',
]);

// COUNT maps to totalCount which is already in CONNECTION_ALLOWED_KEYS
const AGGREGATE_PREFIXES = Object.values(AggregateOperations)
  .filter((operation) => operation !== AggregateOperations.COUNT)
  .map((operation) => camelCase(operation));

const CONNECTION_METHODS = new Set<string>([
  RESOLVER_METHOD_NAMES.FIND_MANY,
  RESOLVER_METHOD_NAMES.FIND_DUPLICATES,
  RESOLVER_METHOD_NAMES.CREATE_MANY,
  RESOLVER_METHOD_NAMES.UPDATE_MANY,
  RESOLVER_METHOD_NAMES.DELETE_MANY,
  RESOLVER_METHOD_NAMES.DESTROY_MANY,
  RESOLVER_METHOD_NAMES.RESTORE_MANY,
]);

const isAggregateField = (key: string): boolean =>
  AGGREGATE_PREFIXES.some((prefix) => key.startsWith(prefix));

const assertAllowedKeys = (
  obj: Record<string, unknown>,
  allowed: Set<string>,
  context: string,
  additionalCheck?: (key: string) => boolean,
): void => {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key) && !additionalCheck?.(key)) {
      throw new GraphqlDirectExecutionException(
        `Field not allowed in ${context}: "${key}"`,
        GraphqlDirectExecutionExceptionCode.INVALID_QUERY_INPUT,
        { userFriendlyMessage: STANDARD_ERROR_MESSAGE },
      );
    }
  }
};

const assertEdgesAndPageInfo = (
  selectedFields: Record<string, unknown>,
): void => {
  if (isObject(selectedFields.edges)) {
    assertAllowedKeys(
      selectedFields.edges as Record<string, unknown>,
      EDGES_ALLOWED_KEYS,
      'edges',
    );
  }

  if (isObject(selectedFields.pageInfo)) {
    assertAllowedKeys(
      selectedFields.pageInfo as Record<string, unknown>,
      PAGE_INFO_ALLOWED_KEYS,
      'pageInfo',
    );
  }
};

export const assertGraphqlSelectedFields = ({
  selectedFields,
  method,
}: {
  selectedFields: Record<string, unknown>;
  method: string;
}): void => {
  if (CONNECTION_METHODS.has(method)) {
    assertAllowedKeys(
      selectedFields,
      CONNECTION_ALLOWED_KEYS,
      'connection',
      isAggregateField,
    );
    assertEdgesAndPageInfo(selectedFields);

    return;
  }

  if (method === RESOLVER_METHOD_NAMES.GROUP_BY) {
    assertAllowedKeys(
      selectedFields,
      GROUP_BY_CONNECTION_ALLOWED_KEYS,
      'group by connection',
      isAggregateField,
    );
    assertEdgesAndPageInfo(selectedFields);

    return;
  }
};
