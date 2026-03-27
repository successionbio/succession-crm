import { type PageLayoutTab } from '@/page-layout/types/PageLayoutTab';
import { type WidgetType } from '~/generated-metadata/graphql';

export const filterTabsByDeactivatedWidgetTypes = ({
  tabs,
  deactivatedWidgetTypes,
}: {
  tabs: PageLayoutTab[];
  deactivatedWidgetTypes: Set<WidgetType>;
}): PageLayoutTab[] => {
  if (deactivatedWidgetTypes.size === 0) {
    return tabs;
  }

  return tabs
    .map((tab) => ({
      ...tab,
      widgets: tab.widgets.filter(
        (widget) => !deactivatedWidgetTypes.has(widget.type),
      ),
    }))
    .filter((tab) => tab.widgets.length > 0);
};
