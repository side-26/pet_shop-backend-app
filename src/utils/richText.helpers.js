export const parseRichTextFormValue = (value) => {
  if (
    typeof value !== 'string' ||
    (!value.trim().startsWith('{') && !value.trim().startsWith('['))
  ) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
