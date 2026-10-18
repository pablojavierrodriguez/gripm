import React from 'react';
import { Sliders } from 'lucide-react';
import { ItemSidebarStatusType, ItemSidebarStatusTypeProps } from './ItemSidebarStatusType';
import { ItemSidebarSchedule, ItemSidebarScheduleProps } from './ItemSidebarSchedule';
import { ItemSidebarAttributes, ItemSidebarAttributesProps } from './ItemSidebarAttributes';

export interface ItemSidebarMetadataProps {
  statusTypeProps: ItemSidebarStatusTypeProps;
  scheduleProps: ItemSidebarScheduleProps;
  attributesProps: ItemSidebarAttributesProps;
  t: (key: any, params?: any) => string;
}

export const ItemSidebarMetadata: React.FC<ItemSidebarMetadataProps> = ({
  statusTypeProps,
  scheduleProps,
  attributesProps,
  t,
}) => {
  return (
    <div className="lg:col-span-4 space-y-3">
      <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] p-3 sm:p-3.5 space-y-2.5 bg-slate-50 dark:bg-slate-900/40">
        <div className="flex items-center pb-1.5 border-b border-slate-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t('itemModal.sidebarTitle')}
            </span>
          </div>
        </div>

        <ItemSidebarStatusType {...statusTypeProps} />
        <ItemSidebarSchedule {...scheduleProps} />
        <ItemSidebarAttributes {...attributesProps} />
      </div>
    </div>
  );
};
