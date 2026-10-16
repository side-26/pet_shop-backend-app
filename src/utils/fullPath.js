import path from 'path';

export const getFullPath = (folderName, fileName = null) => {
  if (fileName) return path.join(__dirname, '..', folderName, fileName);
  return path.join(__dirname, '..', folderName);
};
