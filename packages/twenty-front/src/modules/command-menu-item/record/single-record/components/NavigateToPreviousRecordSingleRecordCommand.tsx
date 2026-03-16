import { Command } from '@/command-menu-item/display/components/Command';
import { useSelectedRecordIdOrNull } from '@/command-menu-item/record/single-record/hooks/useSelectedRecordIdOrNull';
import { useContextStoreObjectMetadataItemOrThrow } from '@/context-store/hooks/useContextStoreObjectMetadataItemOrThrow';
import { useRecordShowPagePagination } from '@/object-record/record-show/hooks/useRecordShowPagePagination';

export const NavigateToPreviousRecordSingleRecordCommand = () => {
  const { objectMetadataItem } = useContextStoreObjectMetadataItemOrThrow();

  const recordId = useSelectedRecordIdOrNull();

  const { navigateToPreviousRecord } = useRecordShowPagePagination(
    objectMetadataItem.nameSingular,
    recordId ?? '',
  );

  if (!recordId) {
    return null;
  }

  return <Command onClick={navigateToPreviousRecord} />;
};
