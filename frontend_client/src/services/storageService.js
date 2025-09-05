const storageService = {
  // PUBLIC_INTERFACE
  async readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        try { resolve(JSON.parse(fr.result)); } catch (e) { reject(e); }
      };
      fr.onerror = reject;
      fr.readAsText(file);
    });
  },
  // PUBLIC_INTERFACE
  async readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  },
  // PUBLIC_INTERFACE
  downloadBlob(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export default storageService;
