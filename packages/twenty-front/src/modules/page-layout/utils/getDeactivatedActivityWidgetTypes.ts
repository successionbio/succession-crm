import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { WidgetType } from '~/generated-metadata/graphql';

const ACTIVITY_WIDGET_TO_TARGET_OBJECT: Partial<
  Record<WidgetType, CoreObjectNameSingular>
> = {
  [WidgetType.NOTES]: CoreObjectNameSingular.NoteTarget,
  [WidgetType.TASKS]: CoreObjectNameSingular.TaskTarget,
};

export const getDeactivatedActivityWidgetTypes = ({
  targetObjectNameSingular,
  objectMetadataItems,
}: {
  targetObjectNameSingular: string;
  objectMetadataItems: EnrichedObjectMetadataItem[];
}): Set<WidgetType> => {
  const deactivatedWidgetTypes = new Set<WidgetType>();

  const targetObjectMetadata = objectMetadataItems.find(
    (item) => item.nameSingular === targetObjectNameSingular,
  );

  if (!isDefined(targetObjectMetadata)) {
    return deactivatedWidgetTypes;
  }

  for (const [widgetType, activityTargetObjectName] of Object.entries(
    ACTIVITY_WIDGET_TO_TARGET_OBJECT,
  )) {
    const activityTargetObjectMetadata = objectMetadataItems.find(
      (item) => item.nameSingular === activityTargetObjectName,
    );

    if (!isDefined(activityTargetObjectMetadata)) {
      continue;
    }

    // Check for a relation field on the activity target object (e.g. NoteTarget)
    // that links to the current target object (e.g. Person).
    // In the legacy model, this is a RELATION field with targetObjectMetadata matching.
    // In the morph model, this is a field named after the target object (e.g. personId).
    const relationFieldToTarget = activityTargetObjectMetadata.fields.find(
      (field) =>
        field.relation?.targetObjectMetadata.id === targetObjectMetadata.id,
    );

    if (isDefined(relationFieldToTarget) && !relationFieldToTarget.isActive) {
      deactivatedWidgetTypes.add(widgetType as WidgetType);
    }
  }

  return deactivatedWidgetTypes;
};
