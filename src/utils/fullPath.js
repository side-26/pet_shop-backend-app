const path = require('path');
const getFullPath = (folderName, fileName = null) => {
  if (fileName) return path.join(__dirname, '..', folderName, fileName);
  return path.join(__dirname, '..', folderName);
};
module.exports = getFullPath;
