/** @deprecated use utility from extensions/ */
export const isUrlAbsolute = (url: string) => {
  try {
    new URL(url);

    return true;
  } catch (e) {
    return false;
  }
};
