import { FilterAPIProvider } from "../FilterAPIProvider";

export const useDraftOrderFilterAPIProvider = (): FilterAPIProvider => {
  const fetchRightOptions = async () => {
    return [];
  };

  const fetchAttributeOptions = async () => {
    return [];
  };

  return {
    fetchRightOptions,
    fetchAttributeOptions,
  };
};
