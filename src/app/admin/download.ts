export const downloadFile = (name: string, contents: string, type: string) => {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // the click has handed the file to the browser by then
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
