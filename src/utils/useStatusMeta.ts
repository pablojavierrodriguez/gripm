import { useTranslation } from './i18n';
import { getStatusMeta } from './statusMeta';

export const useStatusMeta = () => {
  const { t } = useTranslation();
  return (status: string) => getStatusMeta(status, t);
};
