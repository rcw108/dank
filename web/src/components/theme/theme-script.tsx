// Runs before first paint so a saved light theme never flashes dark.
const script = `try{var t=localStorage.getItem("dank-theme");if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
