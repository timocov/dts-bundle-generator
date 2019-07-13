// not supported for now - if variable declarations have different exports - then all aren't exported
const defaultExportedString = 'str', justExportedNumber = 123;
export default defaultExportedString;
export { justExportedNumber };

const exportedString = 'str', nonExportedNum = 123;
export { exportedString };

// fix unused expression error
console.log(nonExportedNum);
