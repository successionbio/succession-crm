import { isDefined, isEmptyObject, pascalCase } from 'twenty-shared/utils';

import { isNull, isObject } from '@sniptt/guards';
import { RESOLVER_METHOD_NAMES } from 'src/engine/api/graphql/workspace-resolver-builder/constants/resolver-method-names';
import { isCompositeFieldMetadataType } from 'src/engine/metadata-modules/field-metadata/utils/is-composite-field-metadata-type.util';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { isMorphOrRelationFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-morph-or-relation-flat-field-metadata.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

type GraphQLFormatInput = {
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  objectIdByNameSingular: Record<string, string>;
  method: string;
};

type GraphQLFormatContext = GraphQLFormatInput & {
  fieldMetadataByNameCache: Map<string, Map<string, FlatFieldMetadata>>;
};

type GraphQLObjectTypeKind =
  | 'connection'
  | 'groupByConnection'
  | 'edge'
  | 'node'
  | 'pageInfo';

export const graphQLFormatResultFromSelectedFields = (
  result: unknown,
  selectedFields: Record<string, object>,
  objectNameSingular: string,
  input: GraphQLFormatInput,
): unknown => {
  const context: GraphQLFormatContext = {
    ...input,
    fieldMetadataByNameCache: new Map(),
  };

  const objectTypeKind = inferObjectTypeKind(context.method);

  return formatValue(
    result,
    selectedFields,
    objectNameSingular,
    objectTypeKind,
    context,
  );
};

const formatValue = (
  value: unknown,
  selectedFields: Record<string, object>,
  objectNameSingular: string,
  objectTypeKind: GraphQLObjectTypeKind,
  context: GraphQLFormatContext,
): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      formatValue(
        item,
        selectedFields,
        objectNameSingular,
        objectTypeKind,
        context,
      ),
    );
  }

  if (isObject(value)) {
    return formatObject(
      value as Record<string, unknown>,
      selectedFields,
      objectNameSingular,
      objectTypeKind,
      context,
    );
  }

  return value;
};

const formatObject = (
  record: Record<string, unknown>,
  selectedFields: Record<string, object>,
  objectNameSingular: string,
  objectTypeKind: GraphQLObjectTypeKind,
  context: GraphQLFormatContext,
): Record<string, unknown> => {
  const formatted: Record<string, unknown> = {};

  for (const [key, subFields] of Object.entries(selectedFields)) {
    if (key === '__typename') {
      formatted.__typename = deriveTypeName(objectNameSingular, objectTypeKind);
      continue;
    }

    if (!isDefined(record[key])) {
      formatted[key] = null;
      continue;
    }

    const value = record[key];

    const hasNestedFields = isDefined(subFields) && !isEmptyObject(subFields);

    if (!hasNestedFields || isNull(value)) {
      formatted[key] = value;
      continue;
    }

    const childObjectTypeKind = CONNECTION_FIELD_TO_OBJECT_TYPE_KIND[key];

    if (isDefined(childObjectTypeKind)) {
      formatted[key] = formatValue(
        value,
        subFields as Record<string, object>,
        objectNameSingular,
        childObjectTypeKind,
        context,
      );
      continue;
    }

    const targetObjectName = findRelationTargetObjectName(
      objectNameSingular,
      key,
      context,
    );

    if (isDefined(targetObjectName)) {
      const childKind: GraphQLObjectTypeKind = Array.isArray(value)
        ? 'connection'
        : 'node';

      formatted[key] = formatValue(
        value,
        subFields as Record<string, object>,
        targetObjectName,
        childKind,
        context,
      );
      continue;
    }

    const fieldMetadata = findFieldMetadataByName(
      objectNameSingular,
      key,
      context,
    );

    if (
      isDefined(fieldMetadata) &&
      isCompositeFieldMetadataType(fieldMetadata.type)
    ) {
      formatted[key] = formatCompositeField(
        value as Record<string, unknown>,
        subFields as Record<string, object>,
        fieldMetadata.type,
      );
      continue;
    }

    formatted[key] = formatValue(
      value,
      subFields as Record<string, object>,
      objectNameSingular,
      objectTypeKind,
      context,
    );
  }

  return formatted;
};

const formatCompositeField = (
  record: Record<string, unknown>,
  selectedFields: Record<string, object>,
  fieldMetadataType: string,
): Record<string, unknown> => {
  const formatted: Record<string, unknown> = {};

  for (const key of Object.keys(selectedFields)) {
    if (key === '__typename') {
      formatted.__typename = pascalCase(fieldMetadataType);
      continue;
    }

    formatted[key] = record[key] ?? null;
  }

  return formatted;
};

const deriveTypeName = (
  objectNameSingular: string,
  objectTypeKind: GraphQLObjectTypeKind,
): string => {
  const pascal = pascalCase(objectNameSingular);

  switch (objectTypeKind) {
    case 'connection':
      return `${pascal}Connection`;
    case 'groupByConnection':
      return `${pascal}GroupByConnection`;
    case 'edge':
      return `${pascal}Edge`;
    case 'node':
      return pascal;
    case 'pageInfo':
      return 'PageInfo';
  }
};

const CONNECTION_METHODS = new Set<string>([
  RESOLVER_METHOD_NAMES.FIND_MANY,
  RESOLVER_METHOD_NAMES.FIND_DUPLICATES,
  RESOLVER_METHOD_NAMES.CREATE_MANY,
  RESOLVER_METHOD_NAMES.UPDATE_MANY,
  RESOLVER_METHOD_NAMES.DELETE_MANY,
  RESOLVER_METHOD_NAMES.DESTROY_MANY,
  RESOLVER_METHOD_NAMES.RESTORE_MANY,
]);

const inferObjectTypeKind = (method: string): GraphQLObjectTypeKind => {
  if (method === RESOLVER_METHOD_NAMES.GROUP_BY) {
    return 'groupByConnection';
  }

  if (CONNECTION_METHODS.has(method)) {
    return 'connection';
  }

  return 'node';
};

const CONNECTION_FIELD_TO_OBJECT_TYPE_KIND: Record<
  string,
  GraphQLObjectTypeKind
> = {
  edges: 'edge',
  node: 'node',
  pageInfo: 'pageInfo',
};

const getOrBuildFieldMetadataByNameMap = (
  objectNameSingular: string,
  context: GraphQLFormatContext,
): Map<string, FlatFieldMetadata> => {
  const cached = context.fieldMetadataByNameCache.get(objectNameSingular);

  if (isDefined(cached)) {
    return cached;
  }

  const map = new Map<string, FlatFieldMetadata>();
  const objectId = context.objectIdByNameSingular[objectNameSingular];

  if (!isDefined(objectId)) {
    context.fieldMetadataByNameCache.set(objectNameSingular, map);

    return map;
  }

  const flatObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
    flatEntityId: objectId,
    flatEntityMaps: context.flatObjectMetadataMaps,
  });

  if (!isDefined(flatObjectMetadata)) {
    context.fieldMetadataByNameCache.set(objectNameSingular, map);

    return map;
  }

  for (const fieldId of flatObjectMetadata.fieldIds) {
    const fieldMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: fieldId,
      flatEntityMaps: context.flatFieldMetadataMaps,
    });

    if (isDefined(fieldMetadata)) {
      map.set(fieldMetadata.name, fieldMetadata);
    }
  }

  context.fieldMetadataByNameCache.set(objectNameSingular, map);

  return map;
};

const findFieldMetadataByName = (
  objectNameSingular: string,
  fieldName: string,
  context: GraphQLFormatContext,
): FlatFieldMetadata | undefined => {
  return getOrBuildFieldMetadataByNameMap(objectNameSingular, context).get(
    fieldName,
  );
};

const findRelationTargetObjectName = (
  objectNameSingular: string,
  fieldName: string,
  context: GraphQLFormatContext,
): string | undefined => {
  const fieldMetadata = findFieldMetadataByName(
    objectNameSingular,
    fieldName,
    context,
  );

  if (
    !isDefined(fieldMetadata) ||
    !isMorphOrRelationFlatFieldMetadata(fieldMetadata)
  ) {
    return undefined;
  }

  const targetObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
    flatEntityId: fieldMetadata.relationTargetObjectMetadataId,
    flatEntityMaps: context.flatObjectMetadataMaps,
  });

  return targetObjectMetadata?.nameSingular;
};
